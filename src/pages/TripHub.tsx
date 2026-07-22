import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useStore } from '../lib/store'
import { COURSES, SPLIT_LABELS_FROM } from '../lib/labels'
import { quota } from '../lib/scoring'

function roundHolesEntered(gross: Record<string, number>[]): number {
  return gross.filter((h) => Object.keys(h).length > 0).length
}

export default function TripHub() {
  const { state } = useStore()
  const { players, rounds } = state

  return (
    <>
      <TopBar title="2026 Golf Trip" />
      <div className="content">
        <h2 className="section">Players &amp; Quotas</h2>
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
              {players.map((p, i) => (
                <tr key={p.id}>
                  <td className="left">
                    <b>{'ABCD'[i]}</b> &nbsp;{p.name}
                  </td>
                  <td>{p.handicap}</td>
                  <td className="pos">{quota(p.handicap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link to="/setup" className="muted" style={{ display: 'inline-block', marginTop: 2 }}>
          Edit players &amp; handicaps ›
        </Link>

        <h2 className="section">Rounds</h2>
        {rounds.map((r) => {
          const course = COURSES[r.index]
          const entered = roundHolesEntered(r.gross)
          return (
            <Link className="card link" to={`/round/${r.index}`} key={r.index}>
              <div>
                <div className="card-title">{course.day}</div>
                <div className="muted">{course.name}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="chip ghost">{SPLIT_LABELS_FROM(players, r.pairing)}</span>
                  {r.locked ? (
                    <span className="chip locked">Final</span>
                  ) : entered > 0 ? (
                    <span className="chip">{entered}/18 holes</span>
                  ) : (
                    <span className="chip ghost">Not started</span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: 24, color: 'var(--olive)' }}>›</span>
            </Link>
          )
        })}

        <h2 className="section">Standings</h2>
        <Link className="btn" to="/leaderboard">
          Trip Leaderboard
        </Link>

        <p className="footer-note">
          Quota game with quota-point skins &middot; $1/hole
          <br />
          All data saved on this device — works offline on the course.
        </p>
      </div>
    </>
  )
}
