import React, { useState, useEffect } from 'react'

interface AdminPageProps {
  events: any[]
  currentEventId: number
  currentEvent?: { id: number; name: string; player_list: string[] } | null
}

export function AdminPage({ events, currentEventId, currentEvent }: AdminPageProps) {
  const [gameForm, setGameForm] = useState({
    name: '',
    description: '',
    category: '',
    bgg_url: '',
    how_to_play_url: '',
    player_count_min: '',
    player_count_max: '',
  })
  const [eventForm, setEventForm] = useState({
    name: '',
    primary_color: 'pink',
    secondary_color: 'rose',
    category_list: [] as string[],
    player_list: [] as string[],
  })
  const [games, setGames] = useState<any[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [editingEventId, setEditingEventId] = useState<number | null>(null)

  // Fetch games and scores on mount
  useEffect(() => {
    fetchGames()
    fetchScores()
    fetchAllCategories()
  }, [currentEventId])

  const fetchAllCategories = async () => {
    try {
      const res = await fetch('/api/games')
      if (res.ok) {
        const data = await res.json()
        const unique = Array.from(new Set(data.map((g: any) => g.category).filter(Boolean)))
        setAllCategories(unique as string[])
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  const fetchGames = async () => {
    try {
      const res = await fetch(`/api/games/event/${currentEventId}`)
      if (res.ok) {
        const data = await res.json()
        setGames(data)
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(data.map((g: any) => g.category || 'Uncategorized')))
        setCategories(uniqueCategories as string[])
      }
    } catch (err) {
      console.error('Failed to fetch games:', err)
    }
  }

  const fetchScores = async () => {
    try {
      const res = await fetch(`/api/scores?event_id=${currentEventId}`)
      if (res.ok) {
        const data = await res.json()
        setScores(data)
      }
    } catch (err) {
      console.error('Failed to fetch scores:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/games/${editingId}` : '/api/games'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameForm),
      })

      if (res.ok) {
        const responseGame = await res.json()
        
        if (editingId) {
          // Update existing game
          setGames(games.map((g) => (g.id === editingId ? responseGame : g)))
          setSuccess(`✓ "${responseGame.name}" updated successfully!`)
          setEditingId(null)
        } else {
          // Add new game
          setGames([...games, responseGame])
          setSuccess(`✓ "${responseGame.name}" added successfully!`)
        }
        
        setGameForm({
          name: '',
          description: '',
          category: '',
          bgg_url: '',
          how_to_play_url: '',
          player_count_min: '',
          player_count_max: '',
        })
        setTimeout(() => setSuccess(''), 3000)
        
        // Refresh categories
        fetchGames()
      } else {
        setError(editingId ? 'Failed to update game.' : 'Failed to add game. Try a different name.')
      }
    } catch (err) {
      setError('Error saving game. Check console.')
      console.error('Submit error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditGame = (game: any) => {
    setGameForm({
      name: game.name,
      description: game.description || '',
      category: game.category || '',
      bgg_url: game.bgg_url || '',
      how_to_play_url: game.how_to_play_url || '',
      player_count_min: game.player_count_min?.toString() || '',
      player_count_max: game.player_count_max?.toString() || '',
    })
    setEditingId(game.id)
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setGameForm({
      name: '',
      description: '',
      category: '',
      bgg_url: '',
      how_to_play_url: '',
      player_count_min: '',
      player_count_max: '',
    })
    setError('')
  }

  const handleDeleteScore = async (scoreId: number) => {
    if (!confirm('Are you sure you want to delete this score submission?')) return

    setDeleteLoading(scoreId)
    try {
      const res = await fetch(`/api/scores/${scoreId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setScores(scores.filter((s) => s.id !== scoreId))
        setSuccess('Score deleted successfully!')
        setTimeout(() => setSuccess(''), 2000)
      } else {
        setError('Failed to delete score')
      }
    } catch (err) {
      console.error('Error deleting score:', err)
      setError('Error deleting score. Check console.')
    } finally {
      setDeleteLoading(null)
    }
  }

  const getGameName = (gameId: number) => {
    return games.find((g) => g.id === gameId)?.name || `Game #${gameId}`
  }

  const handleEditEvent = (event: any) => {
    setEventForm({
      name: event.name,
      primary_color: event.primary_color,
      secondary_color: event.secondary_color,
      category_list: event.category_list || [],
      player_list: event.player_list || [],
    })
    setEditingEventId(event.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEventEdit = () => {
    setEditingEventId(null)
    setEventForm({
      name: '',
      primary_color: 'pink',
      secondary_color: 'rose',
      category_list: [],
      player_list: [],
    })
    setError('')
  }

  const handleSaveEvent = async () => {
    if (!eventForm.name.trim()) {
      setError('Event name is required')
      return
    }

    try {
      const method = editingEventId ? 'PUT' : 'POST'
      const url = editingEventId ? `/api/events/${editingEventId}` : '/api/events'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      })

      if (res.ok) {
        setSuccess(`Event ${editingEventId ? 'updated' : 'created'} successfully!`)
        setEventForm({
          name: '',
          primary_color: 'pink',
          secondary_color: 'rose',
          category_list: [],
          player_list: [],
        })
        setEditingEventId(null)
        setTimeout(() => {
          setSuccess('')
          window.location.reload()
        }, 1500)
      } else {
        setError(`Failed to ${editingEventId ? 'update' : 'create'} event`)
      }
    } catch (err) {
      setError(`Failed to ${editingEventId ? 'update' : 'create'} event: ${err}`)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-pink-600">⚙️ Admin Panel</h2>
      
      {/* Event Management */}
      <div className="bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg shadow-md p-6 border-2 border-purple-300">
        <h3 className="text-xl font-bold text-purple-700 mb-4">📅 Event Management</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-purple-700 mb-2">Event Name</label>
              <input
                type="text"
                placeholder="Event name"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-purple-700 mb-2">Categories for this Event</label>
              <div className="flex gap-2">
                <select
                  multiple
                  value={eventForm.category_list}
                  onChange={(e) => setEventForm({ 
                    ...eventForm, 
                    category_list: Array.from(e.target.selectedOptions, option => option.value) 
                  })}
                  className="flex-1 px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  size={4}
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-purple-600 mt-1">Hold Cmd/Ctrl to select multiple categories</p>

              {/* Category Order */}
              {eventForm.category_list.length > 0 && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-purple-700 mb-2">Category Order:</p>
                  <div className="space-y-1">
                    {eventForm.category_list.map((cat, idx) => (
                      <div key={cat} className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-purple-200">
                        <span className="text-sm font-medium text-purple-700">{idx + 1}. {cat}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              if (idx > 0) {
                                const newList = [...eventForm.category_list]
                                const temp = newList[idx]
                                newList[idx] = newList[idx - 1]
                                newList[idx - 1] = temp
                                setEventForm({ ...eventForm, category_list: newList })
                              }
                            }}
                            disabled={idx === 0}
                            className="px-2 py-1 bg-blue-300 hover:bg-blue-400 disabled:bg-gray-200 text-blue-800 disabled:text-gray-500 rounded text-xs font-semibold transition"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => {
                              if (idx < eventForm.category_list.length - 1) {
                                const newList = [...eventForm.category_list]
                                const temp = newList[idx]
                                newList[idx] = newList[idx + 1]
                                newList[idx + 1] = temp
                                setEventForm({ ...eventForm, category_list: newList })
                              }
                            }}
                            disabled={idx === eventForm.category_list.length - 1}
                            className="px-2 py-1 bg-blue-300 hover:bg-blue-400 disabled:bg-gray-200 text-blue-800 disabled:text-gray-500 rounded text-xs font-semibold transition"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => {
                              setEventForm({
                                ...eventForm,
                                category_list: eventForm.category_list.filter((_, i) => i !== idx)
                              })
                            }}
                            className="px-2 py-1 bg-red-300 hover:bg-red-400 text-red-800 rounded text-xs font-semibold transition"
                            title="Remove category"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-purple-700 mb-2">Players for this Event</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  id="newPlayerInput"
                  placeholder="Enter player name"
                  className="flex-1 px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('newPlayerInput') as HTMLInputElement
                    if (input && input.value.trim()) {
                      const newPlayer = input.value.trim()
                      if (!eventForm.player_list.includes(newPlayer)) {
                        setEventForm({
                          ...eventForm,
                          player_list: [...eventForm.player_list, newPlayer]
                        })
                        input.value = ''
                      }
                    }
                  }}
                  className="px-4 py-2 bg-purple-400 hover:bg-purple-500 text-white rounded-lg font-semibold transition"
                >
                  Add
                </button>
              </div>
              
              {/* Player List */}
              {eventForm.player_list.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-purple-700 mb-2">Players:</p>
                  <div className="flex flex-wrap gap-2">
                    {eventForm.player_list.map((player) => (
                      <div
                        key={player}
                        className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-purple-300"
                      >
                        <span className="text-sm font-medium text-purple-700">{player}</span>
                        <button
                          onClick={() => {
                            setEventForm({
                              ...eventForm,
                              player_list: eventForm.player_list.filter((p) => p !== player)
                            })
                          }}
                          className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
                          title="Remove player"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-purple-700 mb-2">Primary Color</label>
              <select
                value={eventForm.primary_color}
                onChange={(e) => setEventForm({ ...eventForm, primary_color: e.target.value })}
                className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="pink">Pink</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
                <option value="indigo">Indigo</option>
                <option value="orange">Orange</option>
                <option value="yellow">Yellow</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-purple-700 mb-2">Secondary Color</label>
              <select
                value={eventForm.secondary_color}
                onChange={(e) => setEventForm({ ...eventForm, secondary_color: e.target.value })}
                className="w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="rose">Rose</option>
                <option value="pink">Pink</option>
                <option value="amber">Amber</option>
                <option value="cyan">Cyan</option>
                <option value="violet">Violet</option>
                <option value="emerald">Emerald</option>
                <option value="sky">Sky</option>
                <option value="fuchsia">Fuchsia</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveEvent}
              className={`flex-1 px-4 py-2 text-white rounded-lg font-semibold transition ${
                editingEventId
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                  : 'bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600'
              }`}
            >
              {editingEventId ? '💾 Update Event' : '➕ Create Event'}
            </button>
            {editingEventId && (
              <button
                onClick={handleCancelEventEdit}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Existing Events List */}
          {events.length > 0 && (
            <div className="mt-6 pt-6 border-t-2 border-purple-300">
              <h4 className="text-lg font-bold text-purple-700 mb-3">Existing Events</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {events.map((event) => (
                  <div key={event.id} className={`p-3 rounded border-l-4 ${event.status === 'active' ? 'bg-green-100 border-l-green-600' : 'bg-white border-l-gray-300'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-bold text-purple-700">{event.name}</div>
                        {event.status === 'active' && (
                          <div className="text-xs font-semibold text-green-700 mt-1">🟢 Active Event</div>
                        )}
                        <div className="text-xs text-purple-600">
                          🎨 {event.primary_color} / {event.secondary_color}
                        </div>
                        {event.category_list?.length > 0 && (
                          <div className="text-xs text-purple-600 mt-1">
                            📁 {event.category_list.join(', ')}
                          </div>
                        )}
                        {event.player_list?.length > 0 && (
                          <div className="text-xs text-purple-600 mt-1">
                            👥 {event.player_list.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-2 flex-wrap justify-end">
                        {event.status === 'active' && (
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/events/${event.id}/deactivate`, { method: 'PUT' })
                                setSuccess(`Event "${event.name}" is now inactive!`)
                                setTimeout(() => window.location.reload(), 1500)
                              } catch (err) {
                                setError(`Failed to deactivate event: ${err}`)
                              }
                            }}
                            className="px-2 py-1 bg-orange-300 hover:bg-orange-400 text-orange-800 rounded text-xs font-semibold transition"
                            title="Deactivate event"
                          >
                            ◯ Deactivate
                          </button>
                        )}
                        {event.status !== 'active' && (
                          <button
                            onClick={async () => {
                              try {
                                await fetch(`/api/events/${event.id}/activate`, { method: 'PUT' })
                                setSuccess(`Event "${event.name}" is now active!`)
                                setTimeout(() => window.location.reload(), 1500)
                              } catch (err) {
                                setError(`Failed to activate event: ${err}`)
                              }
                            }}
                            className="px-2 py-1 bg-green-300 hover:bg-green-400 text-green-800 rounded text-xs font-semibold transition"
                            title="Activate event"
                          >
                            ✓ Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="px-2 py-1 bg-blue-300 hover:bg-blue-400 text-blue-800 rounded text-xs font-semibold transition"
                          title="Edit event"
                        >
                          ✏️
                        </button>
                        {event.status !== 'active' && (
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Delete "${event.name}"? This cannot be undone.`)) return
                              try {
                                await fetch(`/api/events/${event.id}`, { method: 'DELETE' })
                                setSuccess('Event deleted successfully!')
                                setTimeout(() => window.location.reload(), 1500)
                              } catch (err) {
                                setError(`Failed to delete event: ${err}`)
                              }
                            }}
                            className="px-2 py-1 bg-red-300 hover:bg-red-400 text-red-800 rounded text-xs font-semibold transition"
                            title="Delete event"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Add/Edit Game Form */}
        <div className={`rounded-lg shadow-md p-6 border-2 ${editingId ? 'bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-300' : 'bg-gradient-to-br from-pink-100 to-rose-100 border-pink-300'}`}>
          <h3 className={`text-xl font-bold mb-4 ${editingId ? 'text-amber-700' : 'text-pink-700'}`}>
            {editingId ? '✏️ Edit Game' : '➕ Add Game'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Game name"
              value={gameForm.name}
              onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })}
              disabled={editingId !== null && true}
              className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={gameForm.description}
              onChange={(e) => setGameForm({ ...gameForm, description: e.target.value })}
              className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              rows={3}
            />
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-pink-700">Category</label>
              <select
                value={gameForm.category}
                onChange={(e) => setGameForm({ ...gameForm, category: e.target.value })}
                className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Select or type category...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or create new category"
                value={gameForm.category}
                onChange={(e) => setGameForm({ ...gameForm, category: e.target.value })}
                className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
              />
            </div>
            <input
              type="url"
              placeholder="BoardGameGeek URL (optional)"
              value={gameForm.bgg_url}
              onChange={(e) => setGameForm({ ...gameForm, bgg_url: e.target.value })}
              className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
            />
            <input
              type="url"
              placeholder="How to Play YouTube URL (optional)"
              value={gameForm.how_to_play_url}
              onChange={(e) => setGameForm({ ...gameForm, how_to_play_url: e.target.value })}
              className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min players"
                value={gameForm.player_count_min}
                onChange={(e) => setGameForm({ ...gameForm, player_count_min: e.target.value })}
                className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                min="1"
              />
              <input
                type="number"
                placeholder="Max players"
                value={gameForm.player_count_max}
                onChange={(e) => setGameForm({ ...gameForm, player_count_max: e.target.value })}
                className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full text-white py-2 rounded-lg font-semibold transition disabled:opacity-50 ${
                  editingId
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600'
                    : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600'
                }`}
              >
                {loading ? (editingId ? 'Updating...' : 'Adding...') : editingId ? 'Update Game' : 'Add Game'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {error && <div className="mt-4 p-3 bg-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {success && <div className="mt-4 p-3 bg-green-200 text-green-700 rounded-lg text-sm">{success}</div>}
        </div>

        {/* Games List */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg shadow-md p-6 border-2 border-pink-300">
            <h3 className="text-xl font-bold text-pink-700 mb-4">Games ({games.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {games.length === 0 ? (
                <p className="text-rose-600">No games added yet. Add one to get started!</p>
              ) : (
                games.map((game) => (
                  <div key={game.id} className="bg-white rounded p-3 border-l-4 border-pink-500 text-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-bold text-pink-700">{game.name}</div>
                        {game.category && (
                          <div className="inline-block mt-1 px-2 py-1 bg-pink-200 text-pink-700 rounded text-xs font-semibold">
                            📁 {game.category}
                          </div>
                        )}
                        {game.description && <div className="text-xs text-rose-600 mt-2">{game.description}</div>}
                        {game.player_count_min && game.player_count_max && (
                          <div className="text-xs text-gray-600 mt-1">👥 {game.player_count_min}–{game.player_count_max} players</div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-2">
                        <button
                          onClick={() => handleEditGame(game)}
                          className="px-3 py-1 bg-blue-300 hover:bg-blue-400 text-blue-800 rounded text-xs font-semibold transition"
                          title="Edit game"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Delete "${game.name}"?`)) return
                            try {
                              await fetch(`/api/games/${game.id}`, { method: 'DELETE' })
                              setGames(games.filter(g => g.id !== game.id))
                              setSuccess(`Game deleted successfully!`)
                              setTimeout(() => setSuccess(''), 3000)
                            } catch (err) {
                              setError(`Failed to delete game: ${err}`)
                            }
                          }}
                          className="px-3 py-1 bg-red-300 hover:bg-red-400 text-red-800 rounded text-xs font-semibold transition"
                          title="Delete game"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Score Submissions */}
      <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg shadow-md p-6 border-2 border-blue-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-blue-700">Score Submissions ({scores.length})</h3>
          <button
            onClick={fetchScores}
            className="px-3 py-1 bg-blue-300 hover:bg-blue-400 text-blue-800 rounded text-sm font-semibold transition"
          >
            Refresh
          </button>
        </div>

        {scores.length === 0 ? (
          <p className="text-blue-600">No score submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-blue-300">
                  <th className="text-left py-2 px-3 font-bold text-blue-700">Player</th>
                  <th className="text-left py-2 px-3 font-bold text-blue-700">Game</th>
                  <th className="text-right py-2 px-3 font-bold text-blue-700">Score</th>
                  <th className="text-left py-2 px-3 font-bold text-blue-700">Date</th>
                  <th className="text-center py-2 px-3 font-bold text-blue-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200">
                {scores.map((score) => (
                  <tr key={score.id} className="hover:bg-blue-50 transition">
                    <td className="py-3 px-3 text-gray-800">{score.player_name}</td>
                    <td className="py-3 px-3 text-gray-800">{getGameName(score.game_id)}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-700">{score.score}</td>
                    <td className="py-3 px-3 text-gray-600 text-xs">
                      {new Date(score.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleDeleteScore(score.id)}
                        disabled={deleteLoading === score.id}
                        className="px-3 py-1 bg-red-400 hover:bg-red-500 text-white rounded text-xs font-semibold transition disabled:opacity-50"
                      >
                        {deleteLoading === score.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
