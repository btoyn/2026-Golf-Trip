import type { Course, PairingSplit, Player, Round, ScoringMode, WolfMode } from '../types'

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
 * The score used for scoring a hole, honoring the round's net/gross toggle.
 * In gross mode the raw strokes are used; in net mode handicap strokes apply.
 */
export function effectiveScore(
  gross: number,
  handicap: number,
  strokeIndex: number,
  mode: ScoringMode,
): number {
  return mode === 'gross' ? gross : netScore(gross, handicap, strokeIndex)
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

/** Quota points for a player on a hole, honoring the net/gross mode. */
export function holePoints(
  gross: number,
  handicap: number,
  par: number,
  strokeIndex: number,
  mode: ScoringMode = 'net',
): number {
  return quotaPoints(effectiveScore(gross, handicap, strokeIndex, mode), par)
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
function emptySkin(players: Player[]): SkinGameResult {
  const winnings: Record<string, number> = {}
  players.forEach((p) => (winnings[p.id] = 0))
  const holes: SkinHoleResult[] = Array.from({ length: 18 }, () => ({
    winnerId: null,
    pot: 0,
    push: false,
    complete: false,
  }))
  return { holes, winnings, potCarrying: 0 }
}

function carrySkins(
  players: Player[],
  values: (Record<string, number> | null)[],
  mode: 'high' | 'low',
  tieMode: 'wash' | 'carry',
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
      // carry+stack, or wash (pot forfeited, next hole starts fresh)
      carry = tieMode === 'carry' ? pot : 0
    }
  }

  return { holes, winnings, potCarrying: carry }
}

/** Skin game 1: outright best quota points on the hole. */
export function computePointsSkins(
  players: Player[],
  round: Round,
  course: Course,
): SkinGameResult {
  if (!round.skins.points) return emptySkin(players)
  const values = round.gross.map((entries, h) => {
    if (!players.every((p) => typeof entries[p.id] === 'number')) return null
    const m: Record<string, number> = {}
    players.forEach((p) => {
      m[p.id] = holePoints(entries[p.id], p.handicap, course.par[h], course.si[h], round.scoring)
    })
    return m
  })
  return carrySkins(players, values, 'high', round.tieMode)
}

/** Skin game 2: fewest putts on the hole. Ties push and carry. */
export function computePuttsSkins(players: Player[], round: Round): SkinGameResult {
  if (!round.skins.putts) return emptySkin(players)
  const values = round.putts.map((entries) => {
    if (!players.every((p) => typeof entries[p.id] === 'number')) return null
    const m: Record<string, number> = {}
    players.forEach((p) => (m[p.id] = entries[p.id]))
    return m
  })
  return carrySkins(players, values, 'low', round.tieMode)
}

/**
 * Skin game 3: longest putt. This is a manual per-hole pick (no carry) — the
 * marked player takes one unit for that hole.
 */
