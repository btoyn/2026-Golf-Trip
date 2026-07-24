/* Lightweight assertions runnable with `npm test` (tsx). */
import type { Course, Player, Round } from '../types'
import {
  computeAllSkins,
  computeLongestPuttSkins,
  computeMatchPlay,
  computePointsSkins,
  computePuttsSkins,
  computeVegas,
  computeWolf,
  holePoints,
  quota,
  quotaPoints,
  strokesReceived,
  teamMatch,
  wolfForHole,
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
    game: 'stableford',
    scoring: 'net',
    format: 'stroke',
    tieMode: 'carry',
    skins: { points: true, putts: true, longest: true },
    gross: Array.from({ length: 18 }, () => ({})),
    putts: Array.from({ length: 18 }, () => ({})),
    longestPutt: Array.from({ length: 18 }, () => null),
    wolf: Array.from({ length: 18 }, () => null),
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

// ---- Net/Gross toggle ----
// hcp 18 gets 1 stroke every hole. Gross 5 on par 4: net 4 (par=2pts), gross 5 (bogey=1pt).
eq(holePoints(5, 18, 4, 1, 'net'), 2, 'net mode: gross5 hcp18 -> net par -> 2')
eq(holePoints(5, 18, 4, 1, 'gross'), 1, 'gross mode: gross5 -> bogey -> 1')

// ---- Skins toggle off ----
const roff = emptyRound()
roff.skins = { points: false, putts: true, longest: true }
roff.gross[0] = { a: 3, b: 4, c: 4, d: 4 }
const offSkins = computeAllSkins(players, roff, course)
eq(offSkins.points.winnings['a'], 0, 'points skin disabled -> no winnings')

// ---- Tie mode wash (skins) ----
const rw = emptyRound()
rw.tieMode = 'wash'
rw.gross[0] = { a: 3, b: 3, c: 4, d: 4 } // tie for best -> wash (no carry)
rw.gross[1] = { a: 3, b: 4, c: 4, d: 4 } // A alone
const washSkins = computePointsSkins(players, rw, course)
eq(washSkins.holes[0].push, true, 'wash h1 push')
eq(washSkins.holes[1].pot, 0.25, 'wash h2 pot back to base $0.25 (no carry)')
eq(washSkins.winnings['a'], 0.25, 'wash: A wins only $0.25')

// ---- Vegas ----
const rv = emptyRound()
rv.game = 'vegas'
rv.pairing = 0 // A+B vs C+D
// A net4 B net5 -> 45 ; C net5 D net6 -> 56 ; diff 11 to team0
rv.gross[0] = { a: 4, b: 5, c: 5, d: 6 }
const vegas = computeVegas(players, rv, course)
eq(vegas.holes[0].numbers, [45, 56], 'vegas h1 numbers 45 vs 56')
eq(vegas.holes[0].winner, 0, 'vegas h1 team0 wins')
eq(vegas.points, [11, 0], 'vegas team0 +11')
// cap at 9: net 12 becomes 9
const rv2 = emptyRound()
rv2.game = 'vegas'
rv2.pairing = 0
rv2.gross[0] = { a: 4, b: 12, c: 5, d: 6 } // team0: 4 & 9 -> 49 ; team1: 56 ; team1 wins 56<49? no 49<56 team0 wins diff7
eq(computeVegas(players, rv2, course).holes[0].numbers, [49, 56], 'vegas caps 12 at 9 -> 49')

// ---- Wolf ----
eq(wolfForHole(players, 0), 'a', 'wolf hole1 = A')
eq(wolfForHole(players, 1), 'b', 'wolf hole2 = B')
eq(wolfForHole(players, 4), 'a', 'wolf hole5 = A (rotates)')

// Wolf partner win: A wolf picks B. A+B combined 7 vs C+D combined 9 -> wolf team wins.
const rwolf = emptyRound()
rwolf.game = 'wolf'
rwolf.wolf[0] = { mode: 'partner', partnerId: 'b' }
rwolf.gross[0] = { a: 3, b: 4, c: 4, d: 5 } // A+B=7, C+D=9
let wres = computeWolf(players, rwolf, course)
eq(wres.holes[0].outcome, 'wolf', 'wolf partner win outcome')
eq(wres.points['a'], 2, 'wolf partner win: A +2')
eq(wres.points['b'], 2, 'wolf partner win: B +2')
eq(wres.points['c'], -2, 'wolf partner win: C -2')
eq(wres.points['d'], -2, 'wolf partner win: D -2')

// Lone wolf win: A alone (3) beats best of others (min 4) -> +2 from each of 3 = +6
const rlone = emptyRound()
rlone.game = 'wolf'
rlone.wolf[0] = { mode: 'lone', partnerId: null }
rlone.gross[0] = { a: 3, b: 4, c: 5, d: 6 }
wres = computeWolf(players, rlone, course)
eq(wres.points['a'], 6, 'lone win: A +6')
eq(wres.points['b'], -2, 'lone win: B -2')
eq(wres.points['c'], -2, 'lone win: C -2')
eq(wres.points['d'], -2, 'lone win: D -2')

// Blind lone loss: A alone (6) worse than best other (3) -> -3 to each of 3 = -9
const rblind = emptyRound()
rblind.game = 'wolf'
rblind.wolf[0] = { mode: 'blind', partnerId: null }
rblind.gross[0] = { a: 6, b: 3, c: 4, d: 5 }
wres = computeWolf(players, rblind, course)
eq(wres.points['a'], -9, 'blind lone loss: A -9')
eq(wres.points['b'], 3, 'blind lone loss: B +3')

// ---- Match play (Stableford) ----
// split 0 => A+B vs C+D. Give team0 more points on holes 1-3, tie hole 4.
const rm = emptyRound()
rm.game = 'stableford'
rm.pairing = 0
rm.gross[0] = { a: 3, b: 3, c: 4, d: 4 } // team0 pts 6 vs 4 -> team0 wins
rm.gross[1] = { a: 3, b: 4, c: 4, d: 4 } // team0 5 vs 4 -> team0
rm.gross[2] = { a: 3, b: 4, c: 4, d: 4 } // team0 wins
rm.gross[3] = { a: 4, b: 4, c: 4, d: 4 } // all par -> halve
const mp = computeMatchPlay(players, rm, course)
eq(mp.up, 3, 'match: team0 3 up')
eq(mp.leader, 0, 'match: leader team0')
eq(mp.holesPlayed, 4, 'match: 4 holes played')
eq(mp.status, '3 UP', 'match: 3 UP thru 4')

// Closed out: team0 up 3 with only 2 to play -> "3 & 2"
const rm2 = emptyRound()
rm2.game = 'stableford'
rm2.pairing = 0
for (let hh = 0; hh < 16; hh++) rm2.gross[hh] = { a: 4, b: 4, c: 4, d: 4 } // 16 halves
rm2.gross[13] = { a: 3, b: 4, c: 4, d: 4 }
rm2.gross[14] = { a: 3, b: 4, c: 4, d: 4 }
rm2.gross[15] = { a: 3, b: 4, c: 4, d: 4 } // team0 wins 14,15,16 -> 3 up, 2 to play
const mp2 = computeMatchPlay(players, rm2, course)
eq(mp2.up, 3, 'match2: team0 3 up')
eq(mp2.status, '3 & 2', 'match2: closed out 3 & 2')
eq(mp2.decided, true, 'match2: decided')

// Vegas match play: lower number wins the hole
const rmv = emptyRound()
rmv.game = 'vegas'
rmv.pairing = 0
rmv.gross[0] = { a: 4, b: 5, c: 5, d: 6 } // team0 45 vs team1 56 -> team0 wins hole
const mpv = computeMatchPlay(players, rmv, course)
eq(mpv.up, 1, 'vegas match: team0 1 up')
eq(mpv.status, '1 UP', 'vegas match: 1 UP')

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`)
  process.exit(1)
} else {
  console.log('\nAll scoring tests passed')
}
