import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ScoreTrackerModal, getActiveSessions, saveActiveSessions } from '../components/ScoreTrackerModal'
import { useWebSocket } from '../hooks/useWebSocket'

interface EventPageProps {
  playerName: string
  eventId: number
  currentEvent?: { id: number; name: string; category_list: string[]; player_list?: string[] } | null
}

export function EventPage({ playerName, eventId, currentEvent }: EventPageProps) {
  const [games, setGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState<any | null>(null)
  const [activeSessionGameIds, setActiveSessionGameIds] = useState<number[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  
  // Dynamic WebSocket URL - works in any environment
  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'ws://localhost:3000'
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host.replace(':5173', ':3000')
    return `${protocol}//${host}`
  }, [])
  
  const { isConnected, subscribe } = useWebSocket(wsUrl)

  // Group games by category
  const gamesByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    games.forEach((game) => {
      const category = game.category || 'Uncategorized'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(game)
    })
    return grouped
  }, [games])

  // Get sorted categories (respect event's category order if available)
  const sortedCategories = useMemo(() => {
    const allCats = Object.keys(gamesByCategory)
    
    // If the event specifies a category order, use it
    if (currentEvent?.category_list && currentEvent.category_list.length > 0) {
      return allCats.sort((a, b) => {
        const indexA = currentEvent.category_list.indexOf(a)
        const indexB = currentEvent.category_list.indexOf(b)
        // If both are in the list, use the event's order
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB
        }
        // If only one is in the list, it comes first
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        // Otherwise, sort alphabetically
        return a.localeCompare(b)
      })
    }

    // Fallback: sort by Round numbers or alphabetically
    return allCats.sort((a, b) => {
      const aMatch = a.match(/Round (\d+)/)
      const bMatch = b.match(/Round (\d+)/)
      if (aMatch && bMatch) {
        return parseInt(aMatch[1]) - parseInt(bMatch[1])
      }
      return a.localeCompare(b)
    })
  }, [gamesByCategory, currentEvent?.category_list])

  useEffect(() => {
    fetchGames()
    
    // Setup WebSocket reference for broadcasting using the hook's connection
    // We don't need a separate WebSocket - the modal's useWebSocket will handle it
    // This useEffect is mainly for tracking active sessions

    // Listen for storage changes from other tabs
    const handleStorageChange = () => {
      const sessions = getActiveSessions()
      setActiveSessionGameIds(Array.from(sessions.keys()))
    }

    // Listen for custom event from ScoreTrackerModal
    const handleSessionUpdate = () => {
      const sessions = getActiveSessions()
      setActiveSessionGameIds(Array.from(sessions.keys()))
    }

    // Listen for storage events (other tabs)
    window.addEventListener('storage', handleStorageChange)
    // Listen for custom events (same tab)
    window.addEventListener('activeSessions', handleSessionUpdate)

    // Initial load
    const sessions = getActiveSessions()
    setActiveSessionGameIds(Array.from(sessions.keys()))

    // Periodic check as backup
    const checkActiveSessions = setInterval(() => {
      const sessions = getActiveSessions()
      setActiveSessionGameIds(Array.from(sessions.keys()))
    }, 500)

    return () => {
      clearInterval(checkActiveSessions)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('activeSessions', handleSessionUpdate)
    }
  }, [isConnected, eventId])

  const fetchGames = async () => {
    try {
      const res = await fetch(`/api/games/event/${eventId}`)
      if (res.ok) {
        const data = await res.json()
        setGames(data)
      }
    } catch (err) {
      console.error('Failed to fetch games:', err)
    } finally {
      setLoading(false)
    }
  }

  // Listen for broadcast events from the modal and forward to WebSocket
  useEffect(() => {
    const handleBroadcast = (event: Event) => {
      const customEvent = event as CustomEvent
      // Note: The ScoreTrackerModal already has its own WebSocket connection
      // via the useWebSocket hook, so it will broadcast directly.
      // This is just here for reference - the actual broadcasting happens
      // in the modal's useEffect when it sends via the subscribe function
      console.log('EventPage received broadcast:', customEvent.detail)
    }

    window.addEventListener('broadcastScore', handleBroadcast)
    return () => window.removeEventListener('broadcastScore', handleBroadcast)
  }, [])

  const handleScoreSubmit = async (scores: Record<string, number>) => {
    // For now, just submit the first score. We'll need event_id from context
    const playerName = Object.keys(scores)[0]
    const score = scores[playerName]

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: 1, // TODO: Get active event from context
          game_id: selectedGame.id,
          player_name: playerName,
          score: score,
        }),
      })

      if (res.ok) {
        console.log('Score submitted!')
      } else {
        console.error('Failed to submit score')
      }
    } catch (err) {
      console.error('Error submitting score:', err)
      throw err
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-pink-600">🎮 Active Games</h2>
      <p className="text-rose-600 font-semibold">Playing as: {playerName}</p>

      {/* Active Score Sessions */}
      {activeSessionGameIds.length > 0 && (
        <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg shadow-md p-6 border-2 border-orange-400">
          <h3 className="text-xl font-bold text-orange-700 mb-4">🔥 Active Score Submissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSessionGameIds.map((gameId) => {
              const game = games.find((g) => g.id === gameId)
              const sessions = getActiveSessions()
              const players = sessions.get(gameId) || []
              return (
                <button
                  key={gameId}
                  onClick={() => {
                    const g = games.find((g) => g.id === gameId)
                    setSelectedGame(g)
                  }}
                  className="bg-white rounded-lg p-4 border-2 border-orange-400 hover:shadow-lg transition text-left"
                >
                  <div className="font-bold text-orange-700 mb-2">{game?.name}</div>
                  <div className="text-sm text-orange-600 mb-2">
                    {players.length} player{players.length !== 1 ? 's' : ''} scoring
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {players.map((player: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{player.name}</span>
                        <span className="font-bold text-orange-600">{player.score}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-white bg-gradient-to-r from-orange-500 to-amber-500 py-1 px-2 rounded text-center text-sm font-semibold">
                    Join Session
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
      
      <h3 className="text-2xl font-bold text-pink-600">All Games</h3>
      
      {loading ? (
        <div className="text-rose-600">Loading games...</div>
      ) : games.length === 0 ? (
        <div className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg shadow-md p-6 border-2 border-pink-300">
          <p className="text-rose-600">No games yet. Go to <strong>Admin</strong> to add some! 🎲</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedCategories.map((category) => (
            <div key={category} className="border-2 border-pink-300 rounded-lg overflow-hidden">
              {/* Category Header - Collapsible */}
              <button
                onClick={() => {
                  const newExpanded = new Set(expandedCategories)
                  if (newExpanded.has(category)) {
                    newExpanded.delete(category)
                  } else {
                    newExpanded.add(category)
                  }
                  setExpandedCategories(newExpanded)
                }}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white py-3 px-4 flex items-center justify-between transition font-semibold text-lg"
              >
                <span>{category}</span>
                <span className="text-xl">
                  {expandedCategories.has(category) ? '▼' : '▶'}
                </span>
              </button>

              {/* Games Grid - Only show if expanded */}
              {expandedCategories.has(category) && (
                <div className="p-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gamesByCategory[category].map((game) => (
                      <div
                        key={game.id}
                        className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg shadow-md p-6 border-2 border-pink-300 hover:shadow-lg transition flex flex-col"
                      >
                        <h3 className="text-xl font-bold text-pink-700 mb-2">{game.name}</h3>
                        {game.description && (
                          <p className="text-rose-600 text-sm mb-3">{game.description}</p>
                        )}
                        
                        {/* Player Count */}
                        {game.player_count_min && game.player_count_max && (
                          <div className="mb-3 p-2 bg-white rounded border border-pink-200">
                            <span className="text-xs font-semibold text-pink-600">👥 Players: </span>
                            <span className="text-sm text-pink-700">{game.player_count_min}–{game.player_count_max}</span>
                          </div>
                        )}

                        {/* Links */}
                        <div className="space-y-2 mb-4">
                          {game.bgg_url && (
                            <a
                              href={game.bgg_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-3 py-1 text-center text-xs bg-white text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition font-semibold"
                            >
                              🎲 BoardGameGeek
                            </a>
                          )}
                          {game.how_to_play_url && (
                            <a
                              href={game.how_to_play_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-3 py-1 text-center text-xs bg-white text-red-600 border border-red-300 rounded hover:bg-red-50 transition font-semibold"
                            >
                              ▶️ How to Play
                            </a>
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedGame(game)}
                          className="w-full mt-auto bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-600 transition"
                        >
                          Submit Scores
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Score Tracker Modal */}
      {selectedGame && (
        <ScoreTrackerModal
          gameName={selectedGame.name}
          gameId={selectedGame.id}
          onClose={() => setSelectedGame(null)}
          onSubmit={handleScoreSubmit}
          availablePlayers={currentEvent?.player_list}
        />
      )}
    </div>
  )
}
