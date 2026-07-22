import { useNavigate, useParams, Navigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'
import { computeAllSkins, playerRoundLines, teamMatch } from '../lib/scoring'

function money(n: number) {
  const r = Math.round(n * 100) / 100
  return Number.isInteger(r) ? `$${r}` : `$${r.toFixed(2)}`
}

function signedMoney(n: number) {
  if (n === 0) return '$0'
  const sign = n < 0 ? '-' : '+'
  return `${sign}${money(Math.abs(n))}`
}

function signed(n: number) {
  const cls = n > 0 ? 'pos' : n < 0 ? 'neg' : ''
  return <span className={cls}>{n > 0 ? `+${n}` : n}</span>
}

export default function RoundSummary() {
  const { roundId } = useParams()
  const idx = Number(roundId)
  const navigate = useNavigate()
  const { state, setLocked } = useStore()
  const { players, rounds } = state

  const round = rounds.find((r) => r.index === idx)
  const course = COURSES[idx]
  if (!round || !course) return <Navigate to="/" replace />

  const lines = playerRoundLines(players, round, course)
  const match = teamMatch(players, round, course)
  const skins = computeAllSkins(players, round, course)
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? '?'

  const totalWon = players.reduce((sum, p) => sum + (skins.total[p.id] ?? 0), 0)
  const share = totalWon / players.length // equal ante against distributed pots
  const carrying = skins.points.potCarrying + skins.putts.potCarrying

  const holesPlayed = round.gross.filter((hh) => Object.keys(hh).length > 0).length

  return (
    <>
      <TopBar title={`${course.day} — Summary`} back={`/round/${idx}`} />
      <div className="content">
        <h1 className="big-head">{course.name}</h1>
        <p className="subhead">
          {course.day} &middot; {holesPlayed}/18 holes entered
        </p>

        <h2 className="section">Team Match Result</h2>
        {match.teams.map((t, i) => (
          <div className={`team-box ${match.winner === i ? 'winner' : ''}`} key={i}>
            <div className="names">
              <span>
                {name(t.playerIds[0])} + {name(t.playerIds[1])}
              </span>
              {match.winner === i && <span className="chip">Winner</span>}
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
        {match.winner === null && <p className="muted center">Match tied on margin.</p>}

        <h2 className="section">Individual Quota</h2>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="left">Player</th>
                <th>Points</th>
                <th>Quota</th>
                <th>+/–</th>
              </tr>
            </thead>
            <tbody>
              {[...lines]
                .sort((a, b) => b.margin - a.margin)
                .map((l) => (
                  <tr key={l.playerId}>
                    <td className="left">{name(l.playerId)}</td>
                    <td>{l.points}</td>
                    <td>{l.quota}</td>
                    <td>{signed(l.margin)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <h2 className="section">Skins Tally — $0.25/Hole Each</h2>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="left">Player</th>
                <th>Pts</th>
                <th>Putts</th>
                <th>Long</th>
                <th>Won</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const won = skins.total[p.id] ?? 0
                const net = won - share
                return (
                  <tr key={p.id}>
                    <td className="left">{p.name}</td>
                    <td className="money">{money(skins.points.winnings[p.id])}</td>
                    <td className="money">{money(skins.putts.winnings[p.id])}</td>
                    <td className="money">{money(skins.longest.winnings[p.id])}</td>
                    <td className="money">{money(won)}</td>
                    <td className={`money ${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}`}>
                      {signedMoney(net)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          Three skins games (points, fewest putts, longest putt), each $0.25/hole. Net = winnings
          minus an equal share of the {money(totalWon)} awarded (settle-up).
          {carrying > 0 && ` ${money(carrying)} still carrying (unclaimed).`}
        </p>

        <div className="spacer" />
        {round.locked ? (
          <>
            <div className="card center">
              <span className="chip locked">Round Locked / Final</span>
            </div>
            <button className="btn secondary" onClick={() => setLocked(idx, false)}>
              Unlock Round
            </button>
          </>
        ) : (
          <button
            className="btn"
            onClick={() => {
              if (confirm('Lock this round as final? You can unlock later if needed.')) {
                setLocked(idx, true)
              }
            }}
          >
            Lock Round as Final
          </button>
        )}

        <div className="btn-row">
          <button className="btn secondary small" onClick={() => navigate('/leaderboard')}>
            Trip Leaderboard
          </button>
          <button className="btn secondary small" onClick={() => navigate('/')}>
            Home
          </button>
        </div>
      </div>
    </>
  )
}
