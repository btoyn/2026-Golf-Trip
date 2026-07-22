import { useState } from 'react'

/**
 * Trip logo. Loads /logo.png from public/ and degrades gracefully to a
 * themed badge if the image is missing, so the app never looks broken.
 */
export default function Logo() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="welcome-logo">
        <div className="logo-fallback">
          <div className="ball">⛳️</div>
          <div className="yr">2026</div>
          <div className="name">Sweaty Balls</div>
          <div className="cup">Cup</div>
          <div className="loc">St. George, Utah</div>
        </div>
      </div>
    )
  }

  return (
    <div className="welcome-logo">
      <img src="/logo.png" alt="2026 Sweaty Balls Cup — St. George, Utah" onError={() => setFailed(true)} />
    </div>
  )
}
