import type { Course, PairingSplit, Player, Round } from '../types'

/** Quota = 36 - handicap (handicap may be decimal). */
export function quota(handicap: number): number {
  return 36 - handicap
}

/**
 * Handicap strokes received on a hole given its stroke index.
 * strokes = floor(handicap / 18) + (1 if si <= (handicap mod 18) else 0)
 * Handicap may be decimal; no rounding is applied.
 */
export function strokesReceived(handicap: number, strokeIndex: number): number {
  const base = Math.floor(handicap / 18)
  const remainder = handicap % 18
  return base + (strokeIndex <= remainder ? 1 : 0)
}

/** Net score on a hole = gross - strokes received. */
export function netScore(gross: number, handicap: number, strokeIndex: number): number {
  return gross - strokesReceived(handicap, strokeIndex)
}

/**
 * Quota points from NET score vs par. Never negative.
 *   net eagle or better (<= par-2): 4
 *   net birdie (par-1): 3
 *   net par: 2
 *   net bogey (par+1): 1
 *   net double bogey or worse (>= par+2): 0
 */
export function quotaPoints(net: number, par: number): number {
  const diff = net - par
  if (diff <= -2) return 4
  if (diff === -1) return 3
  if (diff === 0) return 2
  if (diff === 1) return 1
  return 0
}

/** Quota points for a player on a hole directly from gross. */
export function holePoints(
  gross: number,
  handicap: number,
  par: number,
  strokeIndex: number,
): number {
  return quotaPoints(netScore(gross, handicap, strokeIndex), par)
}

export interface SkinHoleResult {
  /** Player id of the outright winner, or null on a push. */
  winnerId: string | null
  /** Dollars in the pot for this hole (what the winner takes, or what carries). */
  pot: number
  /** True when the hole is a push (tie for the lead). */
  push: boolean
  /** True when all 4 gross scores were present so the result is final. */
  complete: boolean
}

/**
 * Compute quota-point skins across a round.
 * Each hole adds $1 to the pot. Outright highest quota points wins the pot
 * (pot then resets). A tie for the lead pushes and the pot carries forward.
 *
 * Returns per-hole results plus running winnings per player id.
 */
export function computeSkins(
  players: Player[],
  round: Round,
  course: Course,
): { holes: SkinHoleResult[]; winnings: Record<string, number>; potCarrying: number } {
  const winnings: Record<string, number> = {}
  players.forEach((p) => (winnings[p.id] = 0))

  const holes: SkinHoleResult[] = []
  let carry = 0

  for (let h = 0; h < 18; h++) {
    const pot = carry + 1
    const entries = round.gross[h] ?? {}
    const allEntered = players.every((p) => typeof entries[p.id] === 'number')

    if (!allEntered) {
      // Not final yet: reflect the pot that WOULD be at stake but don't award.
      // The pot is shown as at-stake but not awarded. Carry is left unchanged
      // so the displayed pot stays consistent once the scores fill in.
      holes.push({ winnerId: null, pot, push: false, complete: false })
      continue
    }

    const pts = players.map((p) => ({
      id: p.id,
      pts: holePoints(entries[p.id], p.handicap, course.par[h], course.si[h]),
    }))
    const max = Math.max(...pts.map((x) => x.pts))
    const leaders = pts.filter((x) => x.pts === max)

    if (leaders.length === 1) {
      const winnerId = leaders[0].id
      winnings[winnerId] += pot
      holes.push({ winnerId, pot, push: false, complete: true })
      carry = 0
    } else {
      holes.push({ winnerId: null, pot, push: true, complete: true })
      carry = pot
    }
  }

  // `carry` now reflects unclaimed money carried past the last completed hole.
  return { holes, winnings, potCarrying: carry }
}

export interface PlayerRoundLine {
  playerId: string
  quota: number
  points: number
  /** Number of holes with a gross score entered. */
  holesPlayed: number
  margin: number
}

/** Per-player quota totals for a round (points so far vs full quota). */
export function playerRoundLines(
  players: Player[],
  round: Round,
  course: Course,
): PlayerRoundLine[] {
  return players.map((p) => {
    let points = 0
    let holesPlayed = 0
    for (let h = 0; h < 18; h++) {
      const g = round.gross[h]?.[p.id]
      if (typeof g === 'number') {
        points += holePoints(g, p.handicap, course.par[h], course.si[h])
        holesPlayed++
      }
    }
    const q = quota(p.handicap)
    return { playerId: p.id, quota: q, points, holesPlayed, margin: points - q }
  })
}

/** The two teams for a pairing split, as arrays of player index [0..3]. */
export function teamsForSplit(split: PairingSplit): [[number, number], [number, number]] {
  switch (split) {
    case 0:
      return [
        [0, 1],
        [2, 3],
      ]
    case 1:
      return [
        [0, 2],
        [1, 3],
      ]
    case 2:
      return [
        [0, 3],
        [1, 2],
      ]
  }
}

export const SPLIT_LABELS = ['A+B vs C+D', 'A+C vs B+D', 'A+D vs B+C'] as const

export interface TeamLine {
  playerIds: [string, string]
  quota: number
  points: number
  margin: number
}

export interface MatchResult {
  teams: [TeamLine, TeamLine]
  /** 0 or 1 index of winning team, or null if tied. */
  winner: number | null
}

/** Compute the 2v2 team match for a round. */
export function teamMatch(players: Player[], round: Round, course: Course): MatchResult {
  const lines = playerRoundLines(players, round, course)
  const byId: Record<string, PlayerRoundLine> = {}
  lines.forEach((l) => (byId[l.playerId] = l))

  const [t0, t1] = teamsForSplit(round.pairing)

  const build = (idx: [number, number]): TeamLine => {
    const a = players[idx[0]]
    const b = players[idx[1]]
    const la = byId[a.id]
    const lb = byId[b.id]
    return {
      playerIds: [a.id, b.id],
      quota: la.quota + lb.quota,
      points: la.points + lb.points,
      margin: la.margin + lb.margin,
    }
  }

  const team0 = build(t0)
  const team1 = build(t1)
  let winner: number | null = null
  if (team0.margin > team1.margin) winner = 0
  else if (team1.margin > team0.margin) winner = 1

  return { teams: [team0, team1], winner }
}
