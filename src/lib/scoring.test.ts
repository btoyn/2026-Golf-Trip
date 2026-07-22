/* Lightweight assertions runnable with `npm test` (tsx). */
import type { Course, Player, Round } from '../types'
import {
  computeAllSkins,
  computeLongestPuttSkins,
  computePointsSkins,
  computePuttsSkins,
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
  return {
    index: 0,
    pairing: 0,
    gross: Array.from({ length: 18 }, () => ({})),
    putts: Array.from({ length: 18 }, () => ({})),
    longestPutt: Array.from({ length: 18 }, () => null),
    locked: false,
  }
}

// Points skin: hole 1 outright winner (A birdies), everyone else par. $0.25.
const r = emptyRound()
r.gross[0] = { a: 3, b: 4, c: 4, d: 4 }
let skins = computePointsSkins(players, r, course)
eq(skins.holes[0].winnerId, 'a', 'points skin h1 outright winner A')
eq(skins.holes[0].pot, 0.25, 'points skin h1 pot = $0.25')
eq(skins.winnings['a'], 0.25, 'A wins $0.25')

// Push then carry: h1 tie (A & B birdie) -> push; h2 A birdies alone -> wins $0.50
const r2 = emptyRound()
r2.gross[0] = { a: 3, b: 3, c: 4, d: 4 }
r2.gross[1] = { a: 3, b: 4, c: 4, d: 4 }
skins = computePointsSkins(players, r2, course)
eq(skins.holes[0].push, true, 'h1 push')
eq(skins.holes[0].pot, 0.25, 'h1 pot $0.25 carries')
eq(skins.holes[1].winnerId, 'a', 'h2 A wins')
eq(skins.holes[1].pot, 0.5, 'h2 pot = $0.50 (carry + 0.25)')
eq(skins.winnings['a'], 0.5, 'A total $0.50')

// Fewest-putts skin (lowest wins). h1 B alone lowest (1 putt) -> B wins $0.25.
const rp = emptyRound()
rp.putts[0] = { a: 2, b: 1, c: 2, d: 3 }
// h2 tie for fewest (A & B both 1) -> push, carries; h3 A alone 1 -> wins $0.75
rp.putts[1] = { a: 1, b: 1, c: 2, d: 2 }
rp.putts[2] = { a: 1, b: 2, c: 2, d: 2 }
const puttSkins = computePuttsSkins(players, rp)
eq(puttSkins.holes[0].winnerId, 'b', 'putts h1 B fewest')
eq(puttSkins.holes[0].pot, 0.25, 'putts h1 pot $0.25')
eq(puttSkins.holes[1].push, true, 'putts h2 tie push')
eq(puttSkins.holes[2].winnerId, 'a', 'putts h3 A wins carry')
eq(puttSkins.holes[2].pot, 0.5, 'putts h3 pot $0.50 (h2 carry $0.25 + h3 $0.25)')
eq(puttSkins.winnings['a'], 0.5, 'A putts total $0.50')
eq(puttSkins.winnings['b'], 0.25, 'B putts total $0.25')

// Longest-putt skin: manual pick, no carry, $0.25 each marked hole.
const rl = emptyRound()
rl.longestPutt[0] = 'c'
rl.longestPutt[5] = 'c'
const longSkins = computeLongestPuttSkins(players, rl)
eq(longSkins.winnings['c'], 0.5, 'C longest-putt total $0.50 (2 holes)')
eq(longSkins.holes[0].winnerId, 'c', 'long h1 winner C')
eq(longSkins.holes[1].complete, false, 'long h2 unmarked -> not complete')

// Combined total across the three games for a single hole.
const rc = emptyRound()
rc.gross[0] = { a: 3, b: 4, c: 4, d: 4 } // points skin -> A
rc.putts[0] = { a: 2, b: 1, c: 2, d: 2 } // putts skin -> B
rc.longestPutt[0] = 'c' // long putt -> C
const all = computeAllSkins(players, rc, course)
eq(all.total['a'], 0.25, 'combined A $0.25 (points)')
eq(all.total['b'], 0.25, 'combined B $0.25 (putts)')
eq(all.total['c'], 0.25, 'combined C $0.25 (long putt)')
eq(all.total['d'], 0, 'combined D $0')

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
