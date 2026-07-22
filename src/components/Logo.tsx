import { useState } from 'react'

/**
 * Trip logo shown on the welcome page.
 *
 * Drop the artwork into public/ named `logo` with any common extension
 * (logo.png / logo.jpg / logo.jpeg / logo.webp). The component tries each in
 * turn and only falls back to a themed badge if none are found, so the app
 * never looks broken before the image is added.
 */
const SOURCES = ['/logo.png', '/logo.jpg', '/logo.jpeg', '/logo.webp']

export default function Logo() {
  const [idx, setIdx] = useState(0)
  const exhausted = idx >= SOURCES.length

  if (exhausted) {
    return (
      <div className="welcome-logo">
        <div className="logo-fallback">
          <div className="lf-sun">
            <div className="lf-ball">🕶️</div>
          </div>
          <div className="yr">2026</div>
          <div className="name">Sweaty Balls</div>
          <div className="cup">Cup</div>
          <div className="loc">🌵 St. George, Utah</div>
        </div>
      </div>
    )
  }

  return (
    <div className="welcome-logo">
      <img
        src={SOURCES[idx]}
        alt="2026 Sweaty Balls Cup — St. George, Utah"
        onError={() => setIdx((i) => i + 1)}
      />
    </div>
  )
}
