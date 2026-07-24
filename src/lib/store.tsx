import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  GameType,
  PairingSplit,
  Player,
  Round,
  ScoringMode,
  SkinsConfig,
  TieMode,
  TripState,
  WolfCall,
} from '../types'
import { DEFAULT_PAIRINGS } from '../data/courses'
import { supabase } from './supabaseClient'
import { GAMES_TABLE, SYNC_CONFIGURED } from './syncConfig'

const STORAGE_KEY = 'golf-trip-2026'
const SYNC_KEY = 'golf-sync-2026'
const CURRENT_VERSION = 1

/** off = local only, host = this device publishes scores, guest = follow along. */
export type SyncRole = 'off' | 'host' | 'guest'
export type SyncStatus = 'off' | 'connecting' | 'live' | 'offline'

interface SyncSettings {
  code: string
  role: SyncRole
}

function loadSync(): SyncSettings {
  try {
    const raw = localStorage.getItem(SYNC_KEY)
    if (raw) {
      const p = JSON.parse(raw) as SyncSettings
      return { code: p.code ?? '', role: p.role ?? 'off' }
    }
  } catch {
    // ignore
  }
  return { code: '', role: 'off' }
}

/** Normalize a trip code so small typos ("Sweaty Balls" vs "sweaty-balls") still match. */
export function normalizeCode(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function freshRounds(): Round[] {
  return DEFAULT_PAIRINGS.map((pairing, index) => ({
    index,
    pairing,
    game: 'stableford' as const,
    scoring: 'net' as const,
    tieMode: 'carry' as const,
    skins: { points: true, putts: true, longest: true },
    gross: Array.from({ length: 18 }, () => ({})),
    putts: Array.from({ length: 18 }, () => ({})),
    longestPutt: Array.from({ length: 18 }, () => null),
    wolf: Array.from({ length: 18 }, () => null),
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
      if (!Array.isArray(r.wolf) || r.wolf.length !== 18) {
        r.wolf = Array.from({ length: 18 }, () => null)
      }
      if (!r.game) r.game = 'stableford'
      if (!r.scoring) r.scoring = 'net'
      if (!r.tieMode) r.tieMode = 'carry'
      if (!r.skins) r.skins = { points: true, putts: true, longest: true }
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
  setWolfCall: (roundIndex: number, hole: number, call: WolfCall | null) => void
  setPairing: (roundIndex: number, pairing: PairingSplit) => void
  setGame: (roundIndex: number, game: GameType) => void
  setScoringMode: (roundIndex: number, scoring: ScoringMode) => void
  setTieMode: (roundIndex: number, tieMode: TieMode) => void
  setSkin: (roundIndex: number, skin: keyof SkinsConfig, on: boolean) => void
  setLocked: (roundIndex: number, locked: boolean) => void
  resetRound: (roundIndex: number) => void
  resetAll: () => void
  hasPlayers: boolean
  // ---- live sync ----
  syncConfigured: boolean
  syncCode: string
  syncRole: SyncRole
  syncStatus: SyncStatus
  setSync: (code: string, role: SyncRole) => void
  /** Guests (followers) view a read-only mirror of the scorekeeper's card. */
  readOnly: boolean
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TripState>(load)
  const initialSync = loadSync()
  const [syncCode, setSyncCode] = useState<string>(initialSync.code)
  const [syncRole, setSyncRole] = useState<SyncRole>(initialSync.role)
  const [online, setOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full or unavailable; ignore — app still works in-memory.
    }
  }, [state])

  // Persist sync settings.
  useEffect(() => {
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify({ code: syncCode, role: syncRole }))
    } catch {
      // ignore
    }
  }, [syncCode, syncRole])

  // Track connectivity for the status pill.
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  // HOST: publish the trip state to the cloud (debounced) whenever it changes.
  useEffect(() => {
    const sb = supabase
    if (!sb || syncRole !== 'host' || !syncCode) return
    const t = setTimeout(() => {
      sb.from(GAMES_TABLE)
        .upsert({ code: syncCode, state, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) console.warn('sync push failed:', error.message)
        })
    }, 500)
    return () => clearTimeout(t)
  }, [state, syncRole, syncCode])

  // GUEST: fetch the current card, then subscribe to live updates.
  useEffect(() => {
    setSubscribed(false)
    const sb = supabase
    if (!sb || syncRole !== 'guest' || !syncCode) return
    let active = true

    sb.from(GAMES_TABLE)
      .select('state')
      .eq('code', syncCode)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.state) setState(data.state as TripState)
      })

    const channel = sb
      .channel(`game-${syncCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: GAMES_TABLE, filter: `code=eq.${syncCode}` },
        (payload) => {
          const next = (payload.new as { state?: TripState })?.state
          if (active && next) setState(next)
        },
      )
      .subscribe((status) => {
        if (active) setSubscribed(status === 'SUBSCRIBED')
      })

    return () => {
      active = false
      sb.removeChannel(channel)
    }
  }, [syncRole, syncCode])

  const setSync = useCallback((code: string, role: SyncRole) => {
    const c = normalizeCode(code)
    setSyncCode(role === 'off' ? '' : c)
    setSyncRole(role === 'off' || !c ? 'off' : role)
  }, [])

  const syncStatus: SyncStatus =
    syncRole === 'off'
      ? 'off'
      : !online
        ? 'offline'
        : syncRole === 'guest'
          ? subscribed
            ? 'live'
            : 'connecting'
          : 'live'

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

  const setWolfCall = useCallback(
    (roundIndex: number, hole: number, call: WolfCall | null) => {
      setState((s) => {
        const rounds = s.rounds.map((r) => {
          if (r.index !== roundIndex) return r
          const arr = [...r.wolf]
          arr[hole] = call
          return { ...r, wolf: arr }
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

  const setGame = useCallback((roundIndex: number, game: GameType) => {
    setState((s) => ({
      ...s,
      rounds: s.rounds.map((r) => (r.index === roundIndex ? { ...r, game } : r)),
    }))
  }, [])

  const setScoringMode = useCallback((roundIndex: number, scoring: ScoringMode) => {
    setState((s) => ({
      ...s,
      rounds: s.rounds.map((r) => (r.index === roundIndex ? { ...r, scoring } : r)),
    }))
  }, [])

  const setTieMode = useCallback((roundIndex: number, tieMode: TieMode) => {
    setState((s) => ({
      ...s,
      rounds: s.rounds.map((r) => (r.index === roundIndex ? { ...r, tieMode } : r)),
    }))
  }, [])

  const setSkin = useCallback(
    (roundIndex: number, skin: keyof SkinsConfig, on: boolean) => {
      setState((s) => ({
        ...s,
        rounds: s.rounds.map((r) =>
          r.index === roundIndex ? { ...r, skins: { ...r.skins, [skin]: on } } : r,
        ),
      }))
    },
    [],
  )

  const setLocked = useCallback((roundIndex: number, locked: boolean) => {
    setState((s) => ({
      ...s,
      rounds: s.rounds.map((r) => (r.index === roundIndex ? { ...r, locked } : r)),
    }))
  }, [])

  const resetRound = useCallback((roundIndex: number) => {
    setState((s) => ({
      ...s,
      rounds: s.rounds.map((r) =>
        r.index === roundIndex
          ? {
              ...r,
              gross: Array.from({ length: 18 }, () => ({})),
              putts: Array.from({ length: 18 }, () => ({})),
              longestPutt: Array.from({ length: 18 }, () => null),
              wolf: Array.from({ length: 18 }, () => null),
              locked: false,
            }
          : r,
      ),
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
      setWolfCall,
      setPairing,
      setGame,
      setScoringMode,
      setTieMode,
      setSkin,
      setLocked,
      resetRound,
      resetAll,
      hasPlayers: state.players.length === 4,
      syncConfigured: SYNC_CONFIGURED,
      syncCode,
      syncRole,
      syncStatus,
      setSync,
      readOnly: syncRole === 'guest',
    }),
    [
      state,
      setPlayers,
      setScore,
      setPutts,
      setLongestPutt,
      setWolfCall,
      setPairing,
      setGame,
      setScoringMode,
      setTieMode,
      setSkin,
      setLocked,
      resetRound,
      resetAll,
      syncCode,
      syncRole,
      syncStatus,
      setSync,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
