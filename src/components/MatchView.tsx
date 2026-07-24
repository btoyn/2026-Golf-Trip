import type { Course, Player, Round } from '../types'
import { computeMatchPlay } from '../lib/scoring'

/** Shared hole-by-hole match-play display for Stableford & Vegas. */
export default function MatchView({
  players,
  round,
  course,
  name,
  final,
}: {
  players: Player[]
  round: Round
  course: Course
  name: (id: string) => string
  final?: boolean
}) {
  const m = computeMatchPlay(players, round, course)
  const leaderName =
    m.leader === null
      ? null
      : `${name(m.teams[m.leader][0])} + ${name(m.teams[m.leader][1])}`

  return (
    <>
      {m.teams.map((team, i) => (
        <div className={`team-box ${m.leader === i ? 'winner' : ''}`} key={i}>
          <div className="names">
            <span>
              {name(team[0])} + {name(team[1])}
            </span>
            {m.leader === i && (
              <span className="chip">{m.decided && final ? 'Winner' : 'Up'}</span>
            )}
          </div>
        </div>
      ))}
      <div className="match-status">
        {m.leader === null ? (
          <b>All Square</b>
        ) : (
          <>
            <b>
              {leaderName} {m.status}
            </b>
          </>
        )}
        <span className="muted"> · thru {m.holesPlayed}</span>
      </div>
    </>
  )
}
