# Quick Start Guide

## Prerequisites
- [Bun](https://bun.sh) installed
- Node.js 16+ (for tools)

## Initial Setup

```bash
# Clone/navigate to project
cd bgd-vibes

# Install all dependencies (both frontend and backend)
bun install
```

## Running the Application

### Option 1: Run Backend and Frontend Separately

**Terminal 1 - Start Backend:**
```bash
cd backend
bun run dev
```
✓ Backend starts on `http://localhost:3000`  
✓ WebSocket endpoint: `ws://localhost:3000`

**Terminal 2 - Start Frontend:**
```bash
cd frontend
bun run dev
```
✓ Frontend starts on `http://localhost:5173`

### Option 2: Verify Services Are Running

```bash
# Check backend health
curl http://localhost:3000/api/health

# Check frontend is accessible
curl http://localhost:5173
```

## What You Can Do Now

1. **Access the App**: Open `http://localhost:5173` in your browser
2. **Enter your name** when prompted
3. **View Pages**:
   - **Games**: Shows available board games (stub - needs implementation)
   - **Leaderboard**: Rankings by overall and per-game (stub)
   - **Admin**: Add new games (form ready, needs API wiring)

## API Endpoints Available

- `GET /api/health` - Health check
- `GET /api/games` - List all games
- `POST /api/games` - Create a game
- `GET /api/events` - List events
- `POST /api/events` - Create an event
- `GET /api/scores` - Get scores (can filter by `?event_id=X` or `?game_id=X`)
- `POST /api/scores` - Submit a score

## Testing the API

```bash
# Add a game
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{"name":"Catan","description":"Build settlements"}'

# Get games
curl http://localhost:3000/api/games

# Create an event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"name":"Game Night #1"}'

# Submit a score
curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
  -d '{"event_id":1,"game_id":1,"player_name":"Alice","score":42}'
```

## Real-time Updates

Open the browser DevTools console and you'll see WebSocket messages like:
```javascript
// When a game is added
{type: 'game_added', data: {...}}

// When a score is submitted
{type: 'score_submitted', data: {...}}
```

## Database

SQLite database is automatically created at `./data/bgd.db` on first run.

### Reset Database (if needed)
```bash
# Delete database file
rm backend/data/bgd.db

# Database will be recreated on next backend startup
```

## Troubleshooting

### Backend won't start
- Check port 3000 is free: `lsof -i :3000`
- Look for errors in terminal

### Frontend won't start
- Check port 5173 is free: `lsof -i :5173`
- Try clearing cache: `rm -rf frontend/.vite frontend/dist`

### WebSocket not connecting
- Ensure backend is running on port 3000
- Check browser console for errors
- Verify `/ws` endpoint can reach backend

## See Also

- `.github/copilot-instructions.md` - Architecture and patterns for AI agents
- `README.md` - Full project documentation
- `SETUP_FIXES.md` - Details on fixes applied for initial setup
