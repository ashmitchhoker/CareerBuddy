# Quick Reference - RAG Chatbot Integration

## Setup Commands

```bash
# 1. Install Python dependencies
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 2. Test RAG service
npm run test:rag

# 3. Start backend
npm run dev

# 4. Start frontend (separate terminal)
cd ../frontend
npm run dev
```

## Required Environment Variables

Add these to `backend/.env`:

```env
RAG_PROVIDER=google
GOOGLE_API_KEY=your_google_api_key
HUGGINGFACEHUB_API_TOKEN=your_hf_token
HF_TOKEN=your_hf_token
HUGGINGFACE_TOKEN=your_hf_token
```

## File Structure

```
CareerBuddy/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── rag_service.py      ← Python RAG implementation
│   │   │   └── ragChat.ts          ← TypeScript wrapper
│   │   └── routes/
│   │       └── chat.ts             ← Updated to use RAG
│   ├── careers_cleaned.json        ← Career data
│   ├── chroma_data_full/           ← Vector database
│   ├── requirements.txt            ← Python deps
│   ├── test_rag.py                 ← Test script
│   └── RAG_SETUP.md                ← Detailed setup
└── frontend/
    └── src/
        └── components/
            └── ChatbotPage.tsx     ← No changes needed
```

## How to Use

1. **Start the app** (backend + frontend)
2. **Login/Register** in the web interface
3. **Take an assessment** (optional but recommended)
4. **Open Chat** from the results page or home page
5. **Ask career questions** - the RAG chatbot will respond with:
   - Accurate information from your career database
   - Source attribution showing which documents were used
   - Context-aware responses based on assessment results

## Key Features

✅ Uses your career database (careers_cleaned.json)  
✅ Semantic search with vector embeddings  
✅ Context-aware conversations  
✅ Source attribution for transparency  
✅ Assessment-aware responses  
✅ Persistent chat history

## Common Commands

```bash
# Test RAG service
npm run test:rag

# Start development server
npm run dev

# Rebuild database
prisma migrate dev

# View database
prisma studio
```

## Quick Troubleshooting

| Problem          | Solution                               |
| ---------------- | -------------------------------------- |
| Python not found | Install Python 3.8+ and add to PATH    |
| Module errors    | Run: `pip install -r requirements.txt` |
| API key errors   | Check `.env` file has all keys         |
| Slow responses   | First request is slow (loads DB)       |
| Empty responses  | Verify careers_cleaned.json exists     |

## Getting API Keys

- **Google Gemini**: https://makersuite.google.com/app/apikey
- **HuggingFace**: https://huggingface.co/settings/tokens
- **Groq** (optional): https://console.groq.com/

## Support Files

- `INTEGRATION_COMPLETE.md` - Full integration details
- `backend/RAG_SETUP.md` - Complete setup guide
- `backend/test_rag.py` - Diagnostic testing
- `README.md` - Project overview

---

**Note**: The RAG chatbot replaces the previous Gemini-only implementation with a more powerful system that uses your curated career database for accurate, source-backed responses.
