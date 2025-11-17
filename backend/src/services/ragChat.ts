import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { Language } from '../types';

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RAGResponse {
  response: string;
  sources: Array<{
    title: string;
    chunk_index: number;
    snippet: string;
  }>;
  error: string | null;
}

interface PythonResponse {
  status: 'success' | 'error';
  message?: string;
  data?: RAGResponse;
}

interface PendingRequest {
  resolve: (value: PythonResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class RAGChatService {
  private provider: string;
  private careersJsonPath: string;
  private chromaPersistDir: string;
  private pythonProcess: ChildProcess | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private pendingRequests: PendingRequest[] = [];
  private outputBuffer: string = '';

  constructor(provider: string = 'google') {
    this.provider = provider;
    
    // Set paths relative to backend directory
    const backendDir = path.resolve(__dirname, '../..');
    this.careersJsonPath = path.join(backendDir, 'careers_cleaned.json');
    this.chromaPersistDir = path.join(backendDir, 'chroma_data_multilingual');
  }

  /**
   * Get the Python executable path
   * On macOS/Linux, Python 3 is typically 'python3'
   * Can be overridden with PYTHON_EXECUTABLE env variable
   * Checks for venv first, then falls back to system python3
   */
  private getPythonExecutable(): string {
    // Check for environment variable first
    if (process.env.PYTHON_EXECUTABLE) {
      return process.env.PYTHON_EXECUTABLE;
    }
    
    // Check if venv exists in backend directory
    const backendDir = path.resolve(__dirname, '../..');
    const venvPython = process.platform === 'win32' 
      ? path.join(backendDir, 'venv', 'Scripts', 'python.exe')
      : path.join(backendDir, 'venv', 'bin', 'python3');
    
    if (fs.existsSync(venvPython)) {
      return venvPython;
    }
    
    // Default to python3 (common on macOS/Linux)
    // Falls back to python on Windows or if python3 not available
    return process.platform === 'win32' ? 'python' : 'python3';
  }

  /**
   * Process a complete JSON response line
   */
  private processResponseLine(line: string): void {
    try {
      const response: PythonResponse = JSON.parse(line);
      
      // Get the next pending request (FIFO)
      const pending = this.pendingRequests.shift();
      
      if (pending) {
        clearTimeout(pending.timeout);
        
        if (response.status === 'error') {
          pending.reject(new Error(response.message || 'Unknown error'));
        } else {
          pending.resolve(response);
        }
      } else {
        console.warn('[RAG] Received response with no pending request');
      }
    } catch (error) {
      console.error('[RAG] Failed to parse response:', line, error);
    }
  }

  /**
   * Initialize the Python process (only once)
   * Can be called externally to preload the service
   */
  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized && this.pythonProcess) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start new initialization
    this.initializationPromise = new Promise(async (resolve, reject) => {
      try {
        const pythonScriptPath = path.join(__dirname, 'rag_service.py');
        const backendDir = path.resolve(__dirname, '../..');
        const pythonExecutable = this.getPythonExecutable();

        console.log(`[RAG] Starting persistent Python process: ${pythonExecutable}`);

        // CRITICAL: Set UTF-8 encoding in environment variables
        this.pythonProcess = spawn(pythonExecutable, [pythonScriptPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: backendDir,
          env: {
            ...process.env,
            PYTHONIOENCODING: 'utf-8',  // Force UTF-8 for Python I/O
            PYTHONUTF8: '1',             // Enable UTF-8 mode for Python 3.7+
            LANG: 'en_US.UTF-8',         // Set locale to UTF-8
            LC_ALL: 'en_US.UTF-8'        // Override all locale settings
          }
        });

        // Handle stdout - parse JSON responses line by line
        // CRITICAL: Explicitly set encoding to utf-8
        this.pythonProcess.stdout?.setEncoding('utf-8');
        this.pythonProcess.stdout?.on('data', (data: string) => {
          this.outputBuffer += data;
          
          // Process complete lines
          const lines = this.outputBuffer.split('\n');
          this.outputBuffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
              this.processResponseLine(trimmed);
            }
          }
        });

        // Handle stderr - log errors
        // CRITICAL: Explicitly set encoding to utf-8
        this.pythonProcess.stderr?.setEncoding('utf-8');
        this.pythonProcess.stderr?.on('data', (data: string) => {
          const msg = data.trim();
          // Filter out routine messages
          if (!msg.includes('redirects.py') && 
              !msg.includes('Started and waiting')) {
            // Log important messages (like Chroma DB loading, model downloads)
            if (msg.includes('Chroma') || msg.includes('Loading') || msg.includes('model') || 
                msg.includes('embedding') || msg.includes('Error') || msg.includes('Warning')) {
              console.log(`[RAG]: ${msg}`);
            } else if (msg.length > 0) {
              // Log other non-empty messages
              console.log(`[RAG]: ${msg}`);
            }
          }
        });

        // Handle process exit
        this.pythonProcess.on('close', (code: number | null) => {
          console.log(`[RAG] Python process exited with code: ${code}`);
          this.isInitialized = false;
          this.pythonProcess = null;
          this.initializationPromise = null;
          
          // Reject all pending requests
          while (this.pendingRequests.length > 0) {
            const pending = this.pendingRequests.shift()!;
            clearTimeout(pending.timeout);
            pending.reject(new Error('Python process terminated unexpectedly'));
          }
        });

        this.pythonProcess.on('error', (error: Error) => {
          console.error('[RAG] Python process error:', error);
          this.isInitialized = false;
          this.initializationPromise = null;
          reject(error);
        });

        // Send initialization command
        const initCommand = {
          command: 'initialize',
          careers_json_path: this.careersJsonPath,
          chroma_persist_dir: this.chromaPersistDir,
          provider: this.provider,
        };

        const initPromise = new Promise<void>((resolveInit, rejectInit) => {
          // Increased timeout to 180s (3 minutes) to allow for Chroma DB loading and embedding model download
          const timeout = setTimeout(() => {
            rejectInit(new Error('Initialization timeout (180s). The RAG service may still be loading. Please try again in a moment.'));
          }, 180000);

          this.pendingRequests.push({
            resolve: (response: PythonResponse) => {
              clearTimeout(timeout);
              if (response.status === 'success') {
                this.isInitialized = true;
                console.log('[RAG] Service initialized successfully');
                resolveInit();
              } else {
                rejectInit(new Error(response.message || 'Initialization failed'));
              }
            },
            reject: (error: Error) => {
              clearTimeout(timeout);
              rejectInit(error);
            },
            timeout
          });
        });

        console.log('[RAG] Sending initialization command...');
        // CRITICAL: Write with explicit UTF-8 encoding
        this.pythonProcess.stdin?.write(JSON.stringify(initCommand) + '\n', 'utf-8');

        // Wait for initialization to complete
        console.log('[RAG] Waiting for Python service to initialize (this may take 1-3 minutes on first run)...');
        await initPromise;
        console.log('[RAG] Initialization complete!');
        resolve();

      } catch (error: any) {
        this.initializationPromise = null;
        reject(new Error(`Failed to initialize RAG service: ${error.message}`));
      }
    });

    return this.initializationPromise;
  }

  /**
   * Send a command to the Python process
   */
  private async sendCommand(command: any): Promise<PythonResponse> {
    // Ensure initialized
    await this.initialize();

    if (!this.pythonProcess || !this.isInitialized) {
      throw new Error('RAG service not initialized');
    }

    return new Promise((resolve, reject) => {
      // Set timeout for this request
      const timeout = setTimeout(() => {
        // Remove from pending requests
        const index = this.pendingRequests.findIndex(req => req.timeout === timeout);
        if (index !== -1) {
          this.pendingRequests.splice(index, 1);
        }
        reject(new Error('Request timeout (30s)'));
      }, 30000);

      this.pendingRequests.push({
        resolve,
        reject,
        timeout
      });

      // Send command with explicit UTF-8 encoding
      try {
        // Serialize with proper Unicode handling (no ASCII escaping)
        const jsonString = JSON.stringify(command);
        this.pythonProcess!.stdin?.write(jsonString + '\n', 'utf-8');
      } catch (error: any) {
        clearTimeout(timeout);
        const index = this.pendingRequests.findIndex(req => req.timeout === timeout);
        if (index !== -1) {
          this.pendingRequests.splice(index, 1);
        }
        reject(new Error(`Failed to send command: ${error.message}`));
      }
    });
  }

  /**
   * Send a chat message and get a response
   * Handles full UTF-8 flow: Hindi input → processing → Hindi output
   */
  async chat(message: string, chatHistory: ChatHistoryMessage[] = [], language: Language = 'en'): Promise<string> {
    // Verify message is properly encoded (defensive check)
    if (typeof message !== 'string') {
      throw new Error('Message must be a string');
    }

    // Ensure chat history entries are properly formatted
    const sanitizedHistory = chatHistory.map(msg => ({
      role: msg.role,
      content: String(msg.content) // Ensure content is string
    }));

    const response = await this.sendCommand({
      command: 'chat',
      message: message,
      chat_history: sanitizedHistory,
      language: language,
    });

    if (response.data && response.data.response) {
      // Response should already be in the specified language
      return response.data.response;
    }
    console.log(response.data?.response);
    throw new Error('Invalid chat response from RAG service');
  }

  /**
   * Generate an initial greeting based on assessment results
   */
  async generateInitialGreeting(
    assessmentSummary: string,
    language: Language = 'en'
  ): Promise<{ reply: string; timestamp: Date }> {
    const response = await this.sendCommand({
      command: 'greeting',
      assessment_summary: assessmentSummary,
      language: language,
    });

    if (response.data && response.data.response) {
      return {
        reply: response.data.response,
        timestamp: new Date(),
      };
    }
    
    throw new Error('Invalid greeting response from RAG service');
  }

  /**
   * Gracefully shutdown the Python process
   */
  async shutdown(): Promise<void> {
    if (this.pythonProcess) {
      console.log('[RAG] Shutting down Python process...');
      this.pythonProcess.kill('SIGTERM');
      this.pythonProcess = null;
      this.isInitialized = false;
      this.initializationPromise = null;
      
      // Clear all pending requests
      while (this.pendingRequests.length > 0) {
        const pending = this.pendingRequests.shift()!;
        clearTimeout(pending.timeout);
        pending.reject(new Error('Service shutting down'));
      }
    }
  }
}

