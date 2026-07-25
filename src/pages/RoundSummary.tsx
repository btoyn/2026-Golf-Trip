import { useNavigate, useParams, Navigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import MatchView from '../components/MatchView'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'
import {
  computeAllSkins,
  computeTeamStroke,
  computeVegas,
  computeWolf,
  playerRoundLines,
  teamMatch,
} from '../lib/scoring'
import type { SkinsConfig } from '../types'

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

const GAME_NAME: Record<string, string> = {
  stableford: 'Modified Stableford',
  vegas: 'Vegas',
  wolf: 'Wolf',
  teamstroke: 'Team Stroke',
}

function toPar(n: number) {
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

export default function RoundSummary() {
  const { roundId } = useParams()
  const idx = Number(roundId)
  const navigate = useNavigate()
  const { state, setLocked, readOnly } = useStore()
  const { players, rounds } = state

  const round = rounds.find((r) => r.index === idx)
  const course = COURSES[idx]
  if (!round || !course) return <Navigate to="/" replace />

  const skins = computeAllSkins(players, round, course)
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? '?'
  const totalWon = players.reduce((sum, p) => sum + (skins.total[p.id] ?? 0), 0)
  const share = totalWon / players.length
  const carrying = skins.points.potCarrying + skins.putts.potCarrying
  const holesPlayed = round.gross.filter((hh) => Object.keys(hh).length > 0).length

  const skinCols = (
    [
      round.skins.points && { key: 'points', label: 'Pts', data: skins.points.winnings },
      round.skins.putts && { key: 'putts', label: 'Putts', data: skins.putts.winnings },
      round.skins.longest && { key: 'longest', label: 'Long', data: skins.longest.winnings },
    ] as ({ key: keyof SkinsConfig; label: string; data: Record<string, number> } | false)[]
  ).filter(Boolean) as { key: keyof SkinsConfig; label: string; data: Record<string, number> }[]

  return (
    <>
      <TopBar title={`${course.day} — Summary`} back={`/round/${idx}`} />
      <div className="content">
        <h1 className="big-head">{course.name}</h1>
        <p className="subhead">
          {GAME_NAME[round.game]} · {round.scoring === 'net' ? 'Net' : 'Gross'} ·{' '}
          {holesPlayed}/18 holes
        </p>

        {round.game === 'stableford' && <StablefordResult {...{ players, round, course, name }} />}
        {round.game === 'vegas' && <VegasResult {...{ players, round, course, name }} />}
        {round.game === 'wolf' && <WolfResult {...{ players, round, course, name }} />}
        {round.game === 'teamstroke' && <TeamStrokeResult {...{ players, round, course, name }} />}

        {skins.any && (
          <>
            <h2 className="section">Skins Tally — 25¢/Hole</h2>
            <div className="card" style={{ padding: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th className="left">Player</th>
                    {skinCols.map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
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
                        {skinCols.map((c) => (
                          <td key={c.key} className="money">
                            {money(c.data[p.id])}
                          </td>
                        ))}
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
              Net = winnings minus an equal share of the {money(totalWon)} awarded (settle-up).
              {carrying > 0 && ` ${money(carrying)} still carrying (unclaimed).`}
            </p>
          </>
        )}

        <div className="spacer" />
        {round.locked ? (
          <>
            <div className="card center">
              <span className="chip locked">Round Locked / Final</span>
            </div>
            {!readOnly && (
              <button className="btn secondary" onClick={() => setLocked(idx, false)}>
                Unlock Round
              </button>
            )}
          </>
        ) : (
          !readOnly && (
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
          )
        )}

        <button
          className="btn secondary"
          style={{ marginTop: 12 }}
          onClick={() => navigate(`/round/${idx}/compare`)}
        >
          🔀 What If — Compare Games
        </button>
        <div className="btn-row">
          <button className="btn secondary small" onClick={() => navigate(`/round/${idx}/scorecard`)}>
            Scorecard
          </button>
          <button className="btn secondary small" onClick={() => navigate('/leaderboard')}>
            Trip Leaderboard
          </button>
        </div>
      </div>
    </>
  )
}

type SectionProps = {
  players: ReturnType<typeof useStore>['state']['players']
  round: ReturnType<typeof useStore>['state']['rounds'][number]
  course: (typeof COURSES)[number]
  name: (id: string) => string
}

function StablefordResult({ players, round, course, name }: SectionProps) {
  const lines = playerRoundLines(players, round, course)
  const match = teamMatch(players, round, course)
  return (
    <>
      <h2 className="section">Team {round.format === 'match' ? 'Match Play' : 'Match'} Result</h2>
      {round.format === 'match' ? (
        <MatchView players={players} round={round} course={course} name={name} final />
      ) : (
        <>
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
        </>
      )}
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
    </>
  )
}

function VegasResult({ players, round, course, name }: SectionProps) {
  const v = computeVegas(players, round, course)
  const winner = v.points[0] === v.points[1] ? null : v.points[0] > v.points[1] ? 0 : 1
  if (round.format === 'match') {
    return (
      <>
        <h2 className="section">Vegas — Match Play Result</h2>
        <MatchView players={players} round={round} course={course} name={name} final />
      </>
    )
  }
  return (
    <>
      <h2 className="section">Vegas Result</h2>
      {v.teams.map((team, i) => (
        <div className={`team-box ${winner === i ? 'winner' : ''}`} key={i}>
          <div className="names">
            <span>
              {name(team[0])} + {name(team[1])}
            </span>
            {winner === i && <span className="chip">Winner</span>}
          </div>
          <div className="stats">
            <div>
              <span className="muted">Points</span>
              <b>{v.points[i]}</b>
            </div>
            <div>
              <span className="muted">Margin</span>
              <b>{signed(v.points[i] - v.points[i === 0 ? 1 : 0])}</b>
            </div>
          </div>
        </div>
      ))}
      {winner === null && <p className="muted center">Vegas tied.</p>}
    </>
  )
}

function TeamStrokeResult({ players, round, course, name }: SectionProps) {
  const t = computeTeamStroke(players, round, course)
  return (
    <>
      <h2 className="section">Team Stroke Result</h2>
      {t.teams.map((line, i) => (
        <div className={`team-box ${t.leader === i ? 'winner' : ''}`} key={i}>
          <div className="names">
            <span>
              {name(line.playerIds[0])} + {name(line.playerIds[1])}
            </span>
            {t.leader === i && <span className="chip">Winner</span>}
          </div>
          <div className="stats">
            <div>
              <span className="muted">Strokes</span>
              <b>{line.total}</b>
            </div>
            <div>
              <span className="muted">To Par</span>
              <b>{toPar(line.toPar)}</b>
            </div>
            <div>
              <span className="muted">Thru</span>
              <b>{line.thru}</b>
            </div>
          </div>
        </div>
      ))}
      {t.leader === null && <p className="muted center">All even.</p>}
    </>
  )
}

function WolfResult({ players, round, course, name }: SectionProps) {
  const w = computeWolf(players, round, course)
  return (
    <>
      <h2 className="section">Wolf Result</h2>
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
              .sort((a, b) => w.points[b.id] - w.points[a.id])
              .map((p) => (
                <tr key={p.id}>
                  <td className="left">{name(p.id)}</td>
                  <td>{signed(w.points[p.id])}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
