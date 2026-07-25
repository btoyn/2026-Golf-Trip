import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import CoursePhoto from '../components/CoursePhoto'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'
import { SPLIT_LABELS, quota, teamsForSplit } from '../lib/scoring'
import type { GameType, PairingSplit, PlayFormat, ScoringMode, SkinsConfig, TieMode } from '../types'

const GAMES: { id: GameType; label: string }[] = [
  { id: 'stableford', label: 'Modified Stableford' },
  { id: 'vegas', label: 'Vegas' },
  { id: 'wolf', label: 'Wolf' },
  { id: 'teamstroke', label: 'Team Stroke' },
]

/** Games whose team competition supports the stroke/match format toggle. */
const FORMAT_GAMES: GameType[] = ['stableford', 'vegas']

const SKIN_LABELS: { key: keyof SkinsConfig; label: string }[] = [
  { key: 'points', label: 'Points' },
  { key: 'putts', label: 'Fewest Putts' },
  { key: 'longest', label: 'Longest Putt' },
]

export default function RoundHome() {
  const { roundId } = useParams()
  const idx = Number(roundId)
  const navigate = useNavigate()
  const {
    state,
    setPairing,
    setGame,
    setScoringMode,
    setFormat,
    setTieMode,
    setSkin,
    resetRound,
    readOnly,
  } = useStore()
  const { players, rounds } = state

  const round = rounds.find((r) => r.index === idx)
  const course = COURSES[idx]
  if (!round || !course) return <Navigate to="/" replace />

  const locked = round.locked || readOnly
  const entered = round.gross.filter((h) => Object.keys(h).length > 0).length
  const resumeHole = Math.min(entered + 1, 18)

  const [t0, t1] = teamsForSplit(round.pairing)
  const teamName = (pair: [number, number]) => `${players[pair[0]].name} + ${players[pair[1]].name}`
  const gameLabel = GAMES.find((g) => g.id === round.game)?.label ?? round.game

  return (
    <>
      <TopBar title={course.day} back="/" />
      <div className="content">
        <CoursePhoto courseIndex={idx} courseName={course.name} />
        {readOnly && (
          <div className="readonly-banner">👀 Following the scorekeeper — view only</div>
        )}
        <h1 className="big-head">{course.name}</h1>
        <p className="subhead">{course.day} &middot; Par {course.par.reduce((a, b) => a + b, 0)}</p>

        {/* ---- Game setup ---- */}
        <h2 className="section">Game</h2>
        {locked ? (
          <p className="muted" style={{ marginTop: 0 }}>
            {gameLabel} · {round.scoring === 'net' ? 'Net' : 'Gross'}
            {FORMAT_GAMES.includes(round.game) &&
              ` · ${round.format === 'match' ? 'Match Play' : 'Stroke Play'}`}
          </p>
        ) : (
          <div className="segmented" style={{ marginBottom: 12 }}>
            {GAMES.map((g) => (
              <button
                key={g.id}
                className={round.game === g.id ? 'active' : ''}
                onClick={() => setGame(idx, g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {!locked && (
          <>
            <label style={{ marginTop: 4 }}>Scoring</label>
            <div className="segmented" style={{ marginBottom: 12 }}>
              {(['net', 'gross'] as ScoringMode[]).map((m) => (
                <button
                  key={m}
                  className={round.scoring === m ? 'active' : ''}
                  onClick={() => setScoringMode(idx, m)}
                >
                  {m === 'net' ? 'Net' : 'Gross'}
                </button>
              ))}
            </div>

            {FORMAT_GAMES.includes(round.game) && (
              <>
                <label>Format</label>
                <div className="segmented" style={{ marginBottom: 12 }}>
                  {(['stroke', 'match'] as PlayFormat[]).map((m) => (
                    <button
                      key={m}
                      className={round.format === m ? 'active' : ''}
                      onClick={() => setFormat(idx, m)}
                    >
                      {m === 'stroke' ? 'Stroke Play' : 'Match Play'}
                    </button>
                  ))}
                </div>
              </>
            )}

            <label>Ties</label>
            <div className="segmented" style={{ marginBottom: 12 }}>
              {(['carry', 'wash'] as TieMode[]).map((m) => (
                <button
                  key={m}
                  className={round.tieMode === m ? 'active' : ''}
                  onClick={() => setTieMode(idx, m)}
                >
                  {m === 'carry' ? 'Carry + Stack' : 'Wash'}
                </button>
              ))}
            </div>

            <label>Skins (25¢ each) — tap to toggle</label>
            <div className="segmented" style={{ marginBottom: 4 }}>
              {SKIN_LABELS.map((s) => (
                <button
                  key={s.key}
                  className={round.skins[s.key] ? 'active' : ''}
                  onClick={() => setSkin(idx, s.key, !round.skins[s.key])}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ---- Pairings (Stableford & Vegas use these; Wolf rotates) ---- */}
        {round.game === 'wolf' ? (
          <>
            <h2 className="section">Wolf Order</h2>
            <div className="card">
              <div className="muted" style={{ margin: 0 }}>
                Wolf rotates each hole in this order:
                <br />
                <b style={{ color: 'var(--forest)' }}>
                  {players.map((p) => p.name).join(' → ')} → repeat
                </b>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="section">Pairings (2 v 2)</h2>
            {locked ? (
              <p className="muted">
                {readOnly ? 'Pairings are set by the scorekeeper.' : 'Round is locked.'}
              </p>
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
          </>
        )}

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

        {entered > 0 && !readOnly && (
          <>
            <h2 className="section">Danger Zone</h2>
            <button
              className="btn danger"
              onClick={() => {
                if (
                  confirm(
                    `Reset ${course.day} (${course.name})? This erases all scores, putts, longest-putt picks, and Wolf calls for this round. This can't be undone.`,
                  )
                ) {
                  resetRound(idx)
                }
              }}
            >
              Reset This Round
            </button>
            <p className="muted center" style={{ marginTop: 8 }}>
              Clears only this round. Other rounds and player handicaps are untouched.
            </p>
          </>
        )}
      </div>
    </>
  )
}
