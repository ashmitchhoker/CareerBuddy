# Career Guidance Web App - Combined Final

A full-stack career guidance application with AI-powered recommendations, user authentication, and persistent data storage.

## Features

- ✅ **User Authentication**: JWT-based authentication with secure login/signup
- ✅ **Database Integration**: SQLite database with Prisma ORM for persistent data
- ✅ **AI-Powered Recommendations**: Google Gemini AI integration for personalized career guidance
- ✅ **RAG Chatbot**: Advanced chatbot with Retrieval-Augmented Generation for accurate career information
- ✅ **Assessment System**: Multi-test assessment flow (Aptitude, Values, Personal)
- ✅ **Chat Interface**: Context-aware AI chatbot for career guidance discussions
- ✅ **Multi-language Support**: English, Hindi, Telugu, Tamil, Bengali, Gujarati
- ✅ **Assessment History**: Track and view past assessments
- ✅ **Modern UI**: React + TypeScript + Tailwind CSS with Radix UI components

## Tech Stack

### Backend

- **Node.js** + **Express** + **TypeScript**
- **Prisma** ORM with **SQLite** database
- **JWT** authentication
- **Google Gemini AI** for recommendations and chat
- **Python RAG Service** with LangChain + ChromaDB for advanced chatbot
- **HuggingFace Embeddings** for semantic search

### Frontend

- **React** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Radix UI** components
- **Axios** for API calls

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for RAG chatbot service)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- HuggingFace API token ([Get one here](https://huggingface.co/settings/tokens))

### Backend Setup

1. Navigate to backend directory:

```bash
cd backend
```

2. Install Node.js dependencies:

```bash
npm install
```

5. Edit `.env` and add your configuration:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DATABASE_URL="file:./db.sqlite3"

JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_API_KEY=your_gemini_api_key_here

# RAG Service Configuration
RAG_PROVIDER=google  # Options: 'google' or 'groq'
HUGGINGFACEHUB_API_TOKEN=your_huggingface_token_here
HF_TOKEN=your_huggingface_token_here
HUGGINGFACE_TOKEN=your_huggingface_token_here

# Optional: Groq API if using Groq provider
GROQ_API_KEY=your_groq_api_key_here

MAX_RETRY_ATTEMPTS=3
RETRY_DELAY_MS=1000
```

6. Initialize Prisma and database:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

7. Start the backend server:

```bash
npm run dev
```

The backend will run on `http://localhost:3000`

> **Note**: For detailed RAG setup instructions, see [backend/RAG_SETUP.md](backend/RAG_SETUP.md)

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file (optional, defaults to localhost:3000):

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

4. Start the frontend development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Project Structure

```
combine_Final/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          # Authentication routes
│   │   │   ├── home.ts          # Home page data
│   │   │   ├── assessment.ts   # Assessment routes
│   │   │   ├── chat.ts          # Chat routes
│   │   │   └── profile.ts       # Profile management
│   │   ├── services/
│   │   │   └── gemini.ts        # Gemini AI service
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT authentication middleware
│   │   ├── types.ts             # TypeScript types
│   │   └── server.ts            # Express server setup
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── components/          # React components
    │   ├── services/
    │   │   ├── api.ts           # Axios client
    │   │   ├── authService.ts  # Auth service
    │   │   └── assessmentService.ts # Assessment service
    │   ├── App.tsx              # Main app component
    │   └── main.tsx            # Entry point
    ├── package.json
    └── vite.config.ts
```

## API Endpoints

### Authentication

- `POST /api/auth/setup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/token/refresh` - Refresh access token

### Home

- `GET /api/home` - Get home page data

### Assessment

- `POST /api/assessment/start` - Start new assessment
- `GET /api/assessment/test/:testType` - Get test data
- `POST /api/assessment/save` - Save test progress
- `POST /api/assessment/submit` - Submit completed test
- `POST /api/assessment/complete` - Process assessment and get recommendations
- `GET /api/assessment/history` - Get assessment history
- `GET /api/assessment/:id/responses` - Get assessment responses

### Chat

- `POST /api/chat/start` - Start chat session
- `POST /api/chat/message` - Send message and get AI response
- `GET /api/chat/history` - Get chat history

### Profile

- `GET /api/profile` - Get user profile
- `PATCH /api/profile/update` - Update user profile
- `DELETE /api/profile/delete` - Delete user account

## Database Schema

- **CustomUser**: User accounts with profile information
- **Assessment**: Assessment sessions
- **TestResponse**: Individual test responses
- **ChatMessage**: Chat messages between user and AI

## Development

### Backend Development

```bash
cd backend
npm run dev  # Auto-reload on changes
```

### Frontend Development

```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

### Database Management

```bash
cd backend
npx prisma studio  # Open database GUI
npx prisma migrate dev  # Create new migration
```

## Production Deployment

1. Set `NODE_ENV=production` in backend `.env`
2. Change `JWT_SECRET` to a strong random string
3. Build frontend: `cd frontend && npm run build`
4. Use a production database (PostgreSQL recommended)
5. Set up proper CORS configuration
6. Use environment variable management for secrets

## Troubleshooting

### "GEMINI_API_KEY is required" error

- Ensure `.env` file exists in backend directory
- Check that `GEMINI_API_KEY` is set correctly

### CORS errors

- Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- Check that frontend is making requests to correct backend URL

### Database errors

- Run `npx prisma generate` to regenerate Prisma client
- Run `npx prisma migrate dev` to apply migrations
- Check that `DATABASE_URL` in `.env` is correct

### Authentication errors

- Check that JWT tokens are being stored in localStorage
- Verify `JWT_SECRET` is set in backend `.env`
- Check browser console for token expiration errors

## License

ISC
