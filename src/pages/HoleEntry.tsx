import { useNavigate, useParams, Navigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'
import {
  computeSkins,
  holePoints,
  netScore,
  strokesReceived,
} from '../lib/scoring'

export default function HoleEntry() {
  const { roundId, holeNum } = useParams()
  const idx = Number(roundId)
  const hole = Number(holeNum) // 1-based
  const navigate = useNavigate()
  const { state, setScore } = useStore()
  const { players, rounds } = state

  const round = rounds.find((r) => r.index === idx)
  const course = COURSES[idx]
  if (!round || !course || hole < 1 || hole > 18) return <Navigate to="/" replace />

  const h = hole - 1
  const par = course.par[h]
  const si = course.si[h]
  const entries = round.gross[h] ?? {}
  const locked = round.locked

  const skins = computeSkins(players, round, course)
  const skin = skins.holes[h]

  const change = (playerId: string, delta: number) => {
    const current = entries[playerId]
    const base = typeof current === 'number' ? current : par
    const next = Math.max(1, base + delta)
    setScore(idx, h, playerId, next)
  }

  const setExact = (playerId: string, raw: string) => {
    if (raw === '') {
      setScore(idx, h, playerId, null)
      return
    }
    const n = Math.max(1, Math.round(Number(raw)))
    if (!Number.isNaN(n)) setScore(idx, h, playerId, n)
  }

  const winnerName = skin.winnerId
    ? players.find((p) => p.id === skin.winnerId)?.name
    : null

  return (
    <>
      <TopBar title={`${course.day} — Hole ${hole}`} back={`/round/${idx}`} />
      <div className="content">
        <div className="hole-nav">
          <button
            aria-label="Previous hole"
            disabled={hole <= 1}
            onClick={() => navigate(`/round/${idx}/hole/${hole - 1}`)}
          >
            ‹
          </button>
          <div className="hole-badge">
            <div className="num">HOLE {hole}</div>
            <div className="meta">
              Par {par} &middot; SI {si}
            </div>
          </div>
          <button
            aria-label="Next hole"
            disabled={hole >= 18}
            onClick={() => navigate(`/round/${idx}/hole/${hole + 1}`)}
          >
            ›
          </button>
        </div>

        {locked && (
          <p className="muted center" style={{ marginBottom: 8 }}>
            Round is locked — scores are read-only.
          </p>
        )}

        {players.map((p) => {
          const g = entries[p.id]
          const has = typeof g === 'number'
          const sr = strokesReceived(p.handicap, si)
          const net = has ? netScore(g, p.handicap, si) : null
          const pts = has ? holePoints(g, p.handicap, par, si) : null
          return (
            <div className="score-row" key={p.id}>
              <div className="who">
                <div className="name">{p.name}</div>
                <div className="sub">
                  {sr > 0 ? `${sr} stroke${sr > 1 ? 's' : ''}` : 'no stroke'}
                  {net !== null && <> &middot; net {net}</>}
                </div>
              </div>
              <div className="stepper">
                <button disabled={locked} onClick={() => change(p.id, -1)} aria-label="minus">
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={has ? g : ''}
                  placeholder={String(par)}
                  disabled={locked}
                  onChange={(e) => setExact(p.id, e.target.value)}
                />
                <button disabled={locked} onClick={() => change(p.id, 1)} aria-label="plus">
                  +
                </button>
              </div>
              <div className="pts-badge">
                <div className="p">{pts !== null ? pts : '–'}</div>
                <div className="l">pts</div>
              </div>
            </div>
          )
        })}

        {/* Skins result for this hole */}
        {skin.complete ? (
          skin.push ? (
            <div className="skin-banner push">
              Push — no winner
              <span className="small">${skin.pot} pot carries to next hole</span>
            </div>
          ) : (
            <div className="skin-banner win">
              Skin: {winnerName} wins ${skin.pot}
              <span className="small">Highest quota points on the hole</span>
            </div>
          )
        ) : (
          <div className="skin-banner push">
            Skins: enter all 4 scores
            <span className="small">${skin.pot} at stake this hole</span>
          </div>
        )}

        <div className="btn-row">
          <button
            className="btn secondary"
            disabled={hole <= 1}
            onClick={() => navigate(`/round/${idx}/hole/${hole - 1}`)}
          >
            ‹ Prev
          </button>
          {hole < 18 ? (
            <button className="btn" onClick={() => navigate(`/round/${idx}/hole/${hole + 1}`)}>
              Next ›
            </button>
          ) : (
            <button className="btn" onClick={() => navigate(`/round/${idx}/summary`)}>
              Finish ›
            </button>
          )}
        </div>

        <div className="btn-row">
          <button
            className="btn secondary small"
            onClick={() => navigate(`/round/${idx}/leaderboard`)}
          >
            Live Leaderboard
          </button>
        </div>
      </div>
    </>
  )
}
