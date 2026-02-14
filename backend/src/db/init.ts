import { Database } from 'bun:sqlite'
import { mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

const dbPath = process.env.DATABASE_PATH || './data/bgd.db'

// Ensure data directory exists
mkdirSync('./data', { recursive: true })

const db = new Database(dbPath)

export function initializeDatabase() {
  // Games table
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT,
      category TEXT DEFAULT 'Uncategorized',
      bgg_url TEXT,
      how_to_play_url TEXT,
      player_count_min INTEGER,
      player_count_max INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Add missing columns if they don't exist (migration)
  try {
    db.run(`ALTER TABLE games ADD COLUMN category TEXT DEFAULT 'Uncategorized'`)
  } catch (e) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE games ADD COLUMN bgg_url TEXT`)
  } catch (e) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE games ADD COLUMN how_to_play_url TEXT`)
  } catch (e) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE games ADD COLUMN player_count_min INTEGER`)
  } catch (e) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE games ADD COLUMN player_count_max INTEGER`)
  } catch (e) {
    // Column already exists, ignore error
  }

  // Events table
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      primary_color TEXT DEFAULT 'pink',
      secondary_color TEXT DEFAULT 'rose',
      category_list TEXT DEFAULT '[]',
      player_list TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Add missing columns to events table if they don't exist (migration)
  try {
    db.run(`ALTER TABLE events ADD COLUMN primary_color TEXT DEFAULT 'pink'`)
  } catch (e) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE events ADD COLUMN secondary_color TEXT DEFAULT 'rose'`)
  } catch (e) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE events ADD COLUMN category_list TEXT DEFAULT '[]'`)
  } catch (e) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE events ADD COLUMN player_list TEXT DEFAULT '[]'`)
  } catch (e) {
    // Column already exists, ignore error
  }

  // Scores table
  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      score REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (game_id) REFERENCES games(id)
    )
  `)

  // Seed games from JSON file if table is empty
  seedGamesFromJSON()

  console.log('Database initialized')
}

function seedGamesFromJSON() {
  try {
    // Check if games table has data
    const gameCount = db.query('SELECT COUNT(*) as count FROM games').get() as any
    if (gameCount.count > 0) {
      console.log(`Database already has ${gameCount.count} games. Skipping seed.`)
      return
    }

    // Read games.json file
    const gamesPath = join(process.cwd(), 'data', 'games.json')
    if (!existsSync(gamesPath)) {
      console.log('No games.json file found. Skipping seed.')
      return
    }

    const gamesJSON = readFileSync(gamesPath, 'utf-8')
    const games = JSON.parse(gamesJSON)

    // Insert games into database
    for (const game of games) {
      try {
        db.run(
          'INSERT INTO games (name, description, category, bgg_url, how_to_play_url, player_count_min, player_count_max) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [game.name, game.description, game.category || 'Uncategorized', game.bgg_url, game.how_to_play_url, game.player_count_min, game.player_count_max]
        )
      } catch (err) {
        console.warn(`Failed to insert game "${game.name}":`, (err as any).message)
      }
    }

    console.log(`Seeded ${games.length} games from games.json`)
  } catch (err) {
    console.error('Error seeding games:', err)
  }

  // Seed default event if none exist
  seedDefaultEvent()
}

function seedDefaultEvent() {
  try {
    const eventCount = db.query('SELECT COUNT(*) as count FROM events').get() as any
    if (eventCount.count > 0) {
      return
    }

    // Create default event with all categories
    const categoryList = ['Round 1', 'Round 2', 'Round 3', 'Round 4']
    const stmt = db.prepare(
      'INSERT INTO events (name, primary_color, secondary_color, category_list, status) VALUES (?, ?, ?, ?, ?)'
    )
    stmt.run('Board Game Night', 'pink', 'rose', JSON.stringify(categoryList), 'active')
    console.log('Created default event: Board Game Night')
  } catch (err) {
    console.error('Error seeding default event:', err)
  }
}

export function getDatabase(): Database {
  return db
}
