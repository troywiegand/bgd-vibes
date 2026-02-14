import { Router } from 'express'

const router = Router()

// In-memory store of active player sessions
// Map of playerName -> sessionId
const activeSessions = new Map<string, string>()

// Register a player session
router.post('/register', (req, res) => {
  try {
    const { playerName, sessionId } = req.body

    if (!playerName || !sessionId) {
      return res.status(400).json({ error: 'Player name and session ID required' })
    }

    // Check if player is already logged in from another session
    const existingSession = activeSessions.get(playerName)
    if (existingSession && existingSession !== sessionId) {
      return res.status(409).json({ error: 'Player already logged in from another device' })
    }

    // Register the session
    activeSessions.set(playerName, sessionId)

    res.json({ success: true, message: `Player ${playerName} registered` })
  } catch (error) {
    res.status(500).json({ error: 'Failed to register session' })
  }
})

// Unregister a player session (logout)
router.post('/unregister', (req, res) => {
  try {
    const { playerName, sessionId } = req.body

    if (!playerName) {
      return res.status(400).json({ error: 'Player name required' })
    }

    // Only remove if the session matches (prevent other sessions from logging out someone else)
    const currentSession = activeSessions.get(playerName)
    if (currentSession === sessionId) {
      activeSessions.delete(playerName)
    }

    res.json({ success: true, message: `Player ${playerName} unregistered` })
  } catch (error) {
    res.status(500).json({ error: 'Failed to unregister session' })
  }
})

// Check if a player name is available
router.get('/check/:playerName', (req, res) => {
  try {
    const { playerName } = req.params
    const isAvailable = !activeSessions.has(playerName)

    res.json({ available: isAvailable, playerName })
  } catch (error) {
    res.status(500).json({ error: 'Failed to check session' })
  }
})

// Get all active sessions (admin endpoint)
router.get('/active', (req, res) => {
  try {
    const sessions = Array.from(activeSessions.entries()).map(([playerName]) => playerName)
    res.json({ activePlayers: sessions, count: sessions.length })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get active sessions' })
  }
})

export { router as sessionRoutes }
