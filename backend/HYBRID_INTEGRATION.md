# Hybrid AI Integration: Gemini + RAG

## Overview
CareerBuddy now uses a **hybrid AI approach** that combines the strengths of two AI services:

1. **Gemini Service** - For personalized career recommendations and post-assessment greetings
2. **RAG Service** - For follow-up career questions using the career database

## Architecture

### Two Chat Entry Points

#### 1. Home Page Chat (General Career Questions)
- **Flow**: User → RAG Service
- **Use Case**: Students asking general career questions without completing an assessment
- **AI Service**: RAG only (semantic search over career database)

#### 2. Assessment Results Chat (Personalized Recommendations)
- **Flow**: User completes assessment → Gemini generates initial greeting → RAG handles follow-ups
- **Use Case**: Students receive personalized career recommendations based on their assessment
- **AI Services**: 
  - **Gemini** for initial greeting (preserves sophisticated recommendation logic)
  - **RAG** for follow-up questions (leverages career database)

## Implementation Details

### Service Initialization (`chat.ts`)

```typescript
// Lazy initialization of both services
let ragService: RAGChatService | null = null;
let geminiService: GeminiService | null = null;

function getRAGService(): RAGChatService {
  if (!ragService) {
    const provider = process.env.RAG_PROVIDER || 'google';
    ragService = new RAGChatService(provider);
  }
  return ragService;
}

function getGeminiService(): GeminiService {
  if (!geminiService) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is required for assessment greetings');
    }
    geminiService = new GeminiService(apiKey);
  }
  return geminiService;
}
```

### POST /api/chat/start - Session Initialization

**Behavior:**
- If `assessmentSummary` is provided (post-assessment flow):
  - Uses **Gemini** to generate initial personalized greeting
  - Gemini analyzes RIASEC scores, matching careers, and assessment data
  - Creates structured, personalized career recommendations
- If no assessment (home page flow):
  - No initial greeting generated
  - First message from user triggers RAG directly

**Code:**
```typescript
if (existingMessages.length === 0 && !dbHasInitialMessage && assessmentSummary && !hasInitialBotMessage && assessment) {
  // Use Gemini for post-assessment initial greeting
  const aiResponse = await getGeminiService().generateInitialGreeting(
    assessmentSummary,
    language
  );

  initialMessage = {
    reply: aiResponse.reply,
    intent: aiResponse.intent,
  };
  
  // Save to database...
}
```

### POST /api/chat/message - Follow-up Questions

**Behavior:**
- All follow-up messages use **RAG Service** regardless of entry point
- RAG performs semantic search over career database
- Provides factually grounded responses based on career data
- Maintains conversation context from previous messages

**Code:**
```typescript
// Generate bot response using RAG for all follow-up questions
const botReply = await getRAGService().chat(
  message,
  contextMessages
);
```

## Why This Hybrid Approach?

### Gemini Strengths (Initial Greeting)
- ✅ Personalized recommendations based on assessment data
- ✅ Sophisticated analysis of RIASEC personality types
- ✅ Multi-language support with cultural awareness
- ✅ Career matching logic with reasoning
- ✅ Structured presentation of career paths with next steps

### RAG Strengths (Follow-up Questions)
- ✅ Factually grounded responses from career database
- ✅ Semantic search over 1000+ careers
- ✅ No hallucination - only returns data from database
- ✅ Fast retrieval with ChromaDB vector search
- ✅ No per-request API costs for embeddings (local model)

## Data Flow Diagram

```
Assessment Flow:
┌─────────────────┐
│ User completes  │
│   assessment    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /start     │
│ (with summary)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Gemini Service  │ ◄── RIASEC scores, matching careers
│ Initial Greeting│     Multi-language, personalized
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User asks       │
│ follow-up Q     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RAG Service     │ ◄── Semantic search over career DB
│ Answer from DB  │     Factually grounded, fast
└─────────────────┘

Home Page Flow:
┌─────────────────┐
│ User asks       │
│ career question │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RAG Service     │ ◄── Direct to database search
│ Answer from DB  │     No assessment context
└─────────────────┘
```

## Environment Variables

### Required for Both Services
```bash
# Gemini Service (for post-assessment greetings)
GEMINI_API_KEY=your_gemini_api_key_here
# OR
GOOGLE_API_KEY=your_google_api_key_here

# RAG Service (for follow-up questions)
RAG_PROVIDER=google  # Options: 'google' or 'groq'
GROQ_API_KEY=your_groq_api_key_here  # If using groq provider
```

