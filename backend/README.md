# Career Guidance Backend API

Express.js + TypeScript backend with Prisma ORM, JWT authentication, and Google Gemini AI integration.

## Quick Start

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure
3. Initialize database: `npx prisma generate && npx prisma migrate dev`
4. Start server: `npm run dev`

## Environment Variables

See `.env.example` for required variables:
- `GEMINI_API_KEY` - Required for AI features
- `JWT_SECRET` - Required for authentication
- `DATABASE_URL` - SQLite database path
- `PORT` - Server port (default: 3000)
- `FRONTEND_URL` - CORS origin (default: http://localhost:5173)

## Database

Uses Prisma ORM with SQLite. Run migrations with:
```bash
npx prisma migrate dev
```

View database with:
```bash
npx prisma studio
```

## API Documentation

See main README.md for API endpoint documentation.

