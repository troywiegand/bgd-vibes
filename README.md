# Board Game Day Vibes

A real-time web app for managing board game events, tracking scores, and determining winners.

## Features

- **Game Management**: Admin panel to add/edit board games
- **Score Tracking**: Real-time score submission during events
- **Leaderboards**: Per-game and overall event rankings
- **Real-time Updates**: WebSocket-powered live score updates
- **Simple Auth**: Session-based player identification
- **Responsive UI**: Works great on mobile and large displays

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express (Bun runtime)
- **Database**: SQLite
- **Real-time**: WebSockets
- **Package Manager**: Bun

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed

### Installation

```bash
bun install
```

### Development

Run frontend and backend concurrently:

```bash
bun run dev
```

This starts:
- Backend on `http://localhost:3000`
- Frontend on `http://localhost:5173`

### Build

```bash
bun run build
```

### Production

```bash
bun run start
```

## Project Structure

```
.
├── frontend/          # React + Vite app
├── backend/           # Express server
└── .github/          # GitHub configuration
```

## Architecture

### Frontend

- React components for UI
- Tailwind CSS for styling
- WebSocket client for real-time updates
- Local session storage for player identity

### Backend

- Express REST API
- SQLite database with migrations
- WebSocket server for live updates
- Session management

## Database Schema

**Games**
- id, name, description, image_url, created_at

**Events**
- id, name, status (active/completed), created_at

**Scores**
- id, event_id, game_id, player_name, score, timestamp

**Leaderboards**
- Computed from Scores table

## Architecture Overview

### Frontend (React + Vite)
- **App.tsx**: Main component with routing and player auth
- **Pages**: Event (current games), Leaderboard (rankings), Admin (manage games)
- **Hooks**: `useWebSocket` for real-time connections
- **Styling**: Tailwind CSS for responsive design

### Backend (Express + SQLite)
- **REST API**: `/api/games`, `/api/events`, `/api/scores`
- **WebSocket**: Real-time score broadcasting to all connected clients
- **Database**: SQLite with prepared statements (no ORM)
- **Broadcast Pattern**: Any POST triggers `broadcast()` to update all clients

## Next Steps to Complete MVP

1. **EventPage**: Fetch `/api/games`, display cards with score submission forms
2. **LeaderboardPage**: Fetch `/api/scores`, compute rankings (overall + per-game)
3. **AdminPage**: Connect "Add Game" form to POST `/api/games`
4. **WebSocket Client**: Hook up frontend to receive `game_added` and `score_submitted` messages
5. **Event Management**: Allow admins to create/switch active events

## Contributing

See `.github/copilot-instructions.md` for AI agent guidelines on patterns and conventions.

## License

MIT