// Create a singleton instance that persists across requests
let ragServiceInstance: RAGChatService | null = null;

/**
 * Get or create the singleton RAG service instance
 */
export function getRAGChatService(provider: string = 'google'): RAGChatService {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGChatService(provider);
    
    // Cleanup on process exit
    process.on('SIGINT', async () => {
      if (ragServiceInstance) {
        await ragServiceInstance.shutdown();
      }
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      if (ragServiceInstance) {
        await ragServiceInstance.shutdown();
      }
      process.exit(0);
    });
  }
  
  return ragServiceInstance;
}

// import { spawn, ChildProcess } from 'child_process';
// import path from 'path';
// import fs from 'fs';
// import type { Language } from '../types';

// interface ChatHistoryMessage {
//   role: 'user' | 'assistant';
//   content: string;
// }

// interface RAGResponse {
//   response: string;
//   sources: Array<{
//     title: string;
//     chunk_index: number;
//     snippet: string;
//   }>;
//   error: string | null;
// }

// interface PythonResponse {
//   status: 'success' | 'error';
//   message?: string;
//   data?: RAGResponse;
// }

// interface PendingRequest {
//   resolve: (value: PythonResponse) => void;
//   reject: (error: Error) => void;
//   timeout: NodeJS.Timeout;
// }

