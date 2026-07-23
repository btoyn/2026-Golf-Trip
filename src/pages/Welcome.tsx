import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { useStore } from '../lib/store'
import { COURSES } from '../data/courses'

const SHORT_DAY = ['THU', 'FRI', 'SAT', 'SUN']

const SYNC_TEXT: Record<string, string> = {
  off: 'Live scoreboard',
  connecting: 'Connecting…',
  live: 'Live',
  offline: 'Offline',
}

export default function Welcome() {
  const { state, syncConfigured, syncRole, syncStatus } = useStore()
  const { rounds } = state

  return (
    <div className="welcome">
      <Logo />
      <p className="welcome-tag">Choose Your Course</p>

      <div className="course-btns">
        {rounds.map((r) => {
          const course = COURSES[r.index]
          const entered = r.gross.filter((h) => Object.keys(h).length > 0).length
          const status = r.locked
            ? 'Final'
            : entered > 0
              ? `In progress · ${entered}/18`
              : null
          return (
            <Link className="course-btn" to={`/round/${r.index}`} key={r.index}>
              <span className="day">{SHORT_DAY[r.index]}</span>
              <span className="info">
                <span className="cname">{course.name}</span>
                <span className="csub">{course.day}</span>
                {status && <span className="status">{status}</span>}
              </span>
              <span className="chev">›</span>
            </Link>
          )
        })}
      </div>

      {syncConfigured && (
        <Link className="sync-cta" to="/sync">
          <span className={`sync-dot sync-${syncStatus}`} />
          <span className="sync-cta-text">
            {syncRole === 'off'
              ? 'Live Scoreboard — tap to connect'
              : syncRole === 'host'
                ? `Scorekeeper · ${SYNC_TEXT[syncStatus]}`
                : `Following · ${SYNC_TEXT[syncStatus]}`}
          </span>
          <span className="sync-cta-chev">›</span>
        </Link>
      )}

      <div className="welcome-links">
        <Link to="/instructions">📖 Instructions</Link>
      </div>
      <div className="welcome-links" style={{ marginTop: 10 }}>
        <Link to="/leaderboard">Leaderboard</Link>
        <Link to="/setup">Players</Link>
      </div>

      <p className="welcome-foot">
        Quota game · 3 skins ($0.25/hole: points, fewest putts, longest putt) · teams rotate.
        <br />
        Saved on this device — works offline on the course.
      </p>
    </div>
  )
}
