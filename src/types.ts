export interface Player {
  id: string
  name: string
  handicap: number
}

export interface Course {
  /** Day label, e.g. "Thursday" */
  day: string
  name: string
  /** 18 pars */
  par: number[]
  /** 18 stroke indexes */
  si: number[]
}

/**
 * A pairing split for 4 players in setup order [A, B, C, D].
 * 0 => A+B vs C+D
 * 1 => A+C vs B+D
 * 2 => A+D vs B+C
 */
export type PairingSplit = 0 | 1 | 2

/** The main game played in a round. */
export type GameType = 'stableford' | 'vegas' | 'wolf'

/** Whether scores are handicap-adjusted (net) or raw (gross) for the round. */
export type ScoringMode = 'net' | 'gross'

/** How a tie on a hole is handled where applicable. */
export type TieMode = 'wash' | 'carry'

/** Which of the three skins games are running this round. */
export interface SkinsConfig {
  points: boolean
  putts: boolean
  longest: boolean
}

export type WolfMode = 'partner' | 'lone' | 'blind'

/** The Wolf's decision on a hole. */
export interface WolfCall {
  mode: WolfMode
  /** Chosen partner id when mode === 'partner'. */
  partnerId: string | null
}

export interface Round {
  /** 0..3 => Thu/Fri/Sat/Sun (also index into COURSES) */
  index: number
  pairing: PairingSplit
  /** Main game for the round. */
  game: GameType
  /** Net or gross scoring for the round (applies to all active games). */
  scoring: ScoringMode
  /** Tie handling for the round (wash or carry+stack). */
  tieMode: TieMode
  /** Which skins games are on this round. */
  skins: SkinsConfig
  /**
   * gross[hole][playerId] = strokes, or missing if not entered.
   * hole is 0..17.
   */
  gross: Record<string, number>[]
  /** putts[hole][playerId] = putts on that hole (for the fewest-putts skin). */
  putts: Record<string, number>[]
  /** longestPutt[hole] = playerId who made the longest putt, or null. */
  longestPutt: (string | null)[]
  /** wolf[hole] = the Wolf's call that hole, or null if not set. */
  wolf: (WolfCall | null)[]
  locked: boolean
}

export interface TripState {
  players: Player[]
  rounds: Round[]
  version: number
}
