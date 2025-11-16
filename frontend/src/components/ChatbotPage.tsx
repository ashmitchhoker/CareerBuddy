import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Send, Bot, User, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Alert, AlertDescription } from "./ui/alert";
import { LanguageSelector } from "./LanguageSelector";
import { assessmentService } from "../services/assessmentService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import type { Page, UserProfile, Language, AssessmentResults } from "../App";

interface ChatbotPageProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  navigateTo: (page: Page, displayResults?: boolean, assessmentId?: number) => void;
  showResults?: boolean;
  assessmentResults?: AssessmentResults | null;
  assessmentId?: number | null;
}

interface Message {
  id: number | string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const connectionErrorMessages = {
  en: "Connection failed. Unable to process more queries at this time. Please try again in some time.",
  hi: "कनेक्शन विफल। इस समय अधिक प्रश्नों को संसाधित करने में असमर्थ। कृपया कुछ समय बाद पुनः प्रयास करें।",
  te: "కనెక్షన్ విఫలమైంది. ప్రస్తుతం మరిన్ని ప్రశ్నలను ప్రాసెస్ చేయడం సాధ్యంలేదు. దయచేసి కొంతసమయం తర్వాత మళ్లీ ప్రయత్నించండి.",
  ta: "இணைப்பு தோல்வியடைந்தது. தற்போது மேலும் கேள்விகளை செயலாக்க முடியவில்லை. தயவுசெய்து சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.",
  bn: "সংযোগ ব্যর্থ হয়েছে। এই মুহূর্তে আরও প্রশ্ন প্রক্রিয়া করা সম্ভব নয়। অনুগ্রহ করে কিছু সময় পরে আবার চেষ্টা করুন।",
  gu: "કનેક્શન નિષ્ફળ થયું. આ સમયે વધુ પ્રશ્નોની પ્રક્રિયા શક્ય નથી. કૃપા કરીને થોડા સમય પછી ફરી પ્રયાસ કરો.",
};

const fallbackInitialMessages: Record<Language, (name: string) => string> = {
  en: (name) =>
    `Hello ${name}! I'm your career guidance assistant. I'm here to help you explore your personalized recommendations. What would you like to know about first?`,
  hi: (name) =>
    `नमस्ते ${name}! मैं यहां आपके व्यक्तिगत करियर सुझावों पर बात करने के लिए हूं। आप सबसे पहले क्या जानना चाहेंगे?`,
  te: (name) =>
    `హలో ${name}! మీ వ్యక్తిగత కెరీర్ సిఫార్సుల గురించి చర్చించడానికి నేను ఇక్కడ ఉన్నాను. మీరు ముందుగా ఏం తెలుసుకోవాలనుకుంటున్నారు?`,
  ta: (name) =>
    `வணக்கம் ${name}! உங்கள் தனிப்பயன் தொழில் பரிந்துரைகளைப் பற்றி பேச நான் இங்கே இருக்கிறேன். முதலில் நீங்கள் என்ன அறிய விரும்புகிறீர்கள்?`,
  bn: (name) =>
    `হ্যালো ${name}! আপনার ব্যক্তিগত ক্যারিয়ার সুপারিশ নিয়ে আমি এখানে কথা বলতে এসেছি। আপনি প্রথমে কী জানতে চান?`,
  gu: (name) =>
    `નમસ્તે ${name}! તમારી વ્યક્તિગત કારકિર્દી ભલામણો વિશે વાત કરવા હું અહીં છું. તમે સૌપ્રથમ શું જાણવા માંગો છો?`,
};

export function ChatbotPage({
  userProfile,
  setUserProfile,
  navigateTo,
  showResults = false,
  assessmentResults,
  assessmentId,
}: ChatbotPageProps) {
  const assessmentSummaryForChat = useMemo(() => {
    if (!assessmentResults || !showResults) {
      return null;
    }

    const { recommendations, summary } = assessmentResults;
    const topRecommendations = recommendations
      .map(
        (rec, idx) =>
          `${idx + 1}. ${rec.title} (${Math.round(
            rec.confidence * 100
          )}% match) - ${rec.reason}${
            rec.next_steps?.length
              ? `. Next steps: ${rec.next_steps.join(", ")}`
              : ""
          }`
      )
      .join("\n");

    return `Student: ${userProfile.name || "Student"} (Class ${
      userProfile.class
    })\nSummary: ${summary}\nRecommendations:\n${topRecommendations}`;
  }, [assessmentResults, showResults, userProfile.class, userProfile.name]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>(`session_${Date.now()}`);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createLocalInitialMessage = (text?: string): Message => ({
    id: `initial-${Date.now()}-${Math.random()}`,
    text:
      text ||
      fallbackInitialMessages[userProfile.language](userProfile.name || "Student"),
    sender: "bot",
    timestamp: new Date(),
  });

  // Initialize chat session when component mounts or dependencies change
  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
      setIsInitializing(true);
      // CRITICAL: Reset messages when assessmentId changes to prevent showing messages from different assessments
      // This ensures we never show stale messages from previous assessments
      setMessages([]);
      
      // Log for debugging
      if (assessmentId) {
        console.log(`[ChatbotPage] Initializing chat for assessment ID: ${assessmentId}`);
      } else {
        console.log('[ChatbotPage] Initializing general chat (no assessment ID)');
      }
      
      try {
        // If we have results and assessmentId, try to load existing messages first
        // This avoids regenerating messages that already exist and makes "View Results" instant
        // IMPORTANT: Only load messages for THIS specific assessmentId
        if (showResults && assessmentId && assessmentResults) {
          try {
            // Try to get existing chat history first (fast, no AI generation)
            // Pass assessmentId explicitly to ensure we only get messages for this assessment
            const historyResponse = await assessmentService.getChatHistory(assessmentId);
            const historyData = historyResponse.data;
            
            // Check if we have messages in the response (can be array or object with messages property)
            const messagesArray = Array.isArray(historyData) ? historyData : (historyData?.messages || []);
            
            // STRICT FILTERING: Only show messages that belong to THIS assessment
            // This is critical - never show messages from other assessments
            const filteredMessages = messagesArray.filter((msg: any) => {
              // If we have an assessmentId, ONLY include messages that match it
              // Reject any message that doesn't have assessment_id or has a different assessment_id
              if (assessmentId) {
                // Message must have assessment_id AND it must match
                if (msg.assessment_id === undefined || msg.assessment_id === null) {
                  console.warn('Rejecting message without assessment_id when assessmentId is provided:', msg);
                  return false; // Reject messages without assessment_id
                }
                if (msg.assessment_id !== assessmentId) {
                  console.warn(`Rejecting message from different assessment. Expected ${assessmentId}, got ${msg.assessment_id}:`, msg);
                  return false; // Reject messages from different assessments
                }
                return true; // Only accept if assessment_id matches exactly
              }
              // If no assessmentId, only include messages without assessment_id (general chat)
              return msg.assessment_id === null || msg.assessment_id === undefined;
            });
            
            if (filteredMessages.length > 0) {
              const loadedMessages: Message[] = filteredMessages.map((msg: any, index: number) => ({
                id: msg.id || `msg-${Date.now()}-${index}-${Math.random()}`,
                text: msg.message_text || msg.text,
                sender: msg.sender === 'bot' ? 'bot' : 'user',
                timestamp: new Date(msg.created_at || msg.timestamp || Date.now()),
              }));
              if (isMounted) {
                setMessages(loadedMessages);
                setIsInitializing(false);
                return; // Exit early, we have existing messages - instant display!
              }
            }
          } catch (historyError) {
            // If history fetch fails, continue with normal flow
            console.log("Could not load chat history, continuing with normal flow");
          }
        }

        // Normal flow: call startChat API
        const response = await assessmentService.startChat({
          sessionId,
          assessmentId: assessmentId || undefined,
          assessmentSummary: assessmentSummaryForChat || undefined,
          language: userProfile.language,
        });

        const data = response.data;
        
        if (isMounted) {
          // Load existing messages from database
          // CRITICAL: STRICTLY filter by assessmentId to prevent loading messages from different assessments
          if (data.existingMessages && data.existingMessages.length > 0) {
            // STRICT FILTERING: Only show messages that belong to THIS assessment
            const filteredMessages = data.existingMessages.filter((msg: any) => {
              // If we have an assessmentId, ONLY include messages that match it exactly
              if (assessmentId) {
                // Reject messages without assessment_id
                if (msg.assessment_id === undefined || msg.assessment_id === null) {
                  console.warn('Rejecting message without assessment_id when assessmentId is provided:', msg);
                  return false;
                }
                // Reject messages from different assessments
                if (msg.assessment_id !== assessmentId) {
                  console.warn(`Rejecting message from different assessment. Expected ${assessmentId}, got ${msg.assessment_id}:`, msg);
                  return false;
                }
                return true; // Only accept if assessment_id matches exactly
              }
              // If no assessmentId, only include messages without assessment_id (general chat)
              return msg.assessment_id === null || msg.assessment_id === undefined;
            });
            
            const loadedMessages: Message[] = filteredMessages.map((msg: any, index: number) => ({
              id: msg.id || `msg-${Date.now()}-${index}-${Math.random()}`,
              text: msg.text || msg.message_text,
              sender: msg.sender === 'bot' ? 'bot' : 'user',
              timestamp: new Date(msg.timestamp || msg.created_at),
            }));
            setMessages(loadedMessages);
          } else {
            // No existing messages in database response
            // Check if there's an initial message from API, but be cautious:
            // If we have existingMessages from earlier checks, don't show initialMessage from API
            // This prevents showing duplicate initial greetings
            const initialMessageText: string | undefined = data?.initialMessage?.reply;
            
            // IMPORTANT: Only show initialMessage if we truly have no existing messages
            // If we loaded messages from history earlier, don't show initialMessage to prevent duplicates
            if (initialMessageText && messages.length === 0) {
              setMessages([{
                id: `initial-${Date.now()}-${Math.random()}`,
                text: initialMessageText,
                sender: 'bot' as const,
                timestamp: new Date(),
              }]);
            } else if (messages.length === 0) {
              // Only show fallback if we have no messages at all
              setMessages([createLocalInitialMessage()]);
            }
            // If messages.length > 0, we already set them above, so don't overwrite
          }
        }
      } catch (error) {
        console.error("Error initializing chat session:", error);
        if (isMounted) {
          setMessages([createLocalInitialMessage()]);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
    };
  }, [
    sessionId,
    assessmentId,
    assessmentSummaryForChat,
    userProfile.language,
    showResults,
    assessmentResults, // Add this dependency
  ]);

  const handleLanguageChange = (lang: Language) => {
    setUserProfile({ ...userProfile, language: lang });
    setSessionId(`session_${Date.now()}`);
    setMessages([]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLimitReached || isInitializing) return;

    const userMessageText = inputValue.trim();

    const userMessageTimestamp = new Date();
    // Generate unique ID - use timestamp + random to ensure uniqueness
    const newId = Date.now() + Math.random();
    
    setMessages((prev) => [
      ...prev,
      {
        id: newId,
        text: userMessageText,
        sender: "user",
        timestamp: userMessageTimestamp,
      },
    ]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Call backend API
      const response = await assessmentService.sendChatMessage({
        sessionId,
        message: userMessageText,
        language: userProfile.language,
        assessmentId: assessmentId || undefined,
      });

      const data = response.data;

      const botMessageTimestamp = new Date();
      // Generate unique ID - use timestamp + random to ensure uniqueness
      const newId = Date.now() + Math.random();
      
      setMessages((prev) => [
        ...prev,
        {
          id: newId,
          text: data.reply,
          sender: "bot",
          timestamp: botMessageTimestamp,
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);

      // Fallback response
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: connectionErrorMessages[userProfile.language],
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
      setIsLimitReached(true);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteChat = async () => {
    if (!assessmentId) return;
    
    setIsDeleting(true);
    try {
      await assessmentService.deleteChatHistory(assessmentId);
      toast.success('Chat history deleted successfully');
      setMessages([]);
      setSessionId(`session_${Date.now()}`);
      // Reload chat to show initial message
      const response = await assessmentService.startChat({
        sessionId: `session_${Date.now()}`,
        assessmentId: assessmentId,
        assessmentSummary: assessmentSummaryForChat || undefined,
        language: userProfile.language,
      });
      const data = response.data;
      if (data.initialMessage?.reply) {
        setMessages([{
          id: `initial-${Date.now()}-${Math.random()}`,
          text: data.initialMessage.reply,
          sender: 'bot' as const,
          timestamp: new Date(),
        }]);
      } else {
        setMessages([createLocalInitialMessage()]);
      }
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error('Error deleting chat history:', error);
      toast.error('Failed to delete chat history');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // If we have an assessmentId, we came from assessment history, so go back there
                // Otherwise, go to home
                if (assessmentId) {
                  navigateTo("assessment-history");
                } else {
                  navigateTo("home");
                }
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-2 rounded-xl">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-gray-900">Career Guide</h2>
                <p className="text-green-600 text-sm">● Online</p>
              </div>
            </div>
            <LanguageSelector
              language={userProfile.language}
              onLanguageChange={handleLanguageChange}
            />
            {assessmentId && messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Delete chat history"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Delete Chat Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat History</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all messages in this chat? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChat}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {isInitializing && messages.length === 0 && (
            <div className="flex justify-start">
              <Card className="p-4 bg-white shadow animate-pulse max-w-[70%]">
                <p className="text-sm text-gray-600">
                  Preparing your personalized summary...
                </p>
              </Card>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={
                    message.sender === "bot"
                      ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white"
                      : "bg-gray-300"
                  }
                >
                  {message.sender === "bot" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={`flex flex-col max-w-[70%] ${
                  message.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <Card
                  className={`p-3 ${
                    message.sender === "user"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white"
                  }`}
                >
                  <p 
                    className="text-sm whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: (() => {
                        let html = message.text;
                        // Convert markdown bold (**text**) to HTML bold first
                        // Use non-greedy matching to handle multiple bold sections
                        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                        // Convert newlines to <br /> (after bold conversion to avoid breaking tags)
                        html = html.replace(/\n/g, '<br />');
                        return html;
                      })()
                    }}
                  />
                </Card>
                <span className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 flex-row">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col max-w-[70%] items-start">
                <Card className="p-3 bg-white">
                  <div className="flex gap-1 items-center">
                    <span className="text-sm text-gray-600">typing</span>
                    <div className="flex gap-1">
                      <span
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <div className="bg-white border-t sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {isLimitReached && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                ⚠️ {connectionErrorMessages[userProfile.language]}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-3">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isLimitReached
                  ? "Connection failed..."
                  : isInitializing
                  ? "Preparing your personalized recommendations..."
                  : "Type your question here..."
              }
              className="resize-none min-h-[60px]"
              rows={2}
              disabled={isLimitReached || isInitializing}
            />
            <Button
              onClick={handleSendMessage}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shrink-0"
              size="icon"
              disabled={isLimitReached || isInitializing}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          {!isLimitReached && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
