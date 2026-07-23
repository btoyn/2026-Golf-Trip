import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'

export default function Instructions() {
  return (
    <>
      <TopBar title="How It Works" back="/" />
      <div className="content">
        <h2 className="section">🏌️ Quota — The Main Game</h2>
        <div className="card">
          <p style={{ marginTop: 0 }}>
            Everyone plays their own ball for <b>points</b>. Your target is your{' '}
            <b>Quota = 36 − your handicap</b>.
          </p>
          <p>
            Your handicap gives you free strokes on the hardest holes — subtract them for your{' '}
            <b>net</b> score. Points per hole:
          </p>
          <div className="card" style={{ background: 'var(--paper)', marginBottom: 10 }}>
            <table>
              <tbody>
                <tr>
                  <td className="left">Net eagle or better</td>
                  <td className="pos">4 pts</td>
                </tr>
                <tr>
                  <td className="left">Net birdie</td>
                  <td className="pos">3 pts</td>
                </tr>
                <tr>
                  <td className="left">Net par</td>
                  <td className="pos">2 pts</td>
                </tr>
                <tr>
                  <td className="left">Net bogey</td>
                  <td className="pos">1 pt</td>
                </tr>
                <tr>
                  <td className="left">Net double or worse</td>
                  <td>0 pts</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontStyle: 'italic' }}>
            Example: Vance makes 5 on a par 4 but gets a stroke there → net 4 (par) → 2 points.
          </p>
          <p style={{ marginBottom: 0 }}>
            Beat your quota. Best golfer of the trip is whoever beats it by the most.
          </p>
        </div>

        <h2 className="section">👥 Team Match (2 v 2)</h2>
        <div className="card">
          <p style={{ margin: 0 }}>
            Each round splits Brandon, Chase, Vance, and Nate into two teams —{' '}
            <b>teams rotate daily</b>. Add both partners' points and quotas.{' '}
            <b>Margin = points − quota. Higher margin wins the round.</b>
          </p>
        </div>

        <h2 className="section">💰 Skins — 3 Games, 25¢ Each Per Hole</h2>
        <div className="card">
          <p style={{ marginTop: 0 }}>
            <b>1. Points</b> — most quota points on the hole wins 25¢. Tie = carries &amp; stacks
            (25¢ → 50¢ → …).
          </p>
          <p>
            <b>2. Fewest putts</b> — fewest putts on the hole wins 25¢. Tie = carries &amp; stacks.
          </p>
          <p style={{ marginBottom: 0 }}>
            <b>3. Longest putt</b> — whoever makes it gets 25¢ (tap them on the scorecard).
          </p>
        </div>

        <h2 className="section">📲 Live Scoreboard</h2>
        <div className="card">
          <p style={{ marginTop: 0 }}>
            Everyone watches the same scores update live on their own phone.
          </p>
          <p>
            <b>One person</b> is the scorekeeper and enters all the scores. Everyone else taps{' '}
            <b>Follow Along</b> to watch (view-only).
          </p>
          <p>
            Everyone uses the <b>same trip code</b> on the Live Scoreboard screen — set it once at
            the start.
          </p>
          <p>
            Updates need a cell signal; in a dead zone followers see the last update and catch up
            when signal returns.
          </p>
          <p style={{ marginBottom: 0 }}>
            <b>Switching scorekeepers:</b> the current one taps Follow Along, then the new one taps
            I'm the Scorekeeper — only one scorekeeper at a time.
          </p>
        </div>

        <div className="spacer" />
        <Link className="btn" to="/">
          Got It
        </Link>
      </div>
    </>
  )
}