// export class RAGChatService {
//   private provider: string;
//   private careersJsonPath: string;
//   private chromaPersistDir: string;
//   private pythonProcess: ChildProcess | null = null;
//   private isInitialized: boolean = false;
//   private initializationPromise: Promise<void> | null = null;
//   private pendingRequests: PendingRequest[] = [];
//   private outputBuffer: string = '';

//   constructor(provider: string = 'google') {
//     this.provider = provider;
    
//     // Set paths relative to backend directory
//     const backendDir = path.resolve(__dirname, '../..');
//     this.careersJsonPath = path.join(backendDir, 'careers_cleaned.json');
//     this.chromaPersistDir = path.join(backendDir, 'chroma_data_full');
//   }

//   /**
//    * Get the Python executable path
//    */
//   private getPythonExecutable(): string {
//     return 'python';
//   }

//   /**
//    * Process a complete JSON response line
//    */
//   private processResponseLine(line: string): void {
//     try {
//       const response: PythonResponse = JSON.parse(line);
      
//       // Get the next pending request (FIFO)
//       const pending = this.pendingRequests.shift();
      
//       if (pending) {
//         clearTimeout(pending.timeout);
        
//         if (response.status === 'error') {
//           pending.reject(new Error(response.message || 'Unknown error'));
//         } else {
//           pending.resolve(response);
//         }
//       } else {
//         console.warn('[RAG] Received response with no pending request');
//       }
//     } catch (error) {
//       console.error('[RAG] Failed to parse response:', line, error);
//     }
//   }

