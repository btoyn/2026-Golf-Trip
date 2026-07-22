import { useNavigate, Navigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'
import { computeSkins, playerRoundLines, teamMatch } from '../lib/scoring'

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

interface Agg {
  margin: number
  skins: number
  wins: number
  losses: number
  ties: number
}

export default function TripLeaderboard() {
  const { state } = useStore()
  const navigate = useNavigate()
  const { players, rounds } = state

  if (players.length !== 4) return <Navigate to="/" replace />

  const agg: Record<string, Agg> = {}
  players.forEach((p) => (agg[p.id] = { margin: 0, skins: 0, wins: 0, losses: 0, ties: 0 }))

  let totalSkinsPot = 0

  rounds.forEach((round) => {
    const course = COURSES[round.index]
    const lines = playerRoundLines(players, round, course)
    lines.forEach((l) => (agg[l.playerId].margin += l.margin))

    const skins = computeSkins(players, round, course)
    players.forEach((p) => (agg[p.id].skins += skins.winnings[p.id] ?? 0))
    totalSkinsPot += players.reduce((s, p) => s + (skins.winnings[p.id] ?? 0), 0)

    // Only score the match record for rounds that have been played at all.
    const played = round.gross.some((h) => Object.keys(h).length > 0)
    if (!played) return
    const match = teamMatch(players, round, course)
    match.teams.forEach((t, i) => {
      const res =
        match.winner === null ? 'tie' : match.winner === i ? 'win' : 'loss'
      t.playerIds.forEach((pid) => {
        if (res === 'win') agg[pid].wins++
        else if (res === 'loss') agg[pid].losses++
        else agg[pid].ties++
      })
    })
  })

  const share = totalSkinsPot / players.length
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? '?'

  const ranked = [...players].sort((a, b) => agg[b.id].margin - agg[a.id].margin)

  return (
    <>
      <TopBar title="Trip Leaderboard" back="/" />
      <div className="content">
        <h2 className="section">Best Golfer — Quota Margin</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 10 }}>
          Cumulative net quota points across all four rounds. Partners rotate, so this is the
          truest individual ranking.
        </p>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="left">#</th>
                <th className="left">Player</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p, i) => (
                <tr key={p.id}>
                  <td className="left pos">{i + 1}</td>
                  <td className="left">{p.name}</td>
                  <td>{signed(agg[p.id].margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="section">Team Match Record</h2>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="left">Player</th>
                <th>W</th>
                <th>L</th>
                <th>T</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td className="left">{p.name}</td>
                  <td className="pos">{agg[p.id].wins}</td>
                  <td className="neg">{agg[p.id].losses}</td>
                  <td>{agg[p.id].ties}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="section">Skins — Trip Total</h2>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="left">Player</th>
                <th>Won</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {[...players]
                .sort((a, b) => agg[b.id].skins - agg[a.id].skins)
                .map((p) => {
                  const net = agg[p.id].skins - share
                  return (
                    <tr key={p.id}>
                      <td className="left">{p.name}</td>
                      <td className="money">{money(agg[p.id].skins)}</td>
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
          {money(totalSkinsPot)} awarded across the trip. Net settles everyone against an equal share.
        </p>

        <h2 className="section">Rounds</h2>
        {rounds.map((r) => {
          const course = COURSES[r.index]
          const played = r.gross.some((h) => Object.keys(h).length > 0)
          const match = teamMatch(players, r, course)
          const label =
            !played
              ? 'Not started'
              : match.winner === null
                ? 'Tied'
                : `${name(match.teams[match.winner].playerIds[0])} + ${name(
                    match.teams[match.winner].playerIds[1],
                  )}`
          return (
            <div
              className="card link"
              key={r.index}
              onClick={() => navigate(`/round/${r.index}`)}
              role="button"
            >
              <div>
                <div className="card-title">{course.day}</div>
                <div className="muted">
                  Match: {label}
                  {r.locked && ' · Final'}
                </div>
              </div>
              <span style={{ fontSize: 24, color: 'var(--olive)' }}>›</span>
            </div>
          )
        })}
      </div>
    </>
  )
}
