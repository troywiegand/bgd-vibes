import { Router } from 'express'
import { getDatabase } from '../db/init'
import { broadcast } from '../index'

const router = Router()
const db = getDatabase()

// Get all games
router.get('/', (_req, res) => {
  try {
    const games = db.query('SELECT * FROM games').all()
    res.json(games)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' })
  }
})

// Get games for a specific event (filtered by categories)
router.get('/event/:eventId', (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId, 10)
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' })
    }

    const event = db.query('SELECT * FROM events WHERE id = ?').get(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const categoryList = typeof event.category_list === 'string' 
      ? JSON.parse(event.category_list || '[]') 
      : event.category_list || []

    // If no categories specified, return all games
    if (categoryList.length === 0) {
      const games = db.query('SELECT * FROM games').all()
      return res.json(games)
    }

    // Filter games by event's categories
    const placeholders = categoryList.map(() => '?').join(',')
    const games = db.query(`SELECT * FROM games WHERE category IN (${placeholders})`).all(...categoryList)
    
    res.json(games)
  } catch (error) {
    console.error('GET /games/event/:eventId error:', error)
    res.status(500).json({ error: 'Failed to fetch event games', details: String(error) })
  }
})

// Create game (admin)
router.post('/', (req, res) => {
  try {
    const { name, description, category, bgg_url, how_to_play_url, player_count_min, player_count_max } = req.body
    
    if (!name) {
      return res.status(400).json({ error: 'Game name is required' })
    }
    
    const stmt = db.prepare(
      'INSERT INTO games (name, description, category, bgg_url, how_to_play_url, player_count_min, player_count_max) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    stmt.run(name, description || '', category || 'Uncategorized', bgg_url || '', how_to_play_url || '', player_count_min || null, player_count_max || null)
    
    const game = db.query('SELECT * FROM games WHERE name = ?').get(name)
    broadcast({ type: 'game_added', data: game })
    
    res.status(201).json(game)
  } catch (error) {
    console.error('POST /games error:', error)
    res.status(500).json({ error: 'Failed to create game', details: String(error) })
  }
})

// Update game (admin)
router.put('/:id', (req, res) => {
  try {
    const gameId = parseInt(req.params.id, 10)
    const { description, category, bgg_url, how_to_play_url, player_count_min, player_count_max } = req.body
    
    if (isNaN(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID' })
    }
    
    const stmt = db.prepare(
      'UPDATE games SET description = ?, category = ?, bgg_url = ?, how_to_play_url = ?, player_count_min = ?, player_count_max = ? WHERE id = ?'
    )
    stmt.run(description || '', category || 'Uncategorized', bgg_url || '', how_to_play_url || '', player_count_min || null, player_count_max || null, gameId)
    
    const game = db.query('SELECT * FROM games WHERE id = ?').get(gameId)
    if (!game) {
      return res.status(404).json({ error: 'Game not found' })
    }
    
    broadcast({ type: 'game_updated', data: game })
    
    res.json(game)
  } catch (error) {
    console.error('PUT /games/:id error:', error)
    res.status(500).json({ error: 'Failed to update game', details: String(error) })
  }
})

// Delete game (admin)
router.delete('/:id', (req, res) => {
  try {
    const gameId = parseInt(req.params.id, 10)
    
    // Delete associated scores first (foreign key constraint)
    db.run('DELETE FROM scores WHERE game_id = ?', [gameId])
    
    // Then delete the game
    db.run('DELETE FROM games WHERE id = ?', [gameId])
    
    broadcast({ type: 'game_deleted', data: { id: gameId } })
    
    res.json({ success: true, id: gameId })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete game' })
  }
})

export { router as gameRoutes }
