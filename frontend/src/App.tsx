import React, { useEffect, useState, useMemo } from 'react'
import './index.css'
import { useWebSocket } from './hooks/useWebSocket'
import { Navigation } from './components/Navigation'
import { EventPage } from './pages/EventPage'
import { AdminPage } from './pages/AdminPage'
import { LeaderboardPage } from './pages/LeaderboardPage'

type PageType = 'event' | 'leaderboard' | 'admin'

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('event')
  const [playerName, setPlayerName] = useState<string>('')
  const [showNameInput, setShowNameInput] = useState(!localStorage.getItem('playerName'))
  const [currentEventId, setCurrentEventId] = useState<number>(() => {
    const stored = localStorage.getItem('currentEventId')
    return stored ? parseInt(stored, 10) : 1
  })
  const [currentEvent, setCurrentEvent] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  
  // Dynamic WebSocket URL - works in any environment
  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'ws://localhost:3000'
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host.replace(':5173', ':3000')
    return `${protocol}//${host}`
  }, [])
  
  const { isConnected } = useWebSocket(wsUrl)

  // Fetch events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events')
        const data = await response.json()
        setEvents(data)
        
        // If we have events, find the active one or default to first
        if (data.length > 0) {
          const activeEvent = data.find((e: any) => e.status === 'active')
          const selectedEvent = activeEvent || data[0]
          setCurrentEvent(selectedEvent)
          setCurrentEventId(selectedEvent.id)
          localStorage.setItem('currentEventId', String(selectedEvent.id))
        }
      } catch (error) {
        console.error('Failed to fetch events:', error)
      }
    }

    fetchEvents()
  }, [])

  const handleChangeEvent = async (eventId: number) => {
    const event = events.find(e => e.id === eventId)
    if (event) {
      try {
        // Activate the event
        const response = await fetch(`/api/events/${eventId}/activate`, { method: 'PUT' })
        if (response.ok) {
          const updatedEvent = await response.json()
          setCurrentEvent(updatedEvent)
          setCurrentEventId(eventId)
          localStorage.setItem('currentEventId', String(eventId))
        }
      } catch (error) {
        console.error('Failed to activate event:', error)
      }
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('playerName')
    if (stored) {
      setPlayerName(stored)
      setShowNameInput(false)
    }
  }, [])

  const handleSetName = (name: string) => {
    setPlayerName(name)
    localStorage.setItem('playerName', name)
    setShowNameInput(false)
  }

  const handleLogout = () => {
    setPlayerName('')
    localStorage.removeItem('playerName')
    setShowNameInput(true)
  }

  if (showNameInput) {
    const eventPlayers = currentEvent?.player_list || []
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-400 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md border-4 border-pink-300">
          <h1 className="text-3xl font-bold text-pink-600 mb-6">💕 Board Game Day</h1>
          
          {eventPlayers.length > 0 ? (
            <>
              <p className="text-gray-700 font-semibold mb-4">Select your name:</p>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {eventPlayers.map((player: string) => (
                  <button
                    key={player}
                    onClick={() => handleSetName(player)}
                    className="px-4 py-3 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-semibold transition"
                  >
                    {player}
                  </button>
                ))}
              </div>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or enter your name</span>
                </div>
              </div>
            </>
          ) : null}
          
          <input
            type="text"
            placeholder="Enter your name"
            className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                handleSetName(e.currentTarget.value)
              }
            }}
            autoFocus
          />
          <button
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement
              if (input.value) {
                handleSetName(input.value)
              }
            }}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-600 transition"
          >
            Enter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-rose-50">
      <Navigation 
        currentPage={currentPage} 
        onPageChange={setCurrentPage} 
        playerName={playerName}
        events={events}
        currentEventId={currentEventId}
        onChangeEvent={handleChangeEvent}
        currentEvent={currentEvent}
        onLogout={handleLogout}
      />
      
      <div className="max-w-7xl mx-auto p-4">
        <div className={`mb-4 p-3 rounded-lg ${isConnected ? 'bg-pink-100 text-pink-700 border-2 border-pink-300' : 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'}`}>
          {isConnected ? '✓ Connected' : '⚠ Connecting...'}
        </div>

        {currentPage === 'event' && <EventPage playerName={playerName} eventId={currentEventId} currentEvent={currentEvent} />}
        {currentPage === 'leaderboard' && <LeaderboardPage eventId={currentEventId} />}
        {currentPage === 'admin' && <AdminPage events={events} currentEventId={currentEventId} currentEvent={currentEvent} />}
      </div>
    </div>
  )
}

export default App
