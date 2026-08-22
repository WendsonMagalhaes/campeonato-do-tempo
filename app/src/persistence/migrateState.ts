import {
  DEMO_FIGHTER_VARIANT_BY_NAME,
  DEMO_PARTICIPANTS,
} from '../domain/seed.ts'
import { repairBracketProgression } from '../domain/bracket-repair.ts'
import type { FighterVariant, Participant, TournamentState } from '../domain/types.ts'

function normalizeVariant(value: unknown): FighterVariant | null {
  if (value === 'female' || value === 'male') return value
  return null
}

function isExactDemoRoster(participants: Participant[]): boolean {
  if (participants.length !== DEMO_PARTICIPANTS.length) return false
  const names = new Set(participants.map((p) => p.name))
  return DEMO_PARTICIPANTS.every((entry) => names.has(entry.name))
}

/** Old seed used `index % 2` on DEMO_PARTICIPANTS order (Joao=female, Livia=male, …). */
function matchesLegacyIndexAlternation(participants: Participant[]): boolean {
  if (!isExactDemoRoster(participants)) return false
  const byName = new Map(participants.map((p) => [p.name, p]))
  return DEMO_PARTICIPANTS.every((entry, index) => {
    const person = byName.get(entry.name)
    if (!person) return false
    const legacy: FighterVariant = index % 2 === 0 ? 'male' : 'female'
    const current = normalizeVariant(person.fighterVariant) ?? 'male'
    return current === legacy
  })
}

/**
 * Previous soft-migrate defaulted every missing field to male, so a restored demo
 * roster can be entirely male even though curated females exist.
 */
function matchesAllDefaultedMaleDemo(participants: Participant[]): boolean {
  if (!isExactDemoRoster(participants)) return false
  const hasCuratedFemale = DEMO_PARTICIPANTS.some((entry) => entry.fighterVariant === 'female')
  if (!hasCuratedFemale) return false
  return participants.every((person) => (normalizeVariant(person.fighterVariant) ?? 'male') === 'male')
}

function applyCuratedDemoVariants(participants: Participant[]): Participant[] {
  return participants.map((person) => {
    const curated = DEMO_FIGHTER_VARIANT_BY_NAME.get(person.name)
    return curated ? { ...person, fighterVariant: curated } : person
  })
}

/**
 * Soft-migrate persisted participants:
 * - Preserve explicit male/female.
 * - Default only when the field is missing/invalid.
 * - Repair known corrupt demo rosters (legacy index%2 or all-male default) in place.
 */
export function migrateTournamentState(state: TournamentState): TournamentState {
  const participants = state.participants ?? []
  const shouldRepairDemo =
    matchesLegacyIndexAlternation(participants) || matchesAllDefaultedMaleDemo(participants)

  const nextParticipants = shouldRepairDemo
    ? applyCuratedDemoVariants(participants)
    : participants.map((person) => {
        const normalized = normalizeVariant(person.fighterVariant)
        // Only fill missing/invalid — never overwrite a saved female with male.
        return {
          ...person,
          fighterVariant: normalized ?? 'male',
        }
      })

  return repairBracketProgression({
    ...state,
    participants: nextParticipants,
  })
}
