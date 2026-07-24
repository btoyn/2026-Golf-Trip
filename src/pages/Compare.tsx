import { useParams, Navigate, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'
import {
  computeVegas,
  computeWolf,
  playerRoundLines,
  teamMatch,
} from '../lib/scoring'

function signed(n: number) {
  const cls = n > 0 ? 'pos' : n < 0 ? 'neg' : ''
  return <span className={cls}>{n > 0 ? `+${n}` : n}</span>
}

export default function Compare() {
  const { roundId } = useParams()
  const idx = Number(roundId)
  const navigate = useNavigate()
  const { state } = useStore()
  const { players, rounds } = state

  const round = rounds.find((r) => r.index === idx)
  const course = COURSES[idx]
  if (!round || !course) return <Navigate to="/" replace />

  const name = (id: string) => players.find((p) => p.id === id)?.name ?? '?'
  const played = round.gross.some((h) => Object.keys(h).length > 0)

  if (!played) {
    return (
      <>
        <TopBar title={`${course.day} — What If`} back={`/round/${idx}`} />
        <div className="content">
          <div className="empty">No scores entered for this round yet.</div>
        </div>
      </>
    )
  }

  // Every game reads the same scores; only the settings' game differs.
  const lines = playerRoundLines(players, round, course)
  const match = teamMatch(players, round, course)
  const vegas = computeVegas(players, round, course)
  const wolfPlayed = round.wolf.some((w) => w !== null)
  const wolf = wolfPlayed ? computeWolf(players, round, course) : null

  const tag = (g: string) => (round.game === g ? <span className="chip">Played</span> : null)
  const bestIndiv = [...lines].sort((a, b) => b.margin - a.margin)[0]
  const vegasLead =
    vegas.points[0] === vegas.points[1] ? null : vegas.points[0] > vegas.points[1] ? 0 : 1

  return (
    <>
      <TopBar title={`${course.day} — What If`} back={`/round/${idx}`} />
      <div className="content">
        <h1 className="big-head">{course.name}</h1>
        <p className="subhead" style={{ marginBottom: 4 }}>
          Same scores · every game · {round.scoring === 'net' ? 'Net' : 'Gross'}
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          How the round would have turned out under each game, using the scores you entered.
        </p>

        {/* Stableford */}
        <h2 className="section">Modified Stableford {tag('stableford')}</h2>
        {match.teams.map((t, i) => (
          <div className={`team-box ${match.winner === i ? 'winner' : ''}`} key={i}>
            <div className="names">
              <span>
                {name(t.playerIds[0])} + {name(t.playerIds[1])}
              </span>
              {match.winner === i && <span className="chip">Wins</span>}
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
                <b>{signed(t.margin)}</b>
              </div>
            </div>
          </div>
        ))}
        <p className="muted" style={{ marginTop: 2 }}>
          Best golfer: <b>{name(bestIndiv.playerId)}</b> ({signed(bestIndiv.margin)} vs quota)
        </p>

        {/* Vegas */}
        <h2 className="section">Vegas {tag('vegas')}</h2>
        {vegas.teams.map((team, i) => (
          <div className={`team-box ${vegasLead === i ? 'winner' : ''}`} key={i}>
            <div className="names">
              <span>
                {name(team[0])} + {name(team[1])}
              </span>
              {vegasLead === i && <span className="chip">Wins</span>}
            </div>
            <div className="stats">
              <div>
                <span className="muted">Points</span>
                <b>{vegas.points[i]}</b>
              </div>
              <div>
                <span className="muted">Margin</span>
                <b>{signed(vegas.points[i] - vegas.points[i === 0 ? 1 : 0])}</b>
              </div>
            </div>
          </div>
        ))}
        {vegasLead === null && <p className="muted center">Vegas would be tied.</p>}

        {/* Wolf */}
        <h2 className="section">Wolf {tag('wolf')}</h2>
        {wolf ? (
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th className="left">Player</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {[...players]
                  .sort((a, b) => wolf.points[b.id] - wolf.points[a.id])
                  .map((p) => (
                    <tr key={p.id}>
                      <td className="left">{name(p.id)}</td>
                      <td>{signed(wolf.points[p.id])}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              Wolf can't be recalculated — it needs the per-hole Wolf calls (partner / lone / blind),
              which are only recorded when you actually play Wolf.
            </p>
          </div>
        )}

        <div className="spacer" />
        <button className="btn secondary" onClick={() => navigate(`/round/${idx}/summary`)}>
          Back to Summary
        </button>
      </div>
    </>
  )
}