export function computeLongestPuttSkins(players: Player[], round: Round, unit = SKIN_UNIT): SkinGameResult {
  if (!round.skins.longest) return emptySkin(players)
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
  /** Combined winnings across all enabled games, per player id. */
  total: Record<string, number>
  /** True if any of the three skins games is enabled this round. */
  any: boolean
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
  return {
    points,
    putts,
    longest,
    total,
    any: round.skins.points || round.skins.putts || round.skins.longest,
  }
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
        points += holePoints(g, p.handicap, course.par[h], course.si[h], round.scoring)
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

// ---------------------------------------------------------------------------
// Vegas
// ---------------------------------------------------------------------------

export interface VegasHole {
  /** Two-digit team numbers [team0, team1], or null if the hole isn't complete. */
  numbers: [number, number] | null
  diff: number
  /** 0 or 1 index of the winning team, or null on a tie. */
  winner: number | null
  complete: boolean
}

export interface VegasResult {
  holes: VegasHole[]
  /** Running point totals [team0, team1]. */
  points: [number, number]
  teams: [[string, string], [string, string]]
}

/**
 * Vegas: the round's two pairs each form a two-digit number from their
 * (capped-at-9) scores, low digit first. The difference goes to the low team.
 */
export function computeVegas(players: Player[], round: Round, course: Course): VegasResult {
  const [t0, t1] = teamsForSplit(round.pairing)
  const points: [number, number] = [0, 0]
  const holes: VegasHole[] = []

  const teamNumber = (idx: [number, number], h: number, entries: Record<string, number>) => {
    const a = players[idx[0]]
    const b = players[idx[1]]
    const sa = Math.min(9, effectiveScore(entries[a.id], a.handicap, course.si[h], round.scoring))
    const sb = Math.min(9, effectiveScore(entries[b.id], b.handicap, course.si[h], round.scoring))
    const lo = Math.min(sa, sb)
    const hi = Math.max(sa, sb)
    return lo * 10 + hi
  }

  for (let h = 0; h < 18; h++) {
    const entries = round.gross[h] ?? {}
    const need = [...t0, ...t1].map((i) => players[i].id)
    if (!need.every((id) => typeof entries[id] === 'number')) {
      holes.push({ numbers: null, diff: 0, winner: null, complete: false })
      continue
    }
    const n0 = teamNumber(t0, h, entries)
    const n1 = teamNumber(t1, h, entries)
    let winner: number | null = null
    let diff = 0
    if (n0 < n1) {
      winner = 0
      diff = n1 - n0
      points[0] += diff
    } else if (n1 < n0) {
      winner = 1
      diff = n0 - n1
      points[1] += diff
    }
    holes.push({ numbers: [n0, n1], diff, winner, complete: true })
  }

  return {
    holes,
    points,
    teams: [
      [players[t0[0]].id, players[t0[1]].id],
      [players[t1[0]].id, players[t1[1]].id],
    ],
  }
}

// ---------------------------------------------------------------------------
// Match play (Stableford & Vegas)
// ---------------------------------------------------------------------------

export interface MatchPlayResult {
  teams: [[string, string], [string, string]]
  /** Per hole: 0/1 winning team, null halve, undefined not complete. */
  holeWinners: (number | null | undefined)[]
  /** Signed holes: positive = team0 up. */
  up: number
  leader: number | null
  holesPlayed: number
  remaining: number
  /** True once the match is mathematically clinched or 18 are done with a leader. */
  decided: boolean
  /** Human status, e.g. "3 & 2", "Dormie 2", "2 UP", "All Square". */
  status: string
}

/**
 * Hole-by-hole team match for Stableford or Vegas. Each hole is won by the
 * team with more combined quota points (Stableford) or the lower Vegas number
 * (Vegas); equal halves the hole.
 */
export function computeMatchPlay(players: Player[], round: Round, course: Course): MatchPlayResult {
  const [t0, t1] = teamsForSplit(round.pairing)
  const teams: [[string, string], [string, string]] = [
    [players[t0[0]].id, players[t0[1]].id],
    [players[t1[0]].id, players[t1[1]].id],
  ]
  const holeWinners: (number | null | undefined)[] = []
  let up = 0
  let played = 0

  const vegasNum = (idx: [number, number], h: number, e: Record<string, number>) => {
    const a = players[idx[0]]
    const b = players[idx[1]]
    const sa = Math.min(9, effectiveScore(e[a.id], a.handicap, course.si[h], round.scoring))
    const sb = Math.min(9, effectiveScore(e[b.id], b.handicap, course.si[h], round.scoring))
    return Math.min(sa, sb) * 10 + Math.max(sa, sb)
  }
  const stablePts = (idx: [number, number], h: number, e: Record<string, number>) => {
    const a = players[idx[0]]
    const b = players[idx[1]]
    return (
      holePoints(e[a.id], a.handicap, course.par[h], course.si[h], round.scoring) +
      holePoints(e[b.id], b.handicap, course.par[h], course.si[h], round.scoring)
    )
  }

  for (let h = 0; h < 18; h++) {
    const e = round.gross[h] ?? {}
    const need = [...t0, ...t1].map((i) => players[i].id)
    if (!need.every((id) => typeof e[id] === 'number')) {
      holeWinners.push(undefined)
      continue
    }
    played++
    let w: number | null
    if (round.game === 'vegas') {
      const n0 = vegasNum(t0, h, e)
      const n1 = vegasNum(t1, h, e)
      w = n0 < n1 ? 0 : n1 < n0 ? 1 : null
    } else {
      const p0 = stablePts(t0, h, e)
      const p1 = stablePts(t1, h, e)
      w = p0 > p1 ? 0 : p1 > p0 ? 1 : null
    }
    holeWinners.push(w)
    if (w === 0) up++
    else if (w === 1) up--
  }

  const remaining = 18 - played
  const lead = Math.abs(up)
  const leader = up > 0 ? 0 : up < 0 ? 1 : null

  let status: string
  let decided = false
  if (leader === null) {
    status = 'All Square'
  } else if (remaining === 0) {
    status = `${lead} UP`
    decided = true
  } else if (lead > remaining) {
    status = `${lead} & ${remaining}`
    decided = true
  } else if (lead === remaining) {
    status = `Dormie ${lead}`
  } else {
    status = `${lead} UP`
  }

  return { teams, holeWinners, up, leader, holesPlayed: played, remaining, decided, status }
}

// ---------------------------------------------------------------------------
// Wolf
// ---------------------------------------------------------------------------

export type WolfOutcome = 'wolf' | 'opp' | 'tie' | 'pending'

export interface WolfHole {
  wolfId: string
  mode: WolfMode | null
  partnerId: string | null
  wolfTeam: string[]
  oppTeam: string[]
  outcome: WolfOutcome
  /** Stake for the hole (1, times any carried ties). */
  base: number
  /** Point change per player id for this hole. */
  deltas: Record<string, number>
}

export interface WolfResult {
  holes: WolfHole[]
  points: Record<string, number>
}

/** The player id who is the Wolf on a given hole (rotates by tee/setup order). */
export function wolfForHole(players: Player[], hole: number): string {
  return players[hole % players.length].id
}

/**
 * Wolf: one rotating Wolf per hole either partners up (2v2), goes Lone (2x)
 * or Blind Lone (3x). Teams are scored by combined total; a Lone Wolf plays
 * their single score against the best of the other three.
 */
export function computeWolf(players: Player[], round: Round, course: Course): WolfResult {
  const points: Record<string, number> = {}
  players.forEach((p) => (points[p.id] = 0))
  const holes: WolfHole[] = []
  let carry = 0

  const eff = (id: string, h: number, entries: Record<string, number>) => {
    const p = players.find((x) => x.id === id)!
    return effectiveScore(entries[id], p.handicap, course.si[h], round.scoring)
  }

  for (let h = 0; h < 18; h++) {
    const wolfId = wolfForHole(players, h)
    const call = round.wolf[h]
    const entries = round.gross[h] ?? {}
    const deltas: Record<string, number> = {}
    players.forEach((p) => (deltas[p.id] = 0))

    // Build teams from the call.
    let wolfTeam: string[] = [wolfId]
    let oppTeam: string[] = players.filter((p) => p.id !== wolfId).map((p) => p.id)
    if (call?.mode === 'partner' && call.partnerId) {
      wolfTeam = [wolfId, call.partnerId]
      oppTeam = players.filter((p) => p.id !== wolfId && p.id !== call.partnerId).map((p) => p.id)
    }

    const allEntered = players.every((p) => typeof entries[p.id] === 'number')

    if (!call || !allEntered) {
      holes.push({
        wolfId,
        mode: call?.mode ?? null,
        partnerId: call?.partnerId ?? null,
        wolfTeam,
        oppTeam,
        outcome: 'pending',
        base: round.tieMode === 'carry' ? 1 + carry : 1,
        deltas,
      })
      continue
    }

    // Team scores.
    const wolfScore =
      call.mode === 'partner'
        ? wolfTeam.reduce((sum, id) => sum + eff(id, h, entries), 0)
        : eff(wolfId, h, entries)
    const oppScore =
      call.mode === 'partner'
        ? oppTeam.reduce((sum, id) => sum + eff(id, h, entries), 0)
        : Math.min(...oppTeam.map((id) => eff(id, h, entries)))

    const base = round.tieMode === 'carry' ? 1 + carry : 1
    const mult = call.mode === 'partner' ? 1 : call.mode === 'lone' ? 2 : 3
    const perOpp = base * mult

    let outcome: WolfOutcome
    if (wolfScore === oppScore) {
      outcome = 'tie'
      if (round.tieMode === 'carry') carry += 1
    } else {
      const wolfWins = wolfScore < oppScore
      const winners = wolfWins ? wolfTeam : oppTeam
      const losers = wolfWins ? oppTeam : wolfTeam
      winners.forEach((id) => (deltas[id] += perOpp * losers.length))
      losers.forEach((id) => (deltas[id] -= perOpp * winners.length))
      outcome = wolfWins ? 'wolf' : 'opp'
      carry = 0
    }

    players.forEach((p) => (points[p.id] += deltas[p.id]))
    holes.push({ wolfId, mode: call.mode, partnerId: call.partnerId, wolfTeam, oppTeam, outcome, base, deltas })
  }

  return { holes, points }
}
