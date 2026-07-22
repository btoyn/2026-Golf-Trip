import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './lib/store'
import Setup from './pages/Setup'
import TripHub from './pages/TripHub'
import RoundHome from './pages/RoundHome'
import HoleEntry from './pages/HoleEntry'
import LiveLeaderboard from './pages/LiveLeaderboard'
import RoundSummary from './pages/RoundSummary'
import TripLeaderboard from './pages/TripLeaderboard'

export default function App() {
  const { hasPlayers } = useStore()

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={hasPlayers ? <TripHub /> : <Navigate to="/setup" replace />} />
        <Route path="/setup" element={<Setup />} />
        <Route
          path="/round/:roundId"
          element={hasPlayers ? <RoundHome /> : <Navigate to="/setup" replace />}
        />
        <Route
          path="/round/:roundId/hole/:holeNum"
          element={hasPlayers ? <HoleEntry /> : <Navigate to="/setup" replace />}
        />
        <Route
          path="/round/:roundId/leaderboard"
          element={hasPlayers ? <LiveLeaderboard /> : <Navigate to="/setup" replace />}
        />
        <Route
          path="/round/:roundId/summary"
          element={hasPlayers ? <RoundSummary /> : <Navigate to="/setup" replace />}
        />
        <Route
          path="/leaderboard"
          element={hasPlayers ? <TripLeaderboard /> : <Navigate to="/setup" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
