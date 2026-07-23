import { Navigate, Route, Routes } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Instructions from './pages/Instructions'
import Sync from './pages/Sync'
import Setup from './pages/Setup'
import RoundHome from './pages/RoundHome'
import HoleEntry from './pages/HoleEntry'
import LiveLeaderboard from './pages/LiveLeaderboard'
import RoundSummary from './pages/RoundSummary'
import TripLeaderboard from './pages/TripLeaderboard'

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/instructions" element={<Instructions />} />
        <Route path="/sync" element={<Sync />} />
        <Route path="/round/:roundId" element={<RoundHome />} />
        <Route path="/round/:roundId/hole/:holeNum" element={<HoleEntry />} />
        <Route path="/round/:roundId/leaderboard" element={<LiveLeaderboard />} />
        <Route path="/round/:roundId/summary" element={<RoundSummary />} />
        <Route path="/leaderboard" element={<TripLeaderboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
