import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { initializeDatabase } from './db/init'
import { gameRoutes } from './routes/games'
import { eventRoutes } from './routes/events'
import { scoreRoutes } from './routes/scores'

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Initialize database
initializeDatabase()

// WebSocket setup
const server = createServer(app)
const wss = new WebSocketServer({ server })

// Store active connections for broadcasting
const clients = new Set<any>()

// Store game states for syncing
const gameStates = new Map<number, any[]>()

wss.on('connection', (ws) => {
  clients.add(ws)
  console.log(`Client connected. Total: ${clients.size}`)

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      console.log('Received message from client:', message)
      
      // Handle game state sync requests
      if (message.type === 'request_game_state') {
        const gameId = message.gameId
        const gameState = gameStates.get(gameId) || []
        console.log(`Sending game state for game ${gameId}:`, gameState)
        ws.send(JSON.stringify({
          type: `game_state_${gameId}`,
          data: gameState,
        }))
      }
      
      // Broadcast score updates to all clients
      if (message.type === 'score_update') {
        const gameId = message.gameId
        console.log(`Broadcasting score update for game ${gameId} to ${clients.size} clients`)
        
        // Update the game state
        const gameState = gameStates.get(gameId) || []
        const existingIndex = gameState.findIndex(p => p.name === message.player_name)
        if (existingIndex >= 0) {
          gameState[existingIndex] = {
            name: message.player_name,
            score: message.score,
            editedBy: message.editedBy,
          }
        } else {
          gameState.push({
            name: message.player_name,
            score: message.score,
            editedBy: message.editedBy,
          })
        }
        gameStates.set(gameId, gameState)
        
        broadcast({
          type: `score_update_${gameId}`,
          data: {
            player_name: message.player_name,
            score: message.score,
            editedBy: message.editedBy,
          },
        })
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err)
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
    console.log(`Client disconnected. Total: ${clients.size}`)
  })

  ws.on('error', (err) => {
    console.error('WebSocket error:', err)
  })
})

// Broadcast function for real-time updates
export const broadcast = (data: any) => {
  console.log(`Broadcasting message to ${clients.size} clients:`, data)
  const message = JSON.stringify(data)
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(message)
    }
  })
}

// Routes
app.use('/api/games', gameRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/scores', scoreRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

server.listen(port, () => {
  console.log(`Server running on port ${port}`)
  console.log(`WebSocket endpoint: ws://localhost:${port}`)
})
