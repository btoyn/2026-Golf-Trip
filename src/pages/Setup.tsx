import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { useStore } from '../lib/store'
import { quota } from '../lib/scoring'
import type { Player } from '../types'

interface Draft {
  name: string
  handicap: string
}

const LETTERS = ['A', 'B', 'C', 'D']

export default function Setup() {
  const { state, setPlayers, resetAll } = useStore()
  const navigate = useNavigate()

  const [drafts, setDrafts] = useState<Draft[]>(() => {
    if (state.players.length === 4) {
      return state.players.map((p) => ({ name: p.name, handicap: String(p.handicap) }))
    }
    return LETTERS.map(() => ({ name: '', handicap: '' }))
  })

  const update = (i: number, key: keyof Draft, value: string) => {
    setDrafts((d) => d.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)))
  }

  const valid = drafts.every(
    (d) => d.name.trim().length > 0 && d.handicap.trim() !== '' && !Number.isNaN(Number(d.handicap)),
  )

  const save = () => {
    if (!valid) return
    const players: Player[] = drafts.map((d, i) => ({
      id: state.players[i]?.id ?? `p${i}-${Date.now()}`,
      name: d.name.trim(),
      handicap: Number(d.handicap),
    }))
    setPlayers(players)
    navigate('/')
  }

  const clearTrip = () => {
    if (confirm('Reset the entire trip? This clears all players and scores.')) {
      resetAll()
      setDrafts(LETTERS.map(() => ({ name: '', handicap: '' })))
    }
  }

  return (
    <>
      <TopBar title="Trip Setup" back={state.players.length === 4 ? '/' : undefined} />
      <div className="content">
        <p className="subhead">4 Players &middot; Handicaps</p>
        <p className="muted" style={{ marginTop: 6, marginBottom: 16 }}>
          Enter each player in order (A, B, C, D). Pairings and quota are derived from these.
          Handicaps may be decimals.
        </p>

        {drafts.map((d, i) => {
          const hcp = Number(d.handicap)
          const showQuota = d.handicap.trim() !== '' && !Number.isNaN(hcp)
          return (
            <div className="card" key={i}>
              <div className="card-title" style={{ marginBottom: 10 }}>
                Player {LETTERS[i]}
              </div>
              <div className="field">
                <label>Name</label>
                <input
                  type="text"
                  value={d.name}
                  placeholder={`Player ${LETTERS[i]}`}
                  onChange={(e) => update(i, 'name', e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Handicap</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={d.handicap}
                  placeholder="e.g. 12.4"
                  onChange={(e) => update(i, 'handicap', e.target.value)}
                />
              </div>
              {showQuota && (
                <div className="muted" style={{ marginTop: 8 }}>
                  Quota = 36 &minus; {hcp} = <b style={{ color: 'var(--olive-dark)' }}>{quota(hcp)}</b>
                </div>
              )}
            </div>
          )
        })}

        <button className="btn" disabled={!valid} onClick={save}>
          Save &amp; Continue
        </button>

        {state.players.length === 4 && (
          <div className="btn-row">
            <button className="btn danger small" onClick={clearTrip}>
              Reset Trip
            </button>
          </div>
        )}
      </div>
    </>
  )
}
