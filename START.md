# How to Start the Application

## Quick Start Commands

### Option 1: Start Backend First (Terminal 1)
```bash
cd backend
npm run dev
```
Backend will run on: http://localhost:3000

### Option 2: Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend will run on: http://localhost:5173

## Important Notes

1. **Run commands from the correct directory:**
   - ❌ Don't run `npm run dev` from `combine_Final/` (root)
   - ✅ Run from `combine_Final/backend/` for backend
   - ✅ Run from `combine_Final/frontend/` for frontend

2. **Port 3000 already in use?**
   - Kill the process: `lsof -ti:3000 | xargs kill -9`
   - Or change PORT in `backend/.env`

3. **Access the app:**
   - Open http://localhost:5173 in your browser
   - Backend API: http://localhost:3000

## Troubleshooting

### "Port already in use" error
```bash
# Find what's using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)
```

### "Cannot find package.json"
Make sure you're in the correct directory:
- Backend: `cd combine_Final/backend`
- Frontend: `cd combine_Final/frontend`

