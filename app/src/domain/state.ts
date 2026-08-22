import { SCHEMA_VERSION } from './constants.ts'
import type { ClockPort, EngineDeps, IdPort, RandomPort, TournamentState } from './types.ts'

export function createIds(): IdPort {
  return {
    next(prefix: string) {
      return `${prefix}_${crypto.randomUUID()}`
    },
  }
}

export function createClock(): ClockPort {
  return {
    now() {
      return new Date().toISOString()
    },
  }
}

export function createMathRandom(): RandomPort {
  return {
    shuffle<T>(items: readonly T[]) {
      const arr = [...items]
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        const left = arr[i]
        const right = arr[j]
        if (left === undefined || right === undefined) continue
        arr[i] = right
        arr[j] = left
      }
      return arr
    },
    seedLabel() {
      return `real-${Date.now()}`
    },
  }
}

export function createSeededRandom(seed: number): RandomPort {
  let state = seed >>> 0
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
  return {
    shuffle<T>(items: readonly T[]) {
      const arr = [...items]
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1))
        const left = arr[i]
        const right = arr[j]
        if (left === undefined || right === undefined) continue
        arr[i] = right
        arr[j] = left
      }
      return arr
    },
    seedLabel() {
      return `seed-${seed}`
    },
  }
}

export function createLiveDeps(): EngineDeps {
  return {
    random: createMathRandom(),
    ids: createIds(),
    clock: createClock(),
  }
}

export function createInitialState(name = 'Copa Esperança'): TournamentState {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name,
    status: 'setup',
    participants: [],
    teams: [],
    matches: [],
    rounds: [],
    detectedValues: [],
    activeMatchId: null,
    activeRoundId: null,
    bracketSeed: null,
    bracketConfirmed: false,
    championTeamId: null,
  }
}
