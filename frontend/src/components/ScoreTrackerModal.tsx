import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

interface ScoreTrackerModalProps {
  gameName: string
  gameId: number
  onClose: () => void
  onSubmit: (scores: Record<string, number>) => Promise<void>
  availablePlayers?: string[]
}

interface Player {
  name: string
  score: number
  editedBy?: string
  lastUpdated?: number
}

// Helper functions for localStorage-based session storage
export const getActiveSessions = (): Map<number, Player[]> => {
  try {
    const stored = localStorage.getItem('bgd_active_sessions')
    const data = stored ? JSON.parse(stored) : {}
    return new Map(Object.entries(data).map(([key, value]: [string, any]) => [parseInt(key), value]))
  } catch (e) {
    return new Map()
  }
}

export const saveActiveSessions = (sessions: Map<number, Player[]>) => {
  try {
    const data = Object.fromEntries(sessions.entries())
    localStorage.setItem('bgd_active_sessions', JSON.stringify(data))
    // Notify other tabs/windows
    window.dispatchEvent(new CustomEvent('activeSessions', { detail: sessions }))
  } catch (e) {
    console.error('Failed to save active sessions:', e)
  }
}

export function ScoreTrackerModal({ gameName, gameId, onClose, onSubmit, availablePlayers }: ScoreTrackerModalProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayerName, setCurrentPlayerName] = useState('')
  const [currentScore, setCurrentScore] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sessionId] = useState(() => `player_${Math.random().toString(36).substr(2, 9)}`)
  
  // Construct WebSocket URL dynamically (memoized to avoid recreating)
  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'ws://localhost:3000'
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host.replace(':5173', ':3000')
    return `${protocol}//${host}`
  }, [])
  
  const { isConnected, subscribe, send } = useWebSocket(wsUrl)
  const isFromLocalStorageRef = useRef(false)
  const hasSyncedRef = useRef(false)

  // Initialize with existing scores from localStorage
  useEffect(() => {
    const sessions = getActiveSessions()
    const existingScores = sessions.get(gameId) || []
    isFromLocalStorageRef.current = true
    setPlayers(existingScores)
    hasSyncedRef.current = false // Reset sync flag when game changes
  }, [gameId])

  // Subscribe to real-time score updates FIRST, then request sync
  useEffect(() => {
    const unsubscribeScores = subscribe(`score_update_${gameId}`, (data) => {
      console.log('Score update received:', data)
      setPlayers((prev) => {
        const existing = prev.find((p) => p.name === data.player_name)
        let updated: Player[]
        if (existing) {
          updated = prev.map((p) =>
            p.name === data.player_name
              ? { ...p, score: data.score, editedBy: data.editedBy, lastUpdated: Date.now() }
              : p
          )
        } else {
          updated = [...prev, { name: data.player_name, score: data.score, editedBy: data.editedBy }]
        }
        return updated
      })
    })

    // Subscribe to game state syncs (when another player requests it)
    const unsubscribeState = subscribe(`game_state_${gameId}`, (data) => {
      console.log('Game state received from server:', data)
      if (Array.isArray(data)) {
        setPlayers(data)
      }
    })

    // Now that subscriptions are set up, request the current game state if connected
    if (isConnected && !hasSyncedRef.current) {
      console.log('Subscribed to messages, now requesting game state sync for game', gameId)
      hasSyncedRef.current = true
      send({
        type: 'request_game_state',
        gameId,
      })
    }

    return () => {
      unsubscribeScores()
      unsubscribeState()
    }
  }, [gameId, isConnected, send])

  // Sync players state to localStorage after any change
  useEffect(() => {
    // Don't sync on initial load from localStorage
    if (isFromLocalStorageRef.current) {
      isFromLocalStorageRef.current = false
      return
    }
    
    const sessions = getActiveSessions()
    sessions.set(gameId, players)
    saveActiveSessions(sessions)
  }, [players, gameId])

  const addPlayer = () => {
    if (currentPlayerName.trim() && currentScore.trim()) {
      const newPlayer: Player = {
        name: currentPlayerName.trim(),
        score: parseInt(currentScore) || 0,
        editedBy: sessionId,
      }
      const updated = [...players, newPlayer]
      setPlayers(updated)

      // Broadcast to other players via WebSocket
      console.log('isConnected:', isConnected, 'Attempting to send score update')
      if (isConnected) {
        const sent = send({
          type: 'score_update',
          gameId,
          player_name: newPlayer.name,
          score: newPlayer.score,
          editedBy: sessionId,
        })
        console.log('Score update sent:', sent)
      } else {
        console.warn('Cannot send - WebSocket not connected')
      }

      setCurrentPlayerName('')
      setCurrentScore('')
    }
  }

  const updatePlayerScore = (index: number, newScore: number) => {
    setPlayers((prev) => {
      const updated = [...prev]
      const player = updated[index]
      player.score = newScore
      player.editedBy = sessionId
      player.lastUpdated = Date.now()

      // Broadcast update to other players via WebSocket
      console.log('isConnected:', isConnected, 'Attempting to send score update for', player.name)
      if (isConnected) {
        const sent = send({
          type: 'score_update',
          gameId,
          player_name: player.name,
          score: player.score,
          editedBy: sessionId,
        })
        console.log('Score update sent:', sent)
      } else {
        console.warn('Cannot send - WebSocket not connected')
      }

      return updated
    })
  }

  const removePlayer = (index: number) => {
    setPlayers((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      return updated
    })
  }

  const handleSubmit = async () => {
    if (players.length === 0) return

    setSubmitting(true)
    try {
      // Submit each player's score
      for (const player of players) {
        await onSubmit({ [player.name]: player.score })
      }
      // Clear session after submission
      const sessions = getActiveSessions()
      sessions.delete(gameId)
      saveActiveSessions(sessions)
      onClose()
    } catch (err) {
      console.error('Error submitting scores:', err)
      alert('Failed to submit scores')
    } finally {
      setSubmitting(false)
    }
  }

  const getEditIndicator = (player: Player) => {
    if (!player.editedBy || player.editedBy === sessionId) return ''
    return ' ✏️'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full border-4 border-pink-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-t-lg">
          <h2 className="text-2xl font-bold">📊 {gameName}</h2>
          <p className="text-sm opacity-90">
            {isConnected ? '🔴 Live Collaboration' : '⚫ Offline Mode'}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Current Players List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {players.length === 0 ? (
              <p className="text-rose-600 text-sm">Add players and their scores below</p>
            ) : (
              players.map((player, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition ${
                    player.editedBy !== sessionId
                      ? 'bg-blue-100 border-blue-300 animate-pulse'
                      : 'bg-pink-100 border-pink-300'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-bold text-pink-700">
                      {player.name}
                      {getEditIndicator(player)}
                    </div>
                    <div className="text-sm text-rose-600">Score: {player.score}</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updatePlayerScore(idx, player.score - 1)}
                      className="px-2 py-1 bg-rose-300 hover:bg-rose-400 text-white rounded font-bold"
                    >
                      −
                    </button>
                    <button
                      onClick={() => updatePlayerScore(idx, player.score + 1)}
                      className="px-2 py-1 bg-rose-300 hover:bg-rose-400 text-white rounded font-bold"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removePlayer(idx)}
                      className="px-2 py-1 bg-red-400 hover:bg-red-500 text-white rounded text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Player Section */}
          <div className="border-t-2 border-pink-200 pt-4 space-y-3">
            <h3 className="font-bold text-pink-600">Add Player</h3>
            {availablePlayers && availablePlayers.length > 0 ? (
              <select
                value={currentPlayerName}
                onChange={(e) => setCurrentPlayerName(e.target.value)}
                className="w-full px-3 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Select player or enter name below</option>
                {availablePlayers.map((player) => (
                  <option key={player} value={player}>
                    {player}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              type="text"
              placeholder="Player name"
              value={currentPlayerName}
              onChange={(e) => setCurrentPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addPlayer()
              }}
              className="w-full px-3 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <input
              type="number"
              placeholder="Score"
              value={currentScore}
              onChange={(e) => setCurrentScore(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addPlayer()
              }}
              className="w-full px-3 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              onClick={addPlayer}
              className="w-full bg-pink-300 hover:bg-pink-400 text-pink-800 font-bold py-2 rounded-lg transition"
            >
              Add Player
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-4 rounded-b-lg flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={players.length === 0 || submitting}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : `Submit (${players.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
