import type { Command } from './commands.ts'
import { TEAM_COUNT } from './constants.ts'
import { handleCommand } from './engine.ts'
import { ALL_REGISTERED_PARTICIPANTS, getParticipantByName } from './participants.ts'
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
 * Duplas oficiais definidas explicitamente por nome, na ordem de revelação desejada.
 * A busca (getParticipantByName) ignora acentos/maiúsculas, mas o nome ainda
 * precisa corresponder a um displayName cadastrado em participants.ts.
 *
 * ATENÇÃO: "Aluisio" e "Rikelmi" ainda NÃO existem em ALL_REGISTERED_PARTICIPANTS
 * (nem em OFFICIAL_PARTICIPANTS nem em RESERVE_PARTICIPANTS). Cadastre-os em
 * participants.ts (id, slug, avatar, bodyImage, fighterVariant) antes de rodar
 * applyOfficialSetup, ou troque pelos nomes corretos já cadastrados.
 */
const OFFICIAL_TEAM_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['Rhussiana', 'Lailson'],
  ['Jailson', 'Marconi'],
  ['Samara', 'Leonardo'], 
  ['Daniel', 'Radija'],
  ['Mona', 'David'], 
  ['Alexandre', 'Wesley'],
  ['Neto', 'Ana'], 
  ['Adriel', 'Erikson'],
  ['Fábio', 'Dinarte'],
  ['Fatinha', 'Leandro'], 
  ['Joemerson', 'Evyllyn'], 
  ['Caio', 'Ricardo'], 
  ['Livia', 'Manassés'],
  ['Ryan', 'João'], 
  ['Izaias', 'Tiago'],
  ['Regina', 'Wendson'],
]

/**
 * Sets up tournament state with all registered participants and the 16 official
 * duos defined explicitamente em OFFICIAL_TEAM_PAIRS (por nome, não por posição).
 * Reserves não usados em nenhuma dupla permanecem em state.participants
 * unassigned para substituições do operador.
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

  if (OFFICIAL_TEAM_PAIRS.length !== TEAM_COUNT) {
    throw new Error(
      `OFFICIAL_TEAM_PAIRS tem ${OFFICIAL_TEAM_PAIRS.length} duplas, mas TEAM_COUNT é ${TEAM_COUNT}.`,
    )
  }

  OFFICIAL_TEAM_PAIRS.forEach(([name1, name2], i) => {
    const def1 = getParticipantByName(name1)
    const def2 = getParticipantByName(name2)
    if (!def1 || !def2) {
      const missing = [!def1 ? name1 : null, !def2 ? name2 : null].filter(Boolean).join(', ')
      throw new Error(
        `Dupla ${i + 1}: participante não encontrado em participants.ts: ${missing}. Cadastre-o ou corrija o nome em OFFICIAL_TEAM_PAIRS.`,
      )
    }
    const p1 = state.participants.find((p) => p.id === def1.id)
    const p2 = state.participants.find((p) => p.id === def2.id)
    if (!p1 || !p2) {
      throw new Error(`Dupla ${i + 1}: falha ao localizar "${name1}" / "${name2}" já registrados no state.`)
    }
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
  })

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