//   /**
//    * Initialize the Python process (only once)
//    * Can be called externally to preload the service
//    */
//   async initialize(): Promise<void> {
//     // If already initialized, return immediately
//     if (this.isInitialized && this.pythonProcess) {
//       return;
//     }

//     // If initialization is in progress, wait for it
//     if (this.initializationPromise) {
//       return this.initializationPromise;
//     }

//     // Start new initialization
//     this.initializationPromise = new Promise(async (resolve, reject) => {
//       try {
//         const pythonScriptPath = path.join(__dirname, 'rag_service.py');
//         const backendDir = path.resolve(__dirname, '../..');
//         const pythonExecutable = this.getPythonExecutable();

//         console.log(`[RAG] Starting persistent Python process: ${pythonExecutable}`);

//         this.pythonProcess = spawn(pythonExecutable, [pythonScriptPath], {
//           stdio: ['pipe', 'pipe', 'pipe'],
//           cwd: backendDir,
//         });

//         // Handle stdout - parse JSON responses line by line
//         this.pythonProcess.stdout?.on('data', (data: Buffer) => {
//           this.outputBuffer += data.toString();
          
//           // Process complete lines
//           const lines = this.outputBuffer.split('\n');
//           this.outputBuffer = lines.pop() || ''; // Keep incomplete line in buffer
          
//           for (const line of lines) {
//             const trimmed = line.trim();
//             if (trimmed) {
//               this.processResponseLine(trimmed);
//             }
//           }
//         });

//         // Handle stderr - log errors
//         this.pythonProcess.stderr?.on('data', (data: Buffer) => {
//           const msg = data.toString().trim();
//           // Filter out routine messages
//           if (!msg.includes('redirects.py') && 
//               !msg.includes('Loaded .env') &&
//               !msg.includes('Started and waiting')) {
//             console.error(`[RAG]: ${msg}`);
//           }
//         });

//         // Handle process exit
//         this.pythonProcess.on('close', (code: number | null) => {
//           console.log(`[RAG] Python process exited with code: ${code}`);
//           this.isInitialized = false;
//           this.pythonProcess = null;
//           this.initializationPromise = null;
          
//           // Reject all pending requests
//           while (this.pendingRequests.length > 0) {
//             const pending = this.pendingRequests.shift()!;
//             clearTimeout(pending.timeout);
//             pending.reject(new Error('Python process terminated unexpectedly'));
//           }
//         });

//         this.pythonProcess.on('error', (error: Error) => {
//           console.error('[RAG] Python process error:', error);
//           this.isInitialized = false;
//           this.initializationPromise = null;
//           reject(error);
//         });

//         // Send initialization command
//         const initCommand = {
//           command: 'initialize',
//           careers_json_path: this.careersJsonPath,
//           chroma_persist_dir: this.chromaPersistDir,
//           provider: this.provider,
//         };

//         const initPromise = new Promise<void>((resolveInit, rejectInit) => {
//           const timeout = setTimeout(() => {
//             rejectInit(new Error('Initialization timeout (60s)'));
//           }, 60000);

//           this.pendingRequests.push({
//             resolve: (response: PythonResponse) => {
//               clearTimeout(timeout);
//               if (response.status === 'success') {
//                 this.isInitialized = true;
//                 console.log('[RAG] Service initialized successfully');
//                 resolveInit();
//               } else {
//                 rejectInit(new Error(response.message || 'Initialization failed'));
//               }
//             },
//             reject: (error: Error) => {
//               clearTimeout(timeout);
//               rejectInit(error);
//             },
//             timeout
//           });
//         });

