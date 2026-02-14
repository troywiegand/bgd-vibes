import React, { useState, useEffect } from 'react'

interface Score {
  id: number
  event_id: number
  game_id: number
  player_name: string
  score: number
  timestamp: string
}

interface Game {
  id: number
  name: string
}

interface LeaderboardPageProps {
  eventId: number
}

export function LeaderboardPage({ eventId }: LeaderboardPageProps) {
  const [scores, setScores] = useState<Score[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [eventId])

  const fetchData = async () => {
    try {
      const [scoresRes, gamesRes] = await Promise.all([
        fetch(`/api/scores?event_id=${eventId}`),
        fetch(`/api/games/event/${eventId}`),
      ])

      if (scoresRes.ok && gamesRes.ok) {
        const scoresData = await scoresRes.json()
        const gamesData = await gamesRes.json()
        setScores(scoresData)
        setGames(gamesData)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get best score per player per game
  const bestScoresPerPlayerGame = Array.from(
    scores.reduce((acc, score) => {
      const key = `${score.player_name}-${score.game_id}`
      const current = acc.get(key)
      if (!current || score.score > current.score) {
        acc.set(key, score)
      }
      return acc
    }, new Map()).values()
  )

  // Calculate overall rankings (placement points system)
  const playerPoints = new Map<string, { points: number; games: Set<number> }>()
  
  // For each game, calculate placements
  games.forEach((game) => {
    const gameScores = bestScoresPerPlayerGame
      .filter((s) => s.game_id === game.id)
      .sort((a, b) => b.score - a.score)
    
    const numPlayers = gameScores.length
    
    // Assign points based on placement in this game
    // Points scale with number of players: 1st gets numPlayers, 2nd gets (numPlayers-1), etc
    gameScores.forEach((score, index) => {
      const placement = index + 1
      const placementPoints = Math.max(0, numPlayers - placement + 1)
      
      const current = playerPoints.get(score.player_name) || { points: 0, games: new Set() }
      current.points += placementPoints
      current.games.add(game.id)
      playerPoints.set(score.player_name, current)
    })
  })

  // Convert to array for display
  const overallRankings = Array.from(playerPoints.entries())
    .map(([player_name, data]) => ({
      player_name,
      points: data.points,
      games: data.games.size
    }))
    .sort((a, b) => b.points - a.points)

  // Get per-game rankings
  const gameRankings = games.map((game) => {
    const gameScores = scores
      .filter((s) => s.game_id === game.id)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Top 5
    return { game, scores: gameScores }
  })

  if (loading) {
    return <div className="text-rose-600">Loading leaderboards...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-pink-600">🏆 Leaderboards</h2>

      {/* Overall Rankings */}
      <div className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg shadow-md p-6 border-2 border-pink-300">
        <h3 className="text-xl font-bold text-pink-700 mb-4">📊 Overall Rankings</h3>
        {overallRankings.length === 0 ? (
          <p className="text-rose-600">No scores yet. Start playing!</p>
        ) : (
          <div className="space-y-2">
            {overallRankings.map((ranking, idx) => (
              <div key={ranking.player_name} className="flex items-center gap-3 p-3 bg-white rounded-lg border-l-4 border-pink-500">
                <div className="text-2xl font-bold text-pink-600 w-8">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-pink-700">{ranking.player_name}</div>
                  <div className="text-sm text-rose-600">{ranking.games} game{ranking.games !== 1 ? 's' : ''}</div>
                </div>
                <div className="text-2xl font-bold text-rose-500">{ranking.points} pts</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-Game Rankings */}
      <div className="space-y-4">
        {gameRankings.map(({ game, scores: gameScores }) => (
          <div key={game.id} className="bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg shadow-md p-6 border-2 border-pink-300">
            <h3 className="text-lg font-bold text-pink-700 mb-3">{game.name}</h3>
            {gameScores.length === 0 ? (
              <p className="text-rose-600 text-sm">No scores yet</p>
            ) : (
              <div className="space-y-2">
                {gameScores.map((score, idx) => (
                  <div key={score.id} className="flex items-center gap-3 p-2 bg-white rounded border-l-4 border-rose-500">
                    <div className="text-lg font-bold text-rose-500 w-6">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </div>
                    <div className="flex-1 font-semibold text-pink-700">{score.player_name}</div>
                    <div className="font-bold text-rose-600">{score.score}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
