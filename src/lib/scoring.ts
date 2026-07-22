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

/** Every skin (all three games) is worth 25 cents per hole. */
export const SKIN_UNIT = 0.25

export interface SkinHoleResult {
  /** Player id of the outright winner, or null on a push / not-yet-decided. */
  winnerId: string | null
  /** Dollars in the pot for this hole (what the winner takes, or what carries). */
  pot: number
  /** True when the hole is a push (tie for the lead). */
  push: boolean
  /** True when the hole result is final (all needed inputs present). */
  complete: boolean
}

export interface SkinGameResult {
  holes: SkinHoleResult[]
  winnings: Record<string, number>
  /** Unclaimed money carried past the last completed hole. */
  potCarrying: number
}

/**
 * Generic carry-style skin: each hole adds one unit to the pot; an outright
 * best score wins the pot (which then resets); a tie for the best pushes and
 * the pot carries forward. `values[h]` is a map of playerId -> comparable
 * number for that hole, or null when the hole isn't fully entered yet.
 */
function carrySkins(
  players: Player[],
  values: (Record<string, number> | null)[],
  mode: 'high' | 'low',
  unit = SKIN_UNIT,
): SkinGameResult {
  const winnings: Record<string, number> = {}
  players.forEach((p) => (winnings[p.id] = 0))

  const holes: SkinHoleResult[] = []
  let carry = 0

  for (let h = 0; h < 18; h++) {
    const pot = carry + unit
    const v = values[h]
    if (!v) {
      holes.push({ winnerId: null, pot, push: false, complete: false })
      continue
    }
    const arr = players.map((p) => ({ id: p.id, val: v[p.id] }))
    const nums = arr.map((a) => a.val)
    const target = mode === 'high' ? Math.max(...nums) : Math.min(...nums)
    const leaders = arr.filter((a) => a.val === target)

    if (leaders.length === 1) {
      winnings[leaders[0].id] += pot
      holes.push({ winnerId: leaders[0].id, pot, push: false, complete: true })
      carry = 0
    } else {
      holes.push({ winnerId: null, pot, push: true, complete: true })
      carry = pot
    }
  }

  return { holes, winnings, potCarrying: carry }
}

/** Skin game 1: outright highest quota points on the hole (net-based). */
export function computePointsSkins(
  players: Player[],
  round: Round,
  course: Course,
): SkinGameResult {
  const values = round.gross.map((entries, h) => {
    if (!players.every((p) => typeof entries[p.id] === 'number')) return null
    const m: Record<string, number> = {}
    players.forEach((p) => {
      m[p.id] = holePoints(entries[p.id], p.handicap, course.par[h], course.si[h])
    })
    return m
  })
  return carrySkins(players, values, 'high')
}

/** Skin game 2: fewest putts on the hole. Ties push and carry. */
export function computePuttsSkins(players: Player[], round: Round): SkinGameResult {
  const values = round.putts.map((entries) => {
    if (!players.every((p) => typeof entries[p.id] === 'number')) return null
    const m: Record<string, number> = {}
    players.forEach((p) => (m[p.id] = entries[p.id]))
    return m
  })
  return carrySkins(players, values, 'low')
}

/**
 * Skin game 3: longest putt. This is a manual per-hole pick (no carry) — the
 * marked player takes one unit for that hole.
 */
export function computeLongestPuttSkins(players: Player[], round: Round, unit = SKIN_UNIT): SkinGameResult {
  const winnings: Record<string, number> = {}
  players.forEach((p) => (winnings[p.id] = 0))
  const holes: SkinHoleResult[] = round.longestPutt.map((winnerId) => {
    if (winnerId && winnings[winnerId] !== undefined) {
      winnings[winnerId] += unit
      return { winnerId, pot: unit, push: false, complete: true }
    }
    return { winnerId: null, pot: unit, push: false, complete: false }
  })
  return { holes, winnings, potCarrying: 0 }
}

export interface AllSkins {
  points: SkinGameResult
  putts: SkinGameResult
  longest: SkinGameResult
  /** Combined winnings across all three games, per player id. */
  total: Record<string, number>
}

/** Compute all three skin games plus a combined per-player total. */
export function computeAllSkins(players: Player[], round: Round, course: Course): AllSkins {
  const points = computePointsSkins(players, round, course)
  const putts = computePuttsSkins(players, round)
  const longest = computeLongestPuttSkins(players, round)
  const total: Record<string, number> = {}
  players.forEach((p) => {
    total[p.id] =
      points.winnings[p.id] + putts.winnings[p.id] + longest.winnings[p.id]
  })
  return { points, putts, longest, total }
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
