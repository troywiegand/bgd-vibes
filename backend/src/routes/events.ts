import { Router } from 'express'
import { getDatabase } from '../db/init'
import { broadcast } from '../index'

const router = Router()
const db = getDatabase()

// Get all events
router.get('/', (_req, res) => {
  try {
    const events = db.query('SELECT * FROM events ORDER BY created_at DESC').all()
    // Parse category_list and player_list from JSON strings
    const eventsWithParsed = events.map((e: any) => ({
      ...e,
      category_list: typeof e.category_list === 'string' ? JSON.parse(e.category_list || '[]') : e.category_list,
      player_list: typeof e.player_list === 'string' ? JSON.parse(e.player_list || '[]') : e.player_list
    }))
    res.json(eventsWithParsed)
  } catch (error) {
    console.error('GET /events error:', error)
    res.status(500).json({ error: 'Failed to fetch events' })
  }
})

// Get single event
router.get('/:id', (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10)
    const event = db.query('SELECT * FROM events WHERE id = ?').get(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }
    // Parse category_list and player_list from JSON strings
    event.category_list = typeof event.category_list === 'string' ? JSON.parse(event.category_list || '[]') : event.category_list
    event.player_list = typeof event.player_list === 'string' ? JSON.parse(event.player_list || '[]') : event.player_list
    res.json(event)
  } catch (error) {
    console.error('GET /events/:id error:', error)
    res.status(500).json({ error: 'Failed to fetch event' })
  }
})

// Create event (admin)
router.post('/', (req, res) => {
  try {
    const { name, primary_color, secondary_color, category_list, player_list } = req.body
    
    if (!name) {
      return res.status(400).json({ error: 'Event name is required' })
    }

    const categoryListJson = JSON.stringify(category_list || [])
    const playerListJson = JSON.stringify(player_list || [])
    
    const stmt = db.prepare(
      'INSERT INTO events (name, primary_color, secondary_color, category_list, player_list, status) VALUES (?, ?, ?, ?, ?, ?)'
    )
    stmt.run(name, primary_color || 'pink', secondary_color || 'rose', categoryListJson, playerListJson, 'active')
    
    const event = db.query('SELECT * FROM events WHERE name = ?').get(name)
    event.category_list = JSON.parse(event.category_list || '[]')
    event.player_list = JSON.parse(event.player_list || '[]')
    
    broadcast({ type: 'event_created', data: event })
    res.status(201).json(event)
  } catch (error) {
    console.error('POST /events error:', error)
    res.status(500).json({ error: 'Failed to create event', details: String(error) })
  }
})

// Update event (admin)
router.put('/:id', (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10)
    const { name, primary_color, secondary_color, category_list, player_list, status } = req.body
    
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' })
    }

    const categoryListJson = JSON.stringify(category_list || [])
    const playerListJson = JSON.stringify(player_list || [])
    
    const stmt = db.prepare(
      'UPDATE events SET name = ?, primary_color = ?, secondary_color = ?, category_list = ?, player_list = ?, status = ? WHERE id = ?'
    )
    stmt.run(name || '', primary_color || 'pink', secondary_color || 'rose', categoryListJson, playerListJson, status || 'active', eventId)
    
    const event = db.query('SELECT * FROM events WHERE id = ?').get(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }
    
    event.category_list = JSON.parse(event.category_list || '[]')
    event.player_list = JSON.parse(event.player_list || '[]')
    broadcast({ type: 'event_updated', data: event })
    
    res.json(event)
  } catch (error) {
    console.error('PUT /events/:id error:', error)
    res.status(500).json({ error: 'Failed to update event', details: String(error) })
  }
})

// Set event as active (only one active at a time)
router.put('/:id/activate', (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10)

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' })
    }

    // Set all events to inactive
    db.run('UPDATE events SET status = ? WHERE status = ?', ['inactive', 'active'])

    // Set the specified event to active
    db.run('UPDATE events SET status = ? WHERE id = ?', ['active', eventId])

    const event = db.query('SELECT * FROM events WHERE id = ?').get(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    event.category_list = JSON.parse(event.category_list || '[]')
    event.player_list = JSON.parse(event.player_list || '[]')
    broadcast({ type: 'event_activated', data: event })

    res.json(event)
  } catch (error) {
    console.error('PUT /events/:id/activate error:', error)
    res.status(500).json({ error: 'Failed to activate event', details: String(error) })
  }
})

// Set event as inactive
router.put('/:id/deactivate', (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10)

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' })
    }

    // Set the specified event to inactive
    db.run('UPDATE events SET status = ? WHERE id = ?', ['inactive', eventId])

    const event = db.query('SELECT * FROM events WHERE id = ?').get(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    event.category_list = JSON.parse(event.category_list || '[]')
    event.player_list = JSON.parse(event.player_list || '[]')
    broadcast({ type: 'event_deactivated', data: event })

    res.json(event)
  } catch (error) {
    console.error('PUT /events/:id/deactivate error:', error)
    res.status(500).json({ error: 'Failed to deactivate event', details: String(error) })
  }
})

// Delete event (admin)
router.delete('/:id', (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10)

    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' })
    }

    // Delete associated scores first (foreign key constraint)
    db.run('DELETE FROM scores WHERE event_id = ?', [eventId])

    // Then delete the event
    db.run('DELETE FROM events WHERE id = ?', [eventId])

    broadcast({ type: 'event_deleted', data: { id: eventId } })

    res.json({ success: true, id: eventId })
  } catch (error) {
    console.error('DELETE /events/:id error:', error)
    res.status(500).json({ error: 'Failed to delete event', details: String(error) })
  }
})

export { router as eventRoutes }
