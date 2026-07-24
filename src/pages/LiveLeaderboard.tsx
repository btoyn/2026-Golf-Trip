import { useNavigate, useParams, Navigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import MatchView from '../components/MatchView'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'
import {
  computeAllSkins,
  computeVegas,
  computeWolf,
  playerRoundLines,
  teamMatch,
} from '../lib/scoring'
import type { SkinsConfig } from '../types'

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

  const skins = computeAllSkins(players, round, course)
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? '?'

  const skinCols = (
    [
      round.skins.points && { key: 'points', label: 'Points', data: skins.points.winnings },
      round.skins.putts && { key: 'putts', label: 'Putts', data: skins.putts.winnings },
      round.skins.longest && { key: 'longest', label: 'Long', data: skins.longest.winnings },
    ] as ({ key: keyof SkinsConfig; label: string; data: Record<string, number> } | false)[]
  ).filter(Boolean) as { key: keyof SkinsConfig; label: string; data: Record<string, number> }[]

  return (
    <>
      <TopBar title={`${course.day} — Live`} back={`/round/${idx}`} />
      <div className="content">
        {round.game === 'stableford' && <Stableford {...{ players, round, course, name }} />}
        {round.game === 'vegas' && <Vegas {...{ players, round, course, name }} />}
        {round.game === 'wolf' && <Wolf {...{ players, round, course, name }} />}

        {skins.any && (
          <>
            <h2 className="section">Skins — 25¢/Hole</h2>
            {(round.skins.points || round.skins.putts) && (
              <div className="grid2" style={{ marginBottom: 12 }}>
                {round.skins.points && (
                  <div className="card center" style={{ marginBottom: 0 }}>
                    <div className="muted">Points carrying</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange-dark)' }}>
                      {money(skins.points.potCarrying)}
                    </div>
                  </div>
                )}
                {round.skins.putts && (
                  <div className="card center" style={{ marginBottom: 0 }}>
                    <div className="muted">Putts carrying</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange-dark)' }}>
                      {money(skins.putts.potCarrying)}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="card" style={{ padding: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th className="left">Player</th>
                    {skinCols.map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...players]
                    .sort((a, b) => skins.total[b.id] - skins.total[a.id])
                    .map((p) => (
                      <tr key={p.id}>
                        <td className="left">{p.name}</td>
                        {skinCols.map((c) => (
                          <td key={c.key} className="money">
                            {money(c.data[p.id])}
                          </td>
                        ))}
                        <td className="money pos">{money(skins.total[p.id])}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="btn-row">
          <button className="btn secondary" onClick={() => navigate(`/round/${idx}/hole/1`)}>
            Enter Scores
          </button>
          <button className="btn" onClick={() => navigate(`/round/${idx}/summary`)}>
            Summary ›
          </button>
        </div>
        <div className="btn-row">
          <button className="btn secondary small" onClick={() => navigate(`/round/${idx}/scorecard`)}>
            Scorecard
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

function Stableford({ players, round, course, name }: SectionProps) {
  const lines = playerRoundLines(players, round, course)
  const match = teamMatch(players, round, course)
  const indiv = [...lines].sort((a, b) => b.margin - a.margin)
  return (
    <>
      <h2 className="section">Team {round.format === 'match' ? 'Match Play' : 'Match'}</h2>
      {round.format === 'match' ? (
        <MatchView players={players} round={round} course={course} name={name} />
      ) : (
        match.teams.map((t, i) => (
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
        ))
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
    </>
  )
}

function Vegas({ players, round, course, name }: SectionProps) {
  const v = computeVegas(players, round, course)
  const lead = v.points[0] === v.points[1] ? null : v.points[0] > v.points[1] ? 0 : 1
  if (round.format === 'match') {
    return (
      <>
        <h2 className="section">Vegas — Match Play</h2>
        <MatchView players={players} round={round} course={course} name={name} />
      </>
    )
  }
  return (
    <>
      <h2 className="section">Vegas</h2>
      {v.teams.map((team, i) => (
        <div className={`team-box ${lead === i ? 'winner' : ''}`} key={i}>
          <div className="names">
            <span>
              {name(team[0])} + {name(team[1])}
            </span>
            {lead === i && <span className="chip">Leading</span>}
          </div>
          <div className="stats">
            <div>
              <span className="muted">Points</span>
              <b>{v.points[i]}</b>
            </div>
            <div>
              <span className="muted">Margin</span>
              <b>{margin(v.points[i] - v.points[i === 0 ? 1 : 0])}</b>
            </div>
          </div>
        </div>
      ))}
      {lead === null && <p className="muted center">Teams are level.</p>}
    </>
  )
}

function Wolf({ players, round, course, name }: SectionProps) {
  const w = computeWolf(players, round, course)
  const ranked = [...players].sort((a, b) => w.points[b.id] - w.points[a.id])
  return (
    <>
      <h2 className="section">Wolf — Running Points</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th className="left">Player</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p) => (
              <tr key={p.id}>
                <td className="left">{name(p.id)}</td>
                <td>{margin(w.points[p.id])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
