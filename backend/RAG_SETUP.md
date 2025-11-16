# RAG Chatbot Integration Setup Guide

This guide explains how to set up the RAG (Retrieval-Augmented Generation) chatbot in CareerBuddy.

## Prerequisites

- Python 3.8 or higher
- Node.js 18 or higher
- All CareerBuddy dependencies installed

## Setup Steps

### 1. Install Python Dependencies

From the `backend` directory, create a virtual environment and install packages:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create or update your `.env` file in the `backend` directory with the following:

```env
# RAG Service Configuration
RAG_PROVIDER=google  # Options: 'google' or 'groq'

# Required for Google provider (Gemini)
GOOGLE_API_KEY=your_google_api_key_here

# Required for Groq provider (optional, if using Groq instead)
GROQ_API_KEY=your_groq_api_key_here

# Required for HuggingFace embeddings
HUGGINGFACEHUB_API_TOKEN=your_huggingface_token_here
HF_TOKEN=your_huggingface_token_here
HUGGINGFACE_TOKEN=your_huggingface_token_here

# Existing CareerBuddy configuration
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
```

### 3. Verify Data Files

Ensure these files exist in the `backend` directory:

- `careers_cleaned.json` - Career data for RAG
- `chroma_data_full/` - Pre-built vector database

If these are missing, they will be created on first run, but this will take longer.

### 4. Test Python Service

You can test the Python RAG service independently:

```bash
cd backend
python src/services/rag_service.py
```

Then send a test command (JSON on stdin):

```json
{"command": "initialize", "careers_json_path": "./careers_cleaned.json", "chroma_persist_dir": "./chroma_data_full", "provider": "google"}
{"command": "chat", "message": "What careers are good for someone interested in computers?", "chat_history": []}
```

### 5. Start the Backend

```bash
cd backend
npm run dev
```

The backend will automatically initialize the RAG service when the first chat request is made.

## How It Works

1. **Python RAG Service** (`src/services/rag_service.py`):

   - Loads career data and vector database
   - Handles semantic search using ChromaDB
   - Generates responses using Gemini or Groq LLMs

2. **TypeScript Wrapper** (`src/services/ragChat.ts`):

   - Spawns Python processes for each request
   - Manages communication between Node.js and Python
   - Provides a TypeScript-friendly API

3. **Chat Routes** (`src/routes/chat.ts`):
   - Uses RAG service instead of direct Gemini calls
   - Maintains conversation context
   - Stores messages in database

## Providers

### Google (Gemini)

- **Model**: gemini-2.5-pro
- **Pros**: High quality responses, good multilingual support
- **Cons**: Requires Google API key
- **Setup**: Get API key from https://makersuite.google.com/app/apikey

### Groq

- **Model**: llama-3.3-70b-versatile
- **Pros**: Very fast inference
- **Cons**: May have rate limits on free tier
- **Setup**: Get API key from https://console.groq.com/

## Troubleshooting

### Python process fails to start

- Ensure Python is installed and in PATH
- Check that virtual environment is properly set up
- Verify all dependencies are installed

### "Module not found" errors

- Activate the virtual environment
- Reinstall requirements: `pip install -r requirements.txt`

### API key errors

- Verify environment variables are set correctly
- Check that .env file is in the `backend` directory
- Ensure API keys are valid and have proper permissions

### Slow responses

- First request takes longer as it loads the vector database
- Consider using Groq provider for faster inference
- Ensure chroma_data_full directory exists (avoids rebuild)

### Empty or poor responses

- Check that careers_cleaned.json has valid data
- Verify vector database is properly initialized
- Try increasing the number of retrieved documents (k parameter)

## Development Notes

- The RAG service spawns a new Python process for each request (stateless)
- Vector database is loaded on each Python process start (cached on disk)
- Chat history is maintained in the PostgreSQL database
- Embeddings are generated using local HuggingFace models (no API calls)

## Performance Optimization

For production deployments:

1. Consider running the Python RAG service as a separate microservice
2. Use a persistent Python process with inter-process communication
3. Cache embeddings and frequently accessed career data
4. Implement connection pooling for database queries