### Optional Configuration
```bash
# RAG settings
EMBEDDING_MODEL=sentence-transformers/all-mpnet-base-v2
CHROMA_PERSIST_DIRECTORY=./chroma_data_full
CAREERS_JSON_PATH=./careers_cleaned.json
```

## Testing the Integration

### 1. Test Post-Assessment Flow
```bash
# Start a chat with assessment summary
curl -X POST http://localhost:3000/api/chat/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "assessmentId": 1,
    "assessmentSummary": "RIASEC Scores: R=30, I=45, A=60...",
    "language": "en"
  }'

# Expected: Gemini-generated personalized greeting
```

### 2. Test Follow-up Questions
```bash
# Send a follow-up question
curl -X POST http://localhost:3000/api/chat/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "message": "What skills do I need for graphic design?",
    "assessmentId": 1,
    "language": "en"
  }'

# Expected: RAG-powered response from career database
```

### 3. Test General Chat (No Assessment)
```bash
# Start a general chat session
curl -X POST http://localhost:3000/api/chat/start \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "general-session",
    "language": "en"
  }'

# Send a general question
curl -X POST http://localhost:3000/api/chat/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "general-session",
    "message": "Tell me about careers in software engineering",
    "language": "en"
  }'

# Expected: RAG-powered response directly
```

## Code Changes Summary

### Modified Files
1. **`backend/src/routes/chat.ts`**
   - Added `GeminiService` import
   - Created `getGeminiService()` helper
   - Modified `/start` endpoint to use Gemini for post-assessment greetings
   - `/message` endpoint continues using RAG for all follow-ups

### Unchanged Files
- **`backend/src/services/gemini.ts`** - No changes to internal logic
- **`backend/src/services/ragChat.ts`** - No changes to internal logic
- **`backend/src/services/rag_service.py`** - No changes to Python service

## Benefits of This Integration

1. **Best of Both Worlds**
   - Gemini's sophisticated analysis for personalized recommendations
   - RAG's factual grounding for follow-up questions

2. **Cost Efficiency**
   - Gemini only used once per assessment (initial greeting)
   - RAG uses local embeddings (no API costs for follow-ups)
   - Groq option available for free/low-cost LLM inference

3. **Accuracy**
   - Gemini analyzes assessment data with reasoning
   - RAG prevents hallucination by grounding in career database

4. **Performance**
   - Persistent Python process (no spawn overhead)
   - Vector search is fast (ChromaDB)
   - Queue-based request handling prevents timeout issues

5. **Maintainability**
   - Services are independent (no coupling)
   - Easy to swap providers (Google/Groq for RAG)
   - Clear separation of concerns

## Troubleshooting

### Issue: Gemini initial greeting fails
**Symptom:** No initial message after assessment completion
**Solution:** 
- Check `GEMINI_API_KEY` in `.env`
- Verify API key is valid on [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check backend logs: `npm run dev` or `cat backend.log`

### Issue: RAG follow-up fails
**Symptom:** Follow-up questions timeout or error
**Solution:**
- Check Python environment: `cd backend && python rag_service.py`
- Verify ChromaDB data exists: `ls chroma_data_full/`
- Check RAG provider API key (if using Groq)
- Test standalone: `python test_rag_json.py`

### Issue: Mixed messages from wrong service
**Symptom:** Responses don't match expected behavior
**Solution:**
- Check `assessmentId` parameter in requests
- Verify database messages have correct `assessment_id`
- Review chat history: `GET /api/chat/history?assessmentId=1`

## Future Enhancements

1. **Hybrid Responses**
   - Use Gemini for complex reasoning + RAG for facts
   - Combine strengths in a single response

2. **Intent Detection**
   - Route to Gemini for "why" questions (reasoning)
   - Route to RAG for "what" questions (facts)

3. **Context Augmentation**
   - Pass RAG-retrieved career data to Gemini for analysis
   - Generate more personalized follow-up responses

4. **Multi-Modal**
   - Add career images/videos from database
   - Use Gemini Vision for visual recommendations

## Conclusion

This hybrid integration provides the best career guidance experience:
- **Personalized** recommendations from Gemini's analysis
- **Accurate** follow-up responses from RAG's database search
- **Efficient** use of API resources
- **Maintainable** code with clear separation of concerns

Both services work together seamlessly while maintaining their independence, giving students high-quality career guidance throughout their journey.
