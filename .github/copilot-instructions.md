# BGD Vibes - Copilot Instructions

AI agents working on this codebase should understand the following architectural decisions and conventions.

## Project Overview

**Board Game Day Vibes** is a real-time event management web app for tracking board game scores and determining winners. It uses a monorepo structure with separate frontend and backend directories, connected via REST API + WebSocket for live updates.

- **Frontend**: React + Vite with TypeScript
- **Backend**: Node.js/Express with Bun runtime + SQLite
- **Real-time**: WebSocket for live score broadcasting
- **Auth**: Simple session-based (player name in localStorage)

## Architecture

### Monorepo Structure

```
/frontend    - React app (port 5173)
/backend     - Express server (port 3000)
```

Development runs both concurrently: `bun run dev` starts both services.

### Key Architectural Patterns

**Real-time Updates via WebSocket**
- Backend maintains a `Set<WebSocket>` of connected clients
- Use `broadcast(data)` function in `src/index.ts` to send updates to all clients
- Message format: `{ type: string, data: any }`
- Broadcast triggers on: game added, score submitted, event status changed

**Database Persistence**
- SQLite using Bun's built-in `bun:sqlite` API
- Located at `./data/bgd.db`
- Schema: `games`, `events`, `scores` tables
- API: Use `db.query(sql).all(params)` for SELECT and `db.run(sql, params)` for INSERT/UPDATE/DELETE

**API Design**
- Prefix all routes with `/api/` 
- Paths: `/api/games`, `/api/events`, `/api/scores`
- POST endpoints trigger broadcasts
- No explicit authentication needed - player identified by session name

### Component Hierarchy (Frontend)

```
App
├── Navigation (page switcher)
└── Current Page:
    ├── EventPage (active games, score submission)
    ├── LeaderboardPage (overall + per-game rankings)
    └── AdminPage (add games, manage events)
```

Player identity stored in `localStorage` with key `playerName`.

## Development Workflow

### Setup
```bash
bun install                    # Install all dependencies
bun run dev                    # Start both frontend & backend
```

### Building
```bash
bun run build                  # Compiles both frontend & backend
```

### Directory-specific commands
```bash
bun run dev --cwd frontend     # Frontend only
bun run dev --cwd backend      # Backend only
```

## Critical Patterns

### Backend Route Implementation
Each route module exports a named export `router`:
- Must import `{ getDatabase }` from `../db/init`
- Must import `{ broadcast }` from `../index` for real-time updates
- Use Bun SQLite API: `db.query(sql).all(...params)` or `db.run(sql, params)`
- Always call `broadcast()` after writes

Example:
```typescript
import { Router } from 'express'
import { getDatabase } from '../db/init'
import { broadcast } from '../index'

const router = Router()
const db = getDatabase()

router.post('/', (req, res) => {
  db.run('INSERT INTO games (name) VALUES (?)', [req.body.name])
  const game = db.query('SELECT * FROM games WHERE name = ?').get(req.body.name)
  broadcast({ type: 'game_added', data: game })
  res.status(201).json(game)
})

export { router as gameRoutes }
```

### Frontend Component Pattern
- All page components receive `playerName` prop (access from App state)
- Use `useWebSocket()` hook for connection status
- Components should refetch data on mount (useState + useEffect)
- Styles: Tailwind classes, no inline CSS

### Leaderboard Logic
- Overall: Rank players by sum of all scores across games
- Per-game: Rank players by highest score for that specific game
- Compute client-side from `/api/scores?event_id=X` response

## File Organization

**Backend**
- `src/index.ts` - Server, WebSocket setup, broadcast function
- `src/db/init.ts` - Database connection, schema initialization
- `src/routes/*.ts` - Route handlers (games, events, scores)
- `src/types/` - TypeScript interfaces (currently empty, add as needed)

**Frontend**
- `src/App.tsx` - Main app logic, page routing, player auth
- `src/components/` - Reusable UI components
- `src/pages/` - Full page components (Event, Leaderboard, Admin)
- `src/hooks/` - Custom React hooks (WebSocket, API calls, etc.)

## Known Stubs / TODO

These are partially implemented and need completion:

1. **EventPage** - Shows games, needs fetch from `/api/games`, score submission form
2. **LeaderboardPage** - Needs fetch from `/api/scores`, computation of rankings
3. **AdminPage.add** - Form exists, needs POST to `/api/games` with broadcast
4. **EventPage.scores** - No score submission UI yet
5. **Admin event management** - Not yet implemented (switch active event)
6. **Authentication** - Currently just localStorage name, no real security

## Type Safety & Imports

- Always use TypeScript interfaces for API responses
- Frontend imports: Use `./relative/paths` for local modules, bare names for npm
- Backend: Node.js built-ins available (http, fs, etc.)
- WebSocket messages should be typed: `interface GameAddedMessage { type: 'game_added', data: Game }`

## Testing & Validation

- Frontend: `bun run type-check` for TypeScript validation
- Backend: No test suite yet - manual testing via `bun run dev`
- Health check: `GET /api/health` returns `{ status: 'ok' }`

## Tailscale Deployment Notes

- Runs locally on `localhost:3000` (backend) and `localhost:5173` (frontend)
- Tailscale provides public endpoint for friends
- CORS enabled for any origin (`cors()` with defaults)
- WebSocket proxies through Tailscale automatically

## Data Flow Example: Score Submission

1. User fills score form in EventPage
2. POST to `/api/scores` with `{ event_id, game_id, player_name, score }`
3. Backend inserts into scores table, broadcasts `{ type: 'score_submitted', data }`
4. All connected clients receive message via WebSocket
5. Frontend re-fetches leaderboard data and re-renders

---

**Last Updated**: February 2026  
When adding new features, ensure they follow these patterns and update this file if patterns change.
