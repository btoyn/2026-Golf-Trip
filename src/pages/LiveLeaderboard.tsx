import { useNavigate, useParams, Navigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'
import { computeAllSkins, playerRoundLines, teamMatch } from '../lib/scoring'

function margin(n: number) {
  const cls = n > 0 ? 'pos' : n < 0 ? 'neg' : ''
  return <span className={cls}>{n > 0 ? `+${n}` : n}</span>
}

function money(n: number) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

export default function LiveLeaderboard() {
  const { roundId } = useParams()
  const idx = Number(roundId)
  const navigate = useNavigate()
  const { state } = useStore()
  const { players, rounds } = state

  const round = rounds.find((r) => r.index === idx)
  const course = COURSES[idx]
  if (!round || !course) return <Navigate to="/" replace />

  const lines = playerRoundLines(players, round, course)
  const match = teamMatch(players, round, course)
  const skins = computeAllSkins(players, round, course)
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? '?'

  const indiv = [...lines].sort((a, b) => b.margin - a.margin)

  return (
    <>
      <TopBar title={`${course.day} — Live`} back={`/round/${idx}`} />
      <div className="content">
        <h2 className="section">Team Match</h2>
        {match.teams.map((t, i) => (
          <div className={`team-box ${match.winner === i ? 'winner' : ''}`} key={i}>
            <div className="names">
              <span>
                {name(t.playerIds[0])} + {name(t.playerIds[1])}
              </span>
              {match.winner === i && <span className="chip">Leading</span>}
            </div>
            <div className="stats">
              <div>
                <span className="muted">Points</span>
                <b>{t.points}</b>
              </div>
              <div>
                <span className="muted">Quota</span>
                <b>{t.quota}</b>
              </div>
              <div>
                <span className="muted">Margin</span>
                <b>{margin(t.margin)}</b>
              </div>
            </div>
          </div>
        ))}
        {match.winner === null && (
          <p className="muted center">Teams are level on margin.</p>
        )}

        <h2 className="section">Individual Quota</h2>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="left">Player</th>
                <th>Thru</th>
                <th>Pts</th>
                <th>Quota</th>
                <th>+/–</th>
              </tr>
            </thead>
            <tbody>
              {indiv.map((l) => (
                <tr key={l.playerId}>
                  <td className="left">{name(l.playerId)}</td>
                  <td>{l.holesPlayed}</td>
                  <td>{l.points}</td>
                  <td>{l.quota}</td>
                  <td>{margin(l.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="section">Skins — $0.25/Hole Each</h2>
        <div className="grid2" style={{ marginBottom: 12 }}>
          <div className="card center" style={{ marginBottom: 0 }}>
            <div className="muted">Points pot carrying</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange-dark)' }}>
              {money(skins.points.potCarrying)}
            </div>
          </div>
          <div className="card center" style={{ marginBottom: 0 }}>
            <div className="muted">Putts pot carrying</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange-dark)' }}>
              {money(skins.putts.potCarrying)}
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="left">Player</th>
                <th>Points</th>
                <th>Putts</th>
                <th>Long</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {[...players]
                .sort((a, b) => skins.total[b.id] - skins.total[a.id])
                .map((p) => (
                  <tr key={p.id}>
                    <td className="left">{p.name}</td>
                    <td className="money">{money(skins.points.winnings[p.id])}</td>
                    <td className="money">{money(skins.putts.winnings[p.id])}</td>
                    <td className="money">{money(skins.longest.winnings[p.id])}</td>
                    <td className="money pos">{money(skins.total[p.id])}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="btn-row">
          <button
            className="btn secondary"
            onClick={() => navigate(`/round/${idx}/hole/1`)}
          >
            Enter Scores
          </button>
          <button className="btn" onClick={() => navigate(`/round/${idx}/summary`)}>
            Summary ›
          </button>
        </div>
      </div>
    </>
  )
}
