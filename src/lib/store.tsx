import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { PairingSplit, Player, Round, TripState } from '../types'
import { DEFAULT_PAIRINGS } from '../data/courses'

const STORAGE_KEY = 'golf-trip-2026'
const CURRENT_VERSION = 1

function freshRounds(): Round[] {
  return DEFAULT_PAIRINGS.map((pairing, index) => ({
    index,
    pairing,
    gross: Array.from({ length: 18 }, () => ({})),
    putts: Array.from({ length: 18 }, () => ({})),
    longestPutt: Array.from({ length: 18 }, () => null),
    locked: false,
  }))
}

/** The trip's four golfers. Teams rotate; names are fixed defaults here. */
const DEFAULT_NAMES = ['Brandon', 'Chase', 'Vance', 'Nate']

function defaultPlayers(): Player[] {
  return DEFAULT_NAMES.map((name, i) => ({ id: `p${i}`, name, handicap: 0 }))
}

function emptyState(): TripState {
  return { players: defaultPlayers(), rounds: freshRounds(), version: CURRENT_VERSION }
}

function load(): TripState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as TripState
    if (!parsed.rounds || parsed.rounds.length !== 4) parsed.rounds = freshRounds()
    // Ensure each round has 18-length arrays (backfill older saves).
    parsed.rounds.forEach((r) => {
      if (!Array.isArray(r.gross) || r.gross.length !== 18) {
        r.gross = Array.from({ length: 18 }, () => ({}))
      }
      if (!Array.isArray(r.putts) || r.putts.length !== 18) {
        r.putts = Array.from({ length: 18 }, () => ({}))
      }
      if (!Array.isArray(r.longestPutt) || r.longestPutt.length !== 18) {
        r.longestPutt = Array.from({ length: 18 }, () => null)
      }
    })
    if (!parsed.players || parsed.players.length !== 4) parsed.players = defaultPlayers()
    return parsed
  } catch {
    return emptyState()
  }
}

interface Store {
  state: TripState
  setPlayers: (players: Player[]) => void
  setScore: (roundIndex: number, hole: number, playerId: string, gross: number | null) => void
  setPutts: (roundIndex: number, hole: number, playerId: string, putts: number | null) => void
  setLongestPutt: (roundIndex: number, hole: number, playerId: string | null) => void
  setPairing: (roundIndex: number, pairing: PairingSplit) => void
  setLocked: (roundIndex: number, locked: boolean) => void
  resetAll: () => void
  hasPlayers: boolean
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TripState>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full or unavailable; ignore — app still works in-memory.
    }
  }, [state])

  const setPlayers = useCallback((players: Player[]) => {
    setState((s) => ({ ...s, players }))
  }, [])

  const setScore = useCallback(
    (roundIndex: number, hole: number, playerId: string, gross: number | null) => {
      setState((s) => {
        const rounds = s.rounds.map((r) => {
          if (r.index !== roundIndex) return r
          const grossArr = r.gross.map((h) => ({ ...h }))
          if (gross === null || Number.isNaN(gross)) {
            delete grossArr[hole][playerId]
          } else {
            grossArr[hole][playerId] = gross
          }
          return { ...r, gross: grossArr }
        })
        return { ...s, rounds }
      })
    },
    [],
  )

  const setPutts = useCallback(
    (roundIndex: number, hole: number, playerId: string, putts: number | null) => {
      setState((s) => {
        const rounds = s.rounds.map((r) => {
          if (r.index !== roundIndex) return r
          const puttsArr = r.putts.map((h) => ({ ...h }))
          if (putts === null || Number.isNaN(putts)) {
            delete puttsArr[hole][playerId]
          } else {
            puttsArr[hole][playerId] = putts
          }
          return { ...r, putts: puttsArr }
        })
        return { ...s, rounds }
      })
    },
    [],
  )

  const setLongestPutt = useCallback(
    (roundIndex: number, hole: number, playerId: string | null) => {
      setState((s) => {
        const rounds = s.rounds.map((r) => {
          if (r.index !== roundIndex) return r
          const arr = [...r.longestPutt]
          arr[hole] = playerId
          return { ...r, longestPutt: arr }
        })
        return { ...s, rounds }
      })
    },
    [],
  )

  const setPairing = useCallback((roundIndex: number, pairing: PairingSplit) => {
    setState((s) => ({
      ...s,
      rounds: s.rounds.map((r) => (r.index === roundIndex ? { ...r, pairing } : r)),
    }))
  }, [])

  const setLocked = useCallback((roundIndex: number, locked: boolean) => {
    setState((s) => ({
      ...s,
      rounds: s.rounds.map((r) => (r.index === roundIndex ? { ...r, locked } : r)),
    }))
  }, [])

  const resetAll = useCallback(() => setState(emptyState()), [])

  const value = useMemo<Store>(
    () => ({
      state,
      setPlayers,
      setScore,
      setPutts,
      setLongestPutt,
      setPairing,
      setLocked,
      resetAll,
      hasPlayers: state.players.length === 4,
    }),
    [state, setPlayers, setScore, setPutts, setLongestPutt, setPairing, setLocked, resetAll],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
