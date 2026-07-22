import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import CoursePhoto from '../components/CoursePhoto'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'
import { SPLIT_LABELS } from '../lib/scoring'
import { quota, teamsForSplit } from '../lib/scoring'
import type { PairingSplit } from '../types'

export default function RoundHome() {
  const { roundId } = useParams()
  const idx = Number(roundId)
  const navigate = useNavigate()
  const { state, setPairing } = useStore()
  const { players, rounds } = state

  const round = rounds.find((r) => r.index === idx)
  const course = COURSES[idx]
  if (!round || !course) return <Navigate to="/" replace />

  const entered = round.gross.filter((h) => Object.keys(h).length > 0).length
  const resumeHole = Math.min(entered + 1, 18)

  const [t0, t1] = teamsForSplit(round.pairing)
  const teamName = (pair: [number, number]) => `${players[pair[0]].name} + ${players[pair[1]].name}`

  return (
    <>
      <TopBar title={course.day} back="/" />
      <div className="content">
        <CoursePhoto courseIndex={idx} courseName={course.name} />
        <h1 className="big-head">{course.name}</h1>
        <p className="subhead">{course.day} &middot; Par {course.par.reduce((a, b) => a + b, 0)}</p>

        <h2 className="section">Pairings (2 v 2)</h2>
        {round.locked ? (
          <p className="muted">Round is locked. Unlock in the summary to change pairings.</p>
        ) : (
          <div className="segmented" style={{ marginBottom: 12 }}>
            {SPLIT_LABELS.map((label, i) => (
              <button
                key={i}
                className={round.pairing === i ? 'active' : ''}
                onClick={() => setPairing(idx, i as PairingSplit)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-title">{teamName(t0)}</div>
          <div className="vs">VS</div>
          <div className="card-title">{teamName(t1)}</div>
        </div>

        <h2 className="section">Quotas This Round</h2>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="left">Player</th>
                <th>Hcp</th>
                <th>Quota</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td className="left">{p.name}</td>
                  <td>{p.handicap}</td>
                  <td className="pos">{quota(p.handicap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="spacer" />
        <button className="btn" onClick={() => navigate(`/round/${idx}/hole/${resumeHole}`)}>
          {entered === 0 ? 'Start Round' : round.locked ? 'View Scorecard' : `Resume — Hole ${resumeHole}`}
        </button>
        <div className="btn-row">
          <Link className="btn secondary small" to={`/round/${idx}/leaderboard`}>
            Live Leaderboard
          </Link>
          <Link className="btn secondary small" to={`/round/${idx}/summary`}>
            Round Summary
          </Link>
        </div>
      </div>
    </>
  )
}
