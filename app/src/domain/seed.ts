import type { Command } from './commands.ts'
import { TEAM_COUNT } from './constants.ts'
import { handleCommand } from './engine.ts'
import { ALL_REGISTERED_PARTICIPANTS } from './participants.ts'
import { createInitialState } from './state.ts'
import type { EngineDeps, FighterVariant, TournamentState } from './types.ts'

/**
 * Official tournament roster with all registered participants and curated fighterVariant.
 * Sourced directly from ALL_REGISTERED_PARTICIPANTS.
 */
export const OFFICIAL_ROSTER_PARTICIPANTS: ReadonlyArray<{
  id: string
  name: string
  fighterVariant: FighterVariant
}> = ALL_REGISTERED_PARTICIPANTS.map((p) => ({
  id: p.id,
  name: p.displayName,
  fighterVariant: p.fighterVariant,
}))

/** Backward compatibility alias */
export const DEMO_PARTICIPANTS = OFFICIAL_ROSTER_PARTICIPANTS

/** Curated name → variant map for soft-migration of the roster. */
export const DEMO_FIGHTER_VARIANT_BY_NAME: ReadonlyMap<string, FighterVariant> = new Map(
  OFFICIAL_ROSTER_PARTICIPANTS.map(({ name, fighterVariant }) => [name, fighterVariant]),
)

export function seedOfficialCommands(): Command[] {
  return ALL_REGISTERED_PARTICIPANTS.map((p) => ({
    type: 'RegisterParticipant' as const,
    id: p.id,
    name: p.displayName,
    fighterVariant: p.fighterVariant,
    slug: p.slug,
    avatar: p.avatar,
    bodyImage: p.bodyImage,
  }))
}

/** Backward compatibility alias */
export const seedDemoCommands = seedOfficialCommands

/**
 * Sets up tournament state with all 34 registered participants and 16 official duos (32 starters).
 * Reserves (Hiago, Kelvin) remain in state.participants unassigned for operator substitutions.
 */
export function applyOfficialSetup(deps: EngineDeps): TournamentState {
  let state = createInitialState()
  for (const p of ALL_REGISTERED_PARTICIPANTS) {
    state = handleCommand(
      state,
      {
        type: 'RegisterParticipant',
        id: p.id,
        name: p.displayName,
        fighterVariant: p.fighterVariant,
        slug: p.slug,
        avatar: p.avatar,
        bodyImage: p.bodyImage,
      },
      deps,
    )
  }
  for (let i = 0; i < TEAM_COUNT; i += 1) {
    const p1 = state.participants[i * 2]
    const p2 = state.participants[i * 2 + 1]
    if (!p1 || !p2) throw new Error('Cadastro incompleto ao formar duplas oficiais.')
    state = handleCommand(
      state,
      {
        type: 'DefineTeam',
        name: `${p1.name} & ${p2.name}`,
        participant1Id: p1.id,
        participant2Id: p2.id,
        firstRevealParticipantId: p1.id,
        revealOrder: i + 1,
      },
      deps,
    )
  }
  return state
}

/** Backward compatibility alias */
export const applyDemoSetup = applyOfficialSetup

export function applyFullReveal(state: TournamentState, deps: EngineDeps): TournamentState {
  let next = handleCommand(state, { type: 'StartTeamReveal' }, deps)
  for (let i = 0; i < TEAM_COUNT; i += 1) {
    next = handleCommand(next, { type: 'RevealNextTeam' }, deps)
  }
  return next
}
