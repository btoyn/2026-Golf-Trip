/* Lightweight assertions runnable with `npm test` (tsx). */
import type { Course, Player, Round } from '../types'
import {
  computeSkins,
  holePoints,
  quota,
  quotaPoints,
  strokesReceived,
  teamMatch,
} from './scoring'

let failures = 0
function eq(actual: unknown, expected: unknown, msg: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    failures++
    console.error(`FAIL: ${msg}\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(actual)}`)
  } else {
    console.log(`ok: ${msg}`)
  }
}

// quota
eq(quota(9), 27, 'quota(9)=27')
eq(quota(10.5), 25.5, 'quota(10.5)=25.5 (decimal)')

// strokesReceived
eq(strokesReceived(9, 9), 1, 'hcp 9, si 9 => 1 stroke')
eq(strokesReceived(9, 10), 0, 'hcp 9, si 10 => 0 strokes')
eq(strokesReceived(20, 2), 2, 'hcp 20, si 2 => 2 strokes (floor(20/18)=1 + si<=2)')
eq(strokesReceived(20, 3), 1, 'hcp 20, si 3 => 1 stroke')
eq(strokesReceived(10.5, 10), 1, 'hcp 10.5, si 10 => 1 (10<=10.5)')
eq(strokesReceived(10.5, 11), 0, 'hcp 10.5, si 11 => 0 (11>10.5)')
eq(strokesReceived(0, 1), 0, 'scratch => 0')

// quotaPoints (net vs par)
eq(quotaPoints(2, 4), 4, 'net eagle => 4')
eq(quotaPoints(3, 4), 3, 'net birdie => 3')
eq(quotaPoints(4, 4), 2, 'net par => 2')
eq(quotaPoints(5, 4), 1, 'net bogey => 1')
eq(quotaPoints(6, 4), 0, 'net double => 0')
eq(quotaPoints(9, 4), 0, 'net worse => 0 (floored)')

// holePoints: hcp 18 gets a stroke on every hole (floor(18/18)=1, si<=0 never)
eq(holePoints(5, 18, 4, 1), 2, 'gross bogey w/ 1 stroke on par4 => net par => 2')

const players: Player[] = [
  { id: 'a', name: 'A', handicap: 0 },
  { id: 'b', name: 'B', handicap: 0 },
  { id: 'c', name: 'C', handicap: 0 },
  { id: 'd', name: 'D', handicap: 0 },
]
const course: Course = {
  day: 'Test',
  name: 'Test',
  par: Array(18).fill(4),
  si: Array.from({ length: 18 }, (_, i) => i + 1),
}

function emptyRound(): Round {
  return { index: 0, pairing: 0, gross: Array.from({ length: 18 }, () => ({})), locked: false }
}

// Skins: hole 1 outright winner (A birdies), everyone else par.
const r = emptyRound()
r.gross[0] = { a: 3, b: 4, c: 4, d: 4 }
let skins = computeSkins(players, r, course)
eq(skins.holes[0].winnerId, 'a', 'skins h1 outright winner A')
eq(skins.holes[0].pot, 1, 'skins h1 pot = $1')
eq(skins.winnings['a'], 1, 'A wins $1')

// Skins push then carry: h1 tie (A & B birdie) -> push; h2 A birdies alone -> wins $2
const r2 = emptyRound()
r2.gross[0] = { a: 3, b: 3, c: 4, d: 4 }
r2.gross[1] = { a: 3, b: 4, c: 4, d: 4 }
skins = computeSkins(players, r2, course)
eq(skins.holes[0].push, true, 'h1 push')
eq(skins.holes[0].pot, 1, 'h1 pot $1 carries')
eq(skins.holes[1].winnerId, 'a', 'h2 A wins')
eq(skins.holes[1].pot, 2, 'h2 pot = $2 (carry + 1)')
eq(skins.winnings['a'], 2, 'A total $2')

// Team match: split 0 => A+B vs C+D. A&B each net birdie (pts 3), C&D net par (pts 2) on hole1.
const r3 = emptyRound()
r3.pairing = 0
r3.gross[0] = { a: 3, b: 3, c: 4, d: 4 }
const m = teamMatch(players, r3, course)
// combined quota each team = 36+36 = 72; points team0 = 6, team1 = 4
eq(m.teams[0].points, 6, 'team0 points 6')
eq(m.teams[1].points, 4, 'team1 points 4')
eq(m.teams[0].margin, 6 - 72, 'team0 margin')
eq(m.winner, 0, 'team0 wins (higher margin)')

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`)
  process.exit(1)
} else {
  console.log('\nAll scoring tests passed')
}
