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

export interface Round {
  /** 0..3 => Thu/Fri/Sat/Sun (also index into COURSES) */
  index: number
  pairing: PairingSplit
  /**
   * gross[hole][playerId] = strokes, or missing if not entered.
   * hole is 0..17.
   */
  gross: Record<string, number>[]
  locked: boolean
}

export interface TripState {
  players: Player[]
  rounds: Round[]
  version: number
}
