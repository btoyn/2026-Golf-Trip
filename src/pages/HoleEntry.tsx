import { useNavigate, useParams, Navigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'
import {
  computeAllSkins,
  computeVegas,
  computeWolf,
  effectiveScore,
  holePoints,
  strokesReceived,
  wolfForHole,
  type SkinHoleResult,
} from '../lib/scoring'

function money(n: number): string {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

export default function HoleEntry() {
  const { roundId, holeNum } = useParams()
  const idx = Number(roundId)
  const hole = Number(holeNum) // 1-based
  const navigate = useNavigate()
  const { state, setScore, setPutts, setLongestPutt, setWolfCall, readOnly } = useStore()
  const { players, rounds } = state

  const round = rounds.find((r) => r.index === idx)
  const course = COURSES[idx]
  if (!round || !course || hole < 1 || hole > 18) return <Navigate to="/" replace />

  const h = hole - 1
  const par = course.par[h]
  const si = course.si[h]
  const grossEntries = round.gross[h] ?? {}
  const puttEntries = round.putts[h] ?? {}
  const longId = round.longestPutt[h] ?? null
  const locked = round.locked || readOnly
  const mode = round.scoring

  const skins = computeAllSkins(players, round, course)
  const vegas = round.game === 'vegas' ? computeVegas(players, round, course) : null
  const wolf = round.game === 'wolf' ? computeWolf(players, round, course) : null
  const wolfId = wolfForHole(players, h)
  const wolfCall = round.wolf[h]

  const name = (id: string | null) => (id ? players.find((p) => p.id === id)?.name ?? '?' : '?')

  const changeGross = (playerId: string, delta: number) => {
    const cur = grossEntries[playerId]
    const base = typeof cur === 'number' ? cur : par
    setScore(idx, h, playerId, Math.max(1, base + delta))
  }
  const setGrossExact = (playerId: string, raw: string) => {
    if (raw === '') return setScore(idx, h, playerId, null)
    const n = Math.max(1, Math.round(Number(raw)))
    if (!Number.isNaN(n)) setScore(idx, h, playerId, n)
  }
  const changePutts = (playerId: string, delta: number) => {
    const cur = puttEntries[playerId]
    const base = typeof cur === 'number' ? cur : 0
    setPutts(idx, h, playerId, Math.max(0, base + delta))
  }
  const setPuttsExact = (playerId: string, raw: string) => {
    if (raw === '') return setPutts(idx, h, playerId, null)
    const n = Math.max(0, Math.round(Number(raw)))
    if (!Number.isNaN(n)) setPutts(idx, h, playerId, n)
  }
  const toggleLong = (playerId: string) => {
    setLongestPutt(idx, h, longId === playerId ? null : playerId)
  }

  const otherPlayers = players.filter((p) => p.id !== wolfId)

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
              Par {par} &middot; SI {si} &middot; {mode === 'net' ? 'Net' : 'Gross'}
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

        {readOnly ? (
          <div className="readonly-banner">👀 Following the scorekeeper — view only</div>
        ) : (
          round.locked && (
            <p className="muted center" style={{ marginBottom: 8 }}>
              Round is locked — scores are read-only.
            </p>
          )
        )}

        {/* Wolf call controls */}
        {round.game === 'wolf' && (
          <div className="wolf-box">
            <div className="wolf-head">🐺 Wolf this hole: {name(wolfId)}</div>
            <div className="segmented">
              <button
                className={wolfCall?.mode === 'partner' ? 'active' : ''}
                disabled={locked}
                onClick={() =>
                  setWolfCall(idx, h, { mode: 'partner', partnerId: wolfCall?.partnerId ?? null })
                }
              >
                Partner
              </button>
              <button
                className={wolfCall?.mode === 'lone' ? 'active' : ''}
                disabled={locked}
                onClick={() => setWolfCall(idx, h, { mode: 'lone', partnerId: null })}
              >
                Lone 2×
              </button>
              <button
                className={wolfCall?.mode === 'blind' ? 'active' : ''}
                disabled={locked}
                onClick={() => setWolfCall(idx, h, { mode: 'blind', partnerId: null })}
              >
                Blind 3×
              </button>
            </div>
            {wolfCall?.mode === 'partner' && (
              <div className="segmented" style={{ marginTop: 8 }}>
                {otherPlayers.map((p) => (
                  <button
                    key={p.id}
                    className={wolfCall.partnerId === p.id ? 'active' : ''}
                    disabled={locked}
                    onClick={() => setWolfCall(idx, h, { mode: 'partner', partnerId: p.id })}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <div className="wolf-teams">
              {!wolfCall && 'Wolf must choose: partner, lone, or blind lone.'}
              {wolfCall?.mode === 'partner' &&
                (wolfCall.partnerId
                  ? `${name(wolfId)} + ${name(wolfCall.partnerId)} vs the other two`
                  : 'Pick a partner above.')}
              {wolfCall?.mode === 'lone' && `${name(wolfId)} alone vs the other three (2×)`}
              {wolfCall?.mode === 'blind' && `${name(wolfId)} BLIND vs the other three (3×)`}
            </div>
          </div>
        )}

        {players.map((p) => {
          const g = grossEntries[p.id]
          const hasG = typeof g === 'number'
          const sr = strokesReceived(p.handicap, si)
          const eff = hasG ? effectiveScore(g, p.handicap, si, mode) : null
          const pts = hasG ? holePoints(g, p.handicap, par, si, mode) : null
          const pu = puttEntries[p.id]
          const hasP = typeof pu === 'number'
          const isLong = longId === p.id
          const isWolf = round.game === 'wolf' && p.id === wolfId
          return (
            <div className={`player-card ${isWolf ? 'is-wolf' : ''}`} key={p.id}>
              <div className="pc-main">
                <div className="who">
                  <div className="name">
                    {isWolf && '🐺 '}
                    {p.name}
                  </div>
                  <div className="sub">
                    {sr > 0 ? `${sr} stk` : 'no stk'}
                    {eff !== null && <> &middot; {mode === 'net' ? `net ${eff}` : `gross ${g}`}</>}
                  </div>
                </div>
                <div className="stepper">
                  <button disabled={locked} onClick={() => changeGross(p.id, -1)} aria-label="score minus">
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={hasG ? g : ''}
                    placeholder={String(par)}
                    disabled={locked}
                    onChange={(e) => setGrossExact(p.id, e.target.value)}
                  />
                  <button disabled={locked} onClick={() => changeGross(p.id, 1)} aria-label="score plus">
                    +
                  </button>
                </div>
                <div className="pts-badge">
                  <div className="p">{pts !== null ? pts : '–'}</div>
                  <div className="l">pts</div>
                </div>
              </div>

              <div className="pc-extra">
                <div className="putts-field">
                  <span className="mini-label">Putts</span>
                  <div className="stepper mini">
                    <button disabled={locked} onClick={() => changePutts(p.id, -1)} aria-label="putts minus">
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={hasP ? pu : ''}
                      placeholder="–"
                      disabled={locked}
                      onChange={(e) => setPuttsExact(p.id, e.target.value)}
                    />
                    <button disabled={locked} onClick={() => changePutts(p.id, 1)} aria-label="putts plus">
                      +
                    </button>
                  </div>
                </div>
                <button
                  className={`long-toggle ${isLong ? 'active' : ''}`}
                  disabled={locked}
                  onClick={() => toggleLong(p.id)}
                >
                  🚩 Long putt
                </button>
              </div>
            </div>
          )
        })}

        {/* Vegas result for this hole */}
        {vegas && (
          <div className="game-result">
            {vegas.holes[h].complete ? (
              <>
                <div className="gr-row">
                  <span>
                    {name(vegas.teams[0][0])} + {name(vegas.teams[0][1])}
                  </span>
                  <b>{vegas.holes[h].numbers?.[0]}</b>
                </div>
                <div className="gr-row">
                  <span>
                    {name(vegas.teams[1][0])} + {name(vegas.teams[1][1])}
                  </span>
                  <b>{vegas.holes[h].numbers?.[1]}</b>
                </div>
                <div className="gr-foot">
                  {vegas.holes[h].winner === null
                    ? 'Tied — 0 points'
                    : `+${vegas.holes[h].diff} to ${name(
                        vegas.teams[vegas.holes[h].winner as number][0],
                      )} + ${name(vegas.teams[vegas.holes[h].winner as number][1])}`}
                </div>
              </>
            ) : (
              <div className="gr-foot">Vegas: enter all 4 scores</div>
            )}
          </div>
        )}

        {/* Wolf result for this hole */}
        {wolf && (
          <div className="game-result">
            {wolf.holes[h].outcome === 'pending' ? (
              <div className="gr-foot">
                Wolf: {wolfCall ? 'enter all 4 scores' : 'set the Wolf call above'}
              </div>
            ) : wolf.holes[h].outcome === 'tie' ? (
              <div className="gr-foot">
                Tied — {round.tieMode === 'carry' ? 'carries to next hole' : 'washed'}
              </div>
            ) : (
              <div className="gr-foot">
                {players
                  .filter((p) => wolf.holes[h].deltas[p.id] !== 0)
                  .map((p) => `${p.name} ${wolf.holes[h].deltas[p.id] > 0 ? '+' : ''}${wolf.holes[h].deltas[p.id]}`)
                  .join(' · ')}
              </div>
            )}
          </div>
        )}

        {/* Enabled skins for this hole */}
        {skins.any && (
          <div className="hole-skins">
            {round.skins.points && (
              <SkinLine label="Points" res={skins.points.holes[h]} winner={name} incomplete="enter 4 scores" />
            )}
            {round.skins.putts && (
              <SkinLine label="Fewest putts" res={skins.putts.holes[h]} winner={name} incomplete="enter 4 putts" />
            )}
            {round.skins.longest && <LongPuttLine longId={longId} name={name} />}
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
          <button className="btn secondary small" onClick={() => navigate(`/round/${idx}/scorecard`)}>
            Scorecard
          </button>
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

function SkinLine({
  label,
  res,
  winner,
  incomplete,
}: {
  label: string
  res: SkinHoleResult
  winner: (id: string | null) => string
  incomplete: string
}) {
  let cls = 'skin-line'
  let text: string
  if (!res.complete) {
    cls += ' pending'
    text = `${incomplete} · ${money(res.pot)} at stake`
  } else if (res.push) {
    cls += ' push'
    text = `push · ${money(res.pot)} carries`
  } else {
    cls += ' win'
    text = `${winner(res.winnerId)} · ${money(res.pot)}`
  }
  return (
    <div className={cls}>
      <span className="sl-label">{label}</span>
      <span className="sl-result">{text}</span>
    </div>
  )
}

function LongPuttLine({
  longId,
  name,
}: {
  longId: string | null
  name: (id: string | null) => string
}) {
  const cls = 'skin-line ' + (longId ? 'win' : 'pending')
  const text = longId ? `${name(longId)} · ${money(0.25)}` : 'tap a player above · $0.25'
  return (
    <div className={cls}>
      <span className="sl-label">Long putt</span>
      <span className="sl-result">{text}</span>
    </div>
  )
}