//         this.pythonProcess.stdin?.write(JSON.stringify(initCommand) + '\n');

//         // Wait for initialization to complete
//         await initPromise;
//         resolve();

//       } catch (error: any) {
//         this.initializationPromise = null;
//         reject(new Error(`Failed to initialize RAG service: ${error.message}`));
//       }
//     });

//     return this.initializationPromise;
//   }

//   /**
//    * Send a command to the Python process
//    */
//   private async sendCommand(command: any): Promise<PythonResponse> {
//     // Ensure initialized
//     await this.initialize();

//     if (!this.pythonProcess || !this.isInitialized) {
//       throw new Error('RAG service not initialized');
//     }

//     return new Promise((resolve, reject) => {
//       // Set timeout for this request
//       const timeout = setTimeout(() => {
//         // Remove from pending requests
//         const index = this.pendingRequests.findIndex(req => req.timeout === timeout);
//         if (index !== -1) {
//           this.pendingRequests.splice(index, 1);
//         }
//         reject(new Error('Request timeout (30s)'));
//       }, 30000);

//       this.pendingRequests.push({
//         resolve,
//         reject,
//         timeout
//       });

//       // Send command
//       try {
//         this.pythonProcess!.stdin?.write(JSON.stringify(command) + '\n');
//       } catch (error: any) {
//         clearTimeout(timeout);
//         const index = this.pendingRequests.findIndex(req => req.timeout === timeout);
//         if (index !== -1) {
//           this.pendingRequests.splice(index, 1);
//         }
//         reject(new Error(`Failed to send command: ${error.message}`));
//       }
//     });
//   }

//   /**
//    * Send a chat message and get a response
//    */
//   async chat(message: string, chatHistory: ChatHistoryMessage[] = []): Promise<string> {
//     const response = await this.sendCommand({
//       command: 'chat',
//       message: message,
//       chat_history: chatHistory,
//     });

//     if (response.data && response.data.response) {
//       return response.data.response;
//     }
//     console.log(response.data.response);
//     throw new Error('Invalid chat response from RAG service');
//   }

//   /**
//    * Generate an initial greeting based on assessment results
//    */
//   async generateInitialGreeting(
//     assessmentSummary: string,
//     language: Language = 'en'
//   ): Promise<{ reply: string; timestamp: Date }> {
//     const response = await this.sendCommand({
//       command: 'greeting',
//       assessment_summary: assessmentSummary,
//       language: language,
//     });

//     if (response.data && response.data.response) {
//       return {
//         reply: response.data.response,
//         timestamp: new Date(),
//       };
//     }
    
//     throw new Error('Invalid greeting response from RAG service');
//   }

//   /**
//    * Gracefully shutdown the Python process
//    */
//   async shutdown(): Promise<void> {
//     if (this.pythonProcess) {
//       console.log('[RAG] Shutting down Python process...');
//       this.pythonProcess.kill('SIGTERM');
//       this.pythonProcess = null;
//       this.isInitialized = false;
//       this.initializationPromise = null;
      
//       // Clear all pending requests
//       while (this.pendingRequests.length > 0) {
//         const pending = this.pendingRequests.shift()!;
//         clearTimeout(pending.timeout);
//         pending.reject(new Error('Service shutting down'));
//       }
//     }
//   }
// }

// // Create a singleton instance that persists across requests
// let ragServiceInstance: RAGChatService | null = null;

// /**
//  * Get or create the singleton RAG service instance
//  */
// export function getRAGChatService(provider: string = 'google'): RAGChatService {
//   if (!ragServiceInstance) {
//     ragServiceInstance = new RAGChatService(provider);
    
//     // Cleanup on process exit
//     process.on('SIGINT', async () => {
//       if (ragServiceInstance) {
//         await ragServiceInstance.shutdown();
//       }
//       process.exit(0);
//     });

//     process.on('SIGTERM', async () => {
//       if (ragServiceInstance) {
//         await ragServiceInstance.shutdown();
//       }
//       process.exit(0);
//     });
//   }
  
//   return ragServiceInstance;
// }


