import { Router } from 'express'
import { getDatabase } from '../db/init'
import { broadcast } from '../index'

const router = Router()
const db = getDatabase()

// Get scores for event/game
router.get('/', (req, res) => {
  try {
    const { event_id, game_id } = req.query
    
    let query = 'SELECT * FROM scores WHERE 1=1'
    const params: any[] = []
    
    if (event_id) {
      query += ' AND event_id = ?'
      params.push(event_id)
    }
    if (game_id) {
      query += ' AND game_id = ?'
      params.push(game_id)
    }
    
    query += ' ORDER BY score DESC'
    
    const scores = db.query(query).all(...params)
    res.json(scores)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scores' })
  }
})

// Submit score
router.post('/', (req, res) => {
  try {
    const { event_id, game_id, player_name, score } = req.body
    
    db.run('INSERT INTO scores (event_id, game_id, player_name, score) VALUES (?, ?, ?, ?)', [event_id, game_id, player_name, score])
    
    // Get the last inserted row - fetch newest score for this player/game
    const newScore = db.query('SELECT * FROM scores WHERE player_name = ? AND game_id = ? ORDER BY id DESC LIMIT 1').get(player_name, game_id)
    broadcast({ type: 'score_submitted', data: newScore })
    
    res.status(201).json(newScore)
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit score' })
  }
})

// Delete score
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params
    
    // Get score before deleting for broadcast
    const score = db.query('SELECT * FROM scores WHERE id = ?').get(id)
    
    if (!score) {
      return res.status(404).json({ error: 'Score not found' })
    }
    
    db.run('DELETE FROM scores WHERE id = ?', [id])
    
    broadcast({ type: 'score_deleted', data: { id, score } })
    res.status(200).json({ message: 'Score deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete score' })
  }
})

export { router as scoreRoutes }
