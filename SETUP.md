# Quick Setup Guide

## Initial Setup Steps

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env and add your GEMINI_API_KEY
# nano .env  # or use your preferred editor

# Initialize Prisma
npx prisma generate
npx prisma migrate dev --name init

# Start backend server
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# (Optional) Create .env file if you need custom API URL
# echo "VITE_API_BASE_URL=http://localhost:3000/api" > .env

# Start frontend server
npm run dev
```

## Important Notes

1. **Database**: The database file (`db.sqlite3`) will be created automatically when you run Prisma migrations. If you're copying from HCI-main, you may need to run migrations to sync the schema.

2. **Environment Variables**: 
   - Backend requires `GEMINI_API_KEY` for AI features
   - Backend requires `JWT_SECRET` for authentication (change from default!)
   - Frontend defaults to `http://localhost:3000/api` if no `.env` is set

3. **First Run**:
   - Backend will create the database on first migration
   - Frontend will connect to backend automatically
   - Create a new user account through the setup page

## Troubleshooting

### Database Issues
If you get database errors:
```bash
cd backend
npx prisma migrate reset  # WARNING: This deletes all data
npx prisma migrate dev
```

### Port Conflicts
- Backend default: `3000`
- Frontend default: `5173`
- Change in respective `.env` files if needed

### CORS Errors
- Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL
- Check browser console for specific CORS error messages

## Next Steps

1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to `backend/.env`
3. Start both servers
4. Open `http://localhost:5173` in your browser
5. Create an account and start using the app!

