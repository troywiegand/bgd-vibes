import React from 'react'

interface NavigationProps {
  currentPage: 'event' | 'leaderboard' | 'admin'
  onPageChange: (page: 'event' | 'leaderboard' | 'admin') => void
  playerName: string
  events: any[]
  currentEventId: number
  onChangeEvent: (eventId: number) => void
  currentEvent: any | null
  onLogout: () => void
}

const colorMap: Record<string, { primary: string; secondary: string; text: string }> = {
  pink: { primary: '#ec4899', secondary: '#f43f5e', text: '#be123c' },
  red: { primary: '#dc2626', secondary: '#ef4444', text: '#991b1b' },
  blue: { primary: '#2563eb', secondary: '#06b6d4', text: '#1e40af' },
  green: { primary: '#16a34a', secondary: '#10b981', text: '#15803d' },
  purple: { primary: '#a855f7', secondary: '#8b5cf6', text: '#6d28d9' },
  indigo: { primary: '#4f46e5', secondary: '#6366f1', text: '#312e81' },
  orange: { primary: '#ea580c', secondary: '#f97316', text: '#7c2d12' },
  yellow: { primary: '#ca8a04', secondary: '#eab308', text: '#713f12' },
}

export function Navigation({ currentPage, onPageChange, playerName, events, currentEventId, onChangeEvent, currentEvent, onLogout }: NavigationProps) {
  const colorName = currentEvent?.primary_color || 'pink'
  const colors = colorMap[colorName] || colorMap.pink

  return (
    <nav style={{
      background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary}, ${colors.primary})`,
      borderBottomColor: colors.text
    }} className="text-white shadow-lg border-b-4">
      {/* Top row: Title + Event Selector */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex-shrink-0">💕 Board Game Day</h1>
        
        {/* Event Selector */}
        {events.length > 0 && (
          <select
            value={currentEventId}
            onChange={(e) => onChangeEvent(parseInt(e.target.value, 10))}
            className="px-3 py-2 rounded-lg text-gray-800 font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-white text-sm"
          >
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
        )}
        
        <span className="text-sm font-semibold flex-shrink-0 bg-white/20 px-3 py-1 rounded-lg">{playerName}</span>
        <button
          onClick={onLogout}
          className="text-sm font-semibold bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition flex-shrink-0"
          title="Logout"
        >
          🚪 Logout
        </button>
      </div>

      {/* Bottom row: Navigation buttons */}
      <div className="bg-white/10 px-4 py-2">
        <div className="max-w-7xl mx-auto flex gap-4 justify-center">
          <button
            onClick={() => onPageChange('event')}
            className={`px-4 py-2 rounded-lg transition font-semibold ${
              currentPage === 'event' ? 'bg-white shadow-lg' : 'hover:bg-white/20'
            }`}
            style={currentPage === 'event' ? { color: colors.text } : {}}
          >
            🎮 Games
          </button>
          <button
            onClick={() => onPageChange('leaderboard')}
            className={`px-4 py-2 rounded-lg transition font-semibold ${
              currentPage === 'leaderboard' ? 'bg-white shadow-lg' : 'hover:bg-white/20'
            }`}
            style={currentPage === 'leaderboard' ? { color: colors.text } : {}}
          >
            🏆 Leaderboard
          </button>
          <button
            onClick={() => onPageChange('admin')}
            className={`px-4 py-2 rounded-lg transition font-semibold ${
              currentPage === 'admin' ? 'bg-white shadow-lg' : 'hover:bg-white/20'
            }`}
            style={currentPage === 'admin' ? { color: colors.text } : {}}
          >
            ⚙️ Admin
          </button>
        </div>
      </div>
    </nav>
  )
}
