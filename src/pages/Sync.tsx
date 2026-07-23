import { useState } from 'react'
import TopBar from '../components/TopBar'
import { useStore } from '../lib/store'

const STATUS_LABEL: Record<string, string> = {
  off: 'Off',
  connecting: 'Connecting…',
  live: 'Live',
  offline: 'Offline — will catch up',
}

export default function Sync() {
  const { syncConfigured, syncCode, syncRole, syncStatus, setSync } = useStore()
  const [code, setCode] = useState(syncCode || 'sweaty-balls-2026')

  const apply = (role: 'host' | 'guest') => {
    if (!code.trim()) return
    setSync(code, role)
  }

  return (
    <>
      <TopBar title="Live Scoreboard" back="/" />
      <div className="content">
        {!syncConfigured ? (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 8 }}>
              Not set up yet
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Live sync needs a one-time connection to be configured before it can be used. Hang
              tight — this is coming.
            </p>
          </div>
        ) : (
          <>
            <div className="card center">
              <div className="muted">Status</div>
              <div>
                <span className={`chip sync-${syncStatus}`}>{STATUS_LABEL[syncStatus]}</span>
              </div>
              {syncRole !== 'off' && (
                <div className="muted" style={{ marginTop: 8 }}>
                  {syncRole === 'host' ? 'You are the scorekeeper' : 'Following the scorekeeper'} ·
                  code <b>{syncCode}</b>
                </div>
              )}
            </div>

            <h2 className="section">Trip Code</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Everyone in your group uses the <b>same code</b> so your phones connect. Share it along
              with the app link.
            </p>
            <div className="field">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="sweaty-balls-2026"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <h2 className="section">Your Role</h2>
            <button
              className={`btn ${syncRole === 'host' ? '' : 'secondary'}`}
              onClick={() => apply('host')}
            >
              🏌️ I'm the Scorekeeper
            </button>
            <p className="muted" style={{ margin: '6px 0 14px' }}>
              You enter all the scores; everyone else's phones update automatically. Only one person
              should pick this.
            </p>

            <button
              className={`btn ${syncRole === 'guest' ? '' : 'secondary'}`}
              onClick={() => apply('guest')}
            >
              👀 Follow Along
            </button>
            <p className="muted" style={{ margin: '6px 0 14px' }}>
              Watch scores and standings update live. Your screen is view-only while following.
            </p>

            {syncRole !== 'off' && (
              <button className="btn danger small" onClick={() => setSync('', 'off')}>
                Turn Off Sync
              </button>
            )}

            <p className="footer-note">
              Updates need a cell signal. In a dead zone, followers see the last update and catch up
              when signal returns. The scorekeeper's phone always works offline.
            </p>
          </>
        )}
      </div>
    </>
  )
}
