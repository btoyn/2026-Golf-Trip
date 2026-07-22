import type { PairingSplit, Player } from '../types'
import { teamsForSplit } from './scoring'

export { COURSES } from '../data/courses'

/** Human-readable pairing label using real names, e.g. "Al+Bob vs Cy+Deb". */
export function SPLIT_LABELS_FROM(players: Player[], split: PairingSplit): string {
  if (players.length !== 4) return ''
  const [t0, t1] = teamsForSplit(split)
  const name = (i: number) => players[i]?.name ?? '?'
  return `${name(t0[0])}+${name(t0[1])} vs ${name(t1[0])}+${name(t1[1])}`
}
