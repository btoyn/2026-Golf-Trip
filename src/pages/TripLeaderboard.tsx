import { useNavigate, Navigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'
import {
  computeAllSkins,
  computeVegas,
  computeWolf,
  playerRoundLines,
  teamMatch,
} from '../lib/scoring'

function money(n: number) {
  const r = Math.round(n * 100) / 100
  return Number.isInteger(r) ? `$${r}` : `$${r.toFixed(2)}`
}
function signedMoney(n: number) {
  if (n === 0) return '$0'
  return `${n < 0 ? '-' : '+'}${money(Math.abs(n))}`
}
function signed(n: number) {
  const cls = n > 0 ? 'pos' : n < 0 ? 'neg' : ''
  return <span className={cls}>{n > 0 ? `+${n}` : n}</span>
}

const GAME_SHORT: Record<string, string> = {
  stableford: 'Stableford',
  vegas: 'Vegas',
  wolf: 'Wolf',
  teamstroke: 'Team Stroke',
}

export default function TripLeaderboard() {
  const { state } = useStore()
  const navigate = useNavigate()
  const { players, rounds } = state

  if (players.length !== 4) return <Navigate to="/" replace />

  const zero = () => Object.fromEntries(players.map((p) => [p.id, 0])) as Record<string, number>
  const stableMargin = zero()
  const vegasPts = zero()
  const wolfPts = zero()
  const skinsTotal = zero()
  const grossTotal = zero()
  const grossThru = zero()
  const wlt = Object.fromEntries(
    players.map((p) => [p.id, { w: 0, l: 0, t: 0 }]),
  ) as Record<string, { w: number; l: number; t: number }>

  let anyStable = false
  let anyVegas = false
  let anyWolf = false
  let totalSkins = 0

  rounds.forEach((round) => {
    const course = COURSES[round.index]
    const played = round.gross.some((h) => Object.keys(h).length > 0)

    const skins = computeAllSkins(players, round, course)
    players.forEach((p) => {
      skinsTotal[p.id] += skins.total[p.id] ?? 0
      totalSkins += skins.total[p.id] ?? 0
    })

    round.gross.forEach((hole) => {
      players.forEach((p) => {
        const g = hole[p.id]
        if (typeof g === 'number') {
          grossTotal[p.id] += g
          grossThru[p.id] += 1
        }
      })
    })

    if (round.game === 'stableford') {
      anyStable = true
      playerRoundLines(players, round, course).forEach((l) => (stableMargin[l.playerId] += l.margin))
      if (played) {
        const match = teamMatch(players, round, course)
        match.teams.forEach((t, i) => {
          const res = match.winner === null ? 't' : match.winner === i ? 'w' : 'l'
          t.playerIds.forEach((pid) => (wlt[pid][res] += 1))
        })
      }
    } else if (round.game === 'vegas') {
      anyVegas = true
      const v = computeVegas(players, round, course)
      v.teams.forEach((team, i) => team.forEach((pid) => (vegasPts[pid] += v.points[i])))
    } else if (round.game === 'wolf') {
      anyWolf = true
      const w = computeWolf(players, round, course)
      players.forEach((p) => (wolfPts[p.id] += w.points[p.id]))
    }
  })

  const share = totalSkins / players.length
  const rankBy = (m: Record<string, number>) => [...players].sort((a, b) => m[b.id] - m[a.id])

  return (
    <>
      <TopBar title="Trip Leaderboard" back="/" />
      <div className="content">
        {anyStable && (
          <>
            <h2 className="section">Best Golfer — Quota Margin</h2>
            <p className="muted" style={{ marginTop: 0, marginBottom: 10 }}>
              Cumulative net quota margin across Stableford rounds. Partners rotate, so this is the
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
                  {rankBy(stableMargin).map((p, i) => (
                    <tr key={p.id}>
                      <td className="left pos">{i + 1}</td>
                      <td className="left">{p.name}</td>
                      <td>{signed(stableMargin[p.id])}</td>
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
                      <td className="pos">{wlt[p.id].w}</td>
                      <td className="neg">{wlt[p.id].l}</td>
                      <td>{wlt[p.id].t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {anyVegas && (
          <>
            <h2 className="section">Vegas — Trip Points</h2>
            <div className="card" style={{ padding: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th className="left">Player</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {rankBy(vegasPts).map((p) => (
                    <tr key={p.id}>
                      <td className="left">{p.name}</td>
                      <td>{signed(vegasPts[p.id])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {anyWolf && (
          <>
            <h2 className="section">Wolf — Trip Points</h2>
            <div className="card" style={{ padding: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th className="left">Player</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {rankBy(wolfPts).map((p) => (
                    <tr key={p.id}>
                      <td className="left">{p.name}</td>
                      <td>{signed(wolfPts[p.id])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2 className="section">Trip Gross — Total Strokes</h2>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th className="left">#</th>
                <th className="left">Player</th>
                <th>Thru</th>
                <th>Strokes</th>
              </tr>
            </thead>
            <tbody>
              {[...players]
                .sort(
                  (a, b) =>
                    (grossThru[a.id] ? grossTotal[a.id] : Infinity) -
                    (grossThru[b.id] ? grossTotal[b.id] : Infinity),
                )
                .map((p, i) => (
                  <tr key={p.id}>
                    <td className="left pos">{grossThru[p.id] ? i + 1 : '–'}</td>
                    <td className="left">{p.name}</td>
                    <td>{grossThru[p.id]}</td>
                    <td>
                      <b>{grossThru[p.id] ? grossTotal[p.id] : '–'}</b>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          Total gross strokes across all rounds. "Thru" is how many holes each player has posted.
        </p>

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
              {rankBy(skinsTotal).map((p) => {
                const net = skinsTotal[p.id] - share
                return (
                  <tr key={p.id}>
                    <td className="left">{p.name}</td>
                    <td className="money">{money(skinsTotal[p.id])}</td>
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
          {money(totalSkins)} awarded across the trip. Net settles everyone against an equal share.
        </p>

        <h2 className="section">Rounds</h2>
        {rounds.map((r) => {
          const course = COURSES[r.index]
          const played = r.gross.some((h) => Object.keys(h).length > 0)
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
                  {GAME_SHORT[r.game]} · {played ? `${r.scoring === 'net' ? 'Net' : 'Gross'}` : 'Not started'}
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
