import { describe, expect, it } from 'vitest'
import {
  ALL_REGISTERED_PARTICIPANTS,
  findParticipant,
  getParticipantAvatar,
  getParticipantBodyImage,
  getParticipantById,
  getParticipantByName,
  getParticipantBySlug,
  OFFICIAL_PARTICIPANTS,
  RESERVE_PARTICIPANTS,
  validateParticipantRegistry,
} from './participants.ts'
import { applyDemoSetup } from './seed.ts'
import { createLiveDeps } from './state.ts'

describe('Participant Central Registry & Integrity', () => {
  it('registers exactly 32 official participants and 2 reserve participants', () => {
    expect(OFFICIAL_PARTICIPANTS.length).toBe(32)
    expect(RESERVE_PARTICIPANTS.length).toBe(2)
    expect(ALL_REGISTERED_PARTICIPANTS.length).toBe(34)
  })

  it('has unique and non-empty IDs and slugs for all registered participants', () => {
    const ids = new Set<string>()
    const slugs = new Set<string>()

    for (const p of ALL_REGISTERED_PARTICIPANTS) {
      expect(p.id).toBeTruthy()
      expect(p.slug).toBeTruthy()
      expect(p.displayName).toBeTruthy()

      expect(ids.has(p.id)).toBe(false)
      expect(slugs.has(p.slug)).toBe(false)

      ids.add(p.id)
      slugs.add(p.slug)
    }

    expect(ids.size).toBe(34)
    expect(slugs.size).toBe(34)
  })

  it('preserves accents and correct display names', () => {
    const joao = getParticipantById('joao')
    expect(joao?.displayName).toBe('João')

    const fabio = getParticipantById('fabio')
    expect(fabio?.displayName).toBe('Fábio')

    const manasses = getParticipantById('manasses')
    expect(manasses?.displayName).toBe('Manassés')
  })

  it('has all 32 official participants ready with face master avatars and body images', () => {
    const ready = OFFICIAL_PARTICIPANTS.filter((p) => p.sourceStatus === 'ready')
    expect(ready.length).toBe(32)

    for (const p of ready) {
      expect(p.avatar).toBe(`/assets/participants/${p.id}/face_master_360.png`)
      expect(p.bodyImage).toBe(`/assets/participants/${p.id}/body_master.png`)
      // Ensure no cross-referencing of assets
      expect(p.avatar?.includes(p.id)).toBe(true)
      expect(p.bodyImage?.includes(p.id)).toBe(true)
    }

    const missing = OFFICIAL_PARTICIPANTS.filter((p) => p.sourceStatus === 'missing')
    expect(missing.length).toBe(0)
  })

  it('correctly resolves Wendson and Wesley who now have full ready assets', () => {
    const wendson = getParticipantById('wendson')
    expect(wendson?.sourceStatus).toBe('ready')
    expect(wendson?.avatar).toBe('/assets/participants/wendson/face_master_360.png')
    expect(wendson?.bodyImage).toBe('/assets/participants/wendson/body_master.png')

    const wesley = getParticipantById('wesley')
    expect(wesley?.sourceStatus).toBe('ready')
    expect(wesley?.avatar).toBe('/assets/participants/wesley/face_master_360.png')
    expect(wesley?.bodyImage).toBe('/assets/participants/wesley/body_master.png')
  })

  it('correctly registers and resolves reserve participants (Hiago and Kelvin)', () => {
    const reserveIds = RESERVE_PARTICIPANTS.map((p) => p.id)
    expect(reserveIds).toEqual(['hiago', 'kelvin'])

    // Official participants must not include reserve participants
    const officialIds = new Set(OFFICIAL_PARTICIPANTS.map((p) => p.id))
    expect(officialIds.has('hiago')).toBe(false)
    expect(officialIds.has('kelvin')).toBe(false)

    // Lookup functions must resolve reserve participants
    const hiago = getParticipantById('hiago')
    expect(hiago).toBeDefined()
    expect(hiago?.displayName).toBe('Hiago')
    expect(hiago?.avatar).toBe('/assets/participants/hiago/face_master_360.png')
    expect(hiago?.bodyImage).toBe('/assets/participants/hiago/body_master.png')

    const kelvin = getParticipantById('kelvin')
    expect(kelvin).toBeDefined()
    expect(kelvin?.displayName).toBe('Kelvin')
    expect(kelvin?.avatar).toBe('/assets/participants/kelvin/face_master_360.png')
    expect(kelvin?.bodyImage).toBe('/assets/participants/kelvin/body_master.png')

    expect(getParticipantByName('Hiago')?.id).toBe('hiago')
    expect(getParticipantByName('Kelvin')?.id).toBe('kelvin')
    expect(findParticipant('hiago')?.displayName).toBe('Hiago')
    expect(findParticipant('kelvin')?.displayName).toBe('Kelvin')
  })

  it('resolves participants by ID, slug, and normalized name', () => {
    expect(getParticipantById('adriel')?.id).toBe('adriel')
    expect(getParticipantBySlug('adriel')?.id).toBe('adriel')
    expect(getParticipantByName('Adriel')?.id).toBe('adriel')
    expect(getParticipantByName('adriel')?.id).toBe('adriel')
    expect(getParticipantByName('João')?.id).toBe('joao')
    expect(getParticipantByName('joao')?.id).toBe('joao')
    expect(findParticipant('joao')?.displayName).toBe('João')
  })

  it('resolves avatar and bodyImage helpers correctly', () => {
    expect(getParticipantAvatar('adriel')).toBe('/assets/participants/adriel/face_master_360.png')
    expect(getParticipantBodyImage('adriel')).toBe('/assets/participants/adriel/body_master.png')
    expect(getParticipantAvatar('wendson')).toBe('/assets/participants/wendson/face_master_360.png')
    expect(getParticipantBodyImage('wendson')).toBe('/assets/participants/wendson/body_master.png')
    expect(getParticipantAvatar('hiago')).toBe('/assets/participants/hiago/face_master_360.png')
    expect(getParticipantBodyImage('hiago')).toBe('/assets/participants/hiago/body_master.png')
    expect(getParticipantAvatar(null)).toBeNull()
    expect(getParticipantBodyImage(null)).toBeNull()
    expect(getParticipantAvatar('unknown_nonexistent')).toBeNull()
    expect(getParticipantBodyImage('unknown_nonexistent')).toBeNull()
  })

  it('passes automated registry validation', () => {
    const result = validateParticipantRegistry()
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('seeds tournament state with all 34 registered participants forming 16 unique duos with 32 starters and 2 reserves', () => {
    const state = applyDemoSetup(createLiveDeps())
    expect(state.participants.length).toBe(34)
    expect(state.teams.length).toBe(16)

    const allParticipantIds = new Set(state.participants.map((p) => p.id))
    expect(allParticipantIds.size).toBe(34)
    expect(allParticipantIds.has('hiago')).toBe(true)
    expect(allParticipantIds.has('kelvin')).toBe(true)

    const pairedIds = new Set<string>()
    for (const team of state.teams) {
      expect(allParticipantIds.has(team.participant1Id)).toBe(true)
      expect(allParticipantIds.has(team.participant2Id)).toBe(true)
      expect(team.participant1Id).not.toBe(team.participant2Id)
      expect(pairedIds.has(team.participant1Id)).toBe(false)
      expect(pairedIds.has(team.participant2Id)).toBe(false)
      pairedIds.add(team.participant1Id)
      pairedIds.add(team.participant2Id)
    }
    expect(pairedIds.size).toBe(32)
    expect(pairedIds.has('hiago')).toBe(false)
    expect(pairedIds.has('kelvin')).toBe(false)
  })
})
