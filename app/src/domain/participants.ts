import type { FighterVariant } from './types.ts'

/**
 * Canonical model for a tournament participant.
 * Single source of truth for participant identity, names, avatars (face master), and body images.
 */
export interface ParticipantDefinition {
  readonly id: string
  readonly slug: string
  readonly displayName: string
  readonly avatar: string | null
  readonly bodyImage: string | null
  readonly fighterVariant: FighterVariant
  readonly sourceStatus: 'ready' | 'missing'
}

/**
 * Official roster with all 32 participants.
 * Sourced directly from participants manifest.
 */
export const OFFICIAL_PARTICIPANTS: ReadonlyArray<ParticipantDefinition> = [
  {
    id: 'adriel',
    slug: 'adriel',
    displayName: 'Adriel',
    avatar: '/assets/participants/adriel/face_master_360_v2.webp',
    bodyImage: '/assets/participants/adriel/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'alexandre',
    slug: 'alexandre',
    displayName: 'Alexandre',
    avatar: '/assets/participants/alexandre/face_master_360_v2.webp',
    bodyImage: '/assets/participants/alexandre/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'ana',
    slug: 'ana',
    displayName: 'Ana',
    avatar: '/assets/participants/ana/face_master_360_v2.webp',
    bodyImage: '/assets/participants/ana/body_master_v2.webp',
    fighterVariant: 'female',
    sourceStatus: 'ready',
  },
  {
    id: 'caio',
    slug: 'caio',
    displayName: 'Caio',
    avatar: '/assets/participants/caio/face_master_360_v2.webp',
    bodyImage: '/assets/participants/caio/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'daniel',
    slug: 'daniel',
    displayName: 'Daniel',
    avatar: '/assets/participants/daniel/face_master_360_v2.webp',
    bodyImage: '/assets/participants/daniel/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'david',
    slug: 'david',
    displayName: 'David',
    avatar: '/assets/participants/david/face_master_360_v2.webp',
    bodyImage: '/assets/participants/david/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'dinarte',
    slug: 'dinarte',
    displayName: 'Dinarte',
    avatar: '/assets/participants/dinarte/face_master_360_v2.webp',
    bodyImage: '/assets/participants/dinarte/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'erikson',
    slug: 'erikson',
    displayName: 'Erikson',
    avatar: '/assets/participants/erikson/face_master_360_v2.webp',
    bodyImage: '/assets/participants/erikson/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'evellyn',
    slug: 'evellyn',
    displayName: 'Evyllyn',
    avatar: '/assets/participants/evellyn/face_master_360_v2.webp',
    bodyImage: '/assets/participants/evellyn/body_master_v2.webp',
    fighterVariant: 'female',
    sourceStatus: 'ready',
  },
  {
    id: 'fabio',
    slug: 'fabio',
    displayName: 'Fábio',
    avatar: '/assets/participants/fabio/face_master_360_v2.webp',
    bodyImage: '/assets/participants/fabio/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'fatinha',
    slug: 'fatinha',
    displayName: 'Fatinha',
    avatar: '/assets/participants/fatinha/face_master_360_v2.webp',
    bodyImage: '/assets/participants/fatinha/body_master_v2.webp',
    fighterVariant: 'female',
    sourceStatus: 'ready',
  },
  {
    id: 'fernando',
    slug: 'fernando',
    displayName: 'Fernando',
    avatar: '/assets/participants/fernando/face_master_360_v2.webp',
    bodyImage: '/assets/participants/fernando/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'izaias',
    slug: 'izaias',
    displayName: 'Izaias',
    avatar: '/assets/participants/izaias/face_master_360_v2.webp',
    bodyImage: '/assets/participants/izaias/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'jailson',
    slug: 'jailson',
    displayName: 'Jailson',
    avatar: '/assets/participants/jailson/face_master_360_v2.webp',
    bodyImage: '/assets/participants/jailson/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'joao',
    slug: 'joao',
    displayName: 'João',
    avatar: '/assets/participants/joao/face_master_360_v2.webp',
    bodyImage: '/assets/participants/joao/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'joemerson',
    slug: 'joemerson',
    displayName: 'Joemerson',
    avatar: '/assets/participants/joemerson/face_master_360_v2.webp',
    bodyImage: '/assets/participants/joemerson/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'lailson',
    slug: 'lailson',
    displayName: 'Lailson',
    avatar: '/assets/participants/lailson/face_master_360_v2.webp',
    bodyImage: '/assets/participants/lailson/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'leandro',
    slug: 'leandro',
    displayName: 'Leandro',
    avatar: '/assets/participants/leandro/face_master_360_v2.webp',
    bodyImage: '/assets/participants/leandro/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'leonardo',
    slug: 'leonardo',
    displayName: 'Leonardo',
    avatar: '/assets/participants/leonardo/face_master_360_v2.webp',
    bodyImage: '/assets/participants/leonardo/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'livia',
    slug: 'livia',
    displayName: 'Livia',
    avatar: '/assets/participants/livia/face_master_360_v2.webp',
    bodyImage: '/assets/participants/livia/body_master_v2.webp',
    fighterVariant: 'female',
    sourceStatus: 'ready',
  },
  {
    id: 'manasses',
    slug: 'manasses',
    displayName: 'Manassés',
    avatar: '/assets/participants/manasses/face_master_360_v2.webp',
    bodyImage: '/assets/participants/manasses/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'marconi',
    slug: 'marconi',
    displayName: 'Marconi',
    avatar: '/assets/participants/marconi/face_master_360_v2.webp',
    bodyImage: '/assets/participants/marconi/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'monalisa',
    slug: 'monalisa',
    displayName: 'Mona',
    avatar: '/assets/participants/monalisa/face_master_360_v2.webp',
    bodyImage: '/assets/participants/monalisa/body_master_v2.webp',
    fighterVariant: 'female',
    sourceStatus: 'ready',
  },
  {
    id: 'neto',
    slug: 'neto',
    displayName: 'Neto',
    avatar: '/assets/participants/neto/face_master_360_v2.webp',
    bodyImage: '/assets/participants/neto/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'radja',
    slug: 'radja',
    displayName: 'Radija',
    avatar: '/assets/participants/radja/face_master_360_v2.webp',
    bodyImage: '/assets/participants/radja/body_master_v2.webp',
    fighterVariant: 'female',
    sourceStatus: 'ready',
  },
  {
    id: 'rhussiana',
    slug: 'rhussiana',
    displayName: 'Rhussiana',
    avatar: '/assets/participants/rhussiana/face_master_360_v2.webp',
    bodyImage: '/assets/participants/rhussiana/body_master_v2.webp',
    fighterVariant: 'female',
    sourceStatus: 'ready',
  },
  {
    id: 'ricardo',
    slug: 'ricardo',
    displayName: 'Ricardo',
    avatar: '/assets/participants/ricardo/face_master_360_v2.webp',
    bodyImage: '/assets/participants/ricardo/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'rikelmi',
    slug: 'rikelmi',
    displayName: 'Rikelmi',
    avatar: '/assets/participants/rikelmi/face_master_360_v2.webp',
    bodyImage: '/assets/participants/rikelmi/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'ryan',
    slug: 'ryan',
    displayName: 'Ryan',
    avatar: '/assets/participants/ryan/face_master_360_v2.webp',
    bodyImage: '/assets/participants/ryan/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'samara',
    slug: 'samara',
    displayName: 'Samara',
    avatar: '/assets/participants/samara/face_master_360_v2.webp',
    bodyImage: '/assets/participants/samara/body_master_v2.webp',
    fighterVariant: 'female',
    sourceStatus: 'ready',
  },
  {
    id: 'tiago',
    slug: 'tiago',
    displayName: 'Tiago',
    avatar: '/assets/participants/tiago/face_master_360_v2.webp',
    bodyImage: '/assets/participants/tiago/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'wendson',
    slug: 'wendson',
    displayName: 'Wendson',
    avatar: '/assets/participants/wendson/face_master_360_v2.webp',
    bodyImage: '/assets/participants/wendson/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'wesley',
    slug: 'wesley',
    displayName: 'Wesley',
    avatar: '/assets/participants/wesley/face_master_360_v2.webp',
    bodyImage: '/assets/participants/wesley/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
]

/**
 * Reserve roster for alternative or extra participants (e.g. reserve registration).
 * Kept separate from OFFICIAL_PARTICIPANTS so official 32-player tournament structure is preserved.
 */
export const RESERVE_PARTICIPANTS: ReadonlyArray<ParticipantDefinition> = [
  {
    id: 'hiago',
    slug: 'hiago',
    displayName: 'Hiago',
    avatar: '/assets/participants/hiago/face_master_360_v2.webp',
    bodyImage: '/assets/participants/hiago/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
  {
    id: 'kelvin',
    slug: 'kelvin',
    displayName: 'Kelvin',
    avatar: '/assets/participants/kelvin/face_master_360_v2.webp',
    bodyImage: '/assets/participants/kelvin/body_master_v2.webp',
    fighterVariant: 'male',
    sourceStatus: 'ready',
  },
]

/**
 * Combined list of all registered participants (official 32 starters + reserve roster).
 */
export const ALL_REGISTERED_PARTICIPANTS: ReadonlyArray<ParticipantDefinition> = [
  ...OFFICIAL_PARTICIPANTS,
  ...RESERVE_PARTICIPANTS,
]

const PARTICIPANTS_BY_ID = new Map<string, ParticipantDefinition>(
  ALL_REGISTERED_PARTICIPANTS.map((p) => [p.id.toLowerCase(), p]),
)

const PARTICIPANTS_BY_SLUG = new Map<string, ParticipantDefinition>(
  ALL_REGISTERED_PARTICIPANTS.map((p) => [p.slug.toLowerCase(), p]),
)

function normalizeKey(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const PARTICIPANTS_BY_NORMALIZED_NAME = new Map<string, ParticipantDefinition>(
  ALL_REGISTERED_PARTICIPANTS.map((p) => [normalizeKey(p.displayName), p]),
)

export function getParticipantById(id: string | null | undefined): ParticipantDefinition | undefined {
  if (!id) return undefined
  return PARTICIPANTS_BY_ID.get(id.toLowerCase())
}

export function getParticipantBySlug(slug: string | null | undefined): ParticipantDefinition | undefined {
  if (!slug) return undefined
  return PARTICIPANTS_BY_SLUG.get(slug.toLowerCase())
}

export function getParticipantByName(name: string | null | undefined): ParticipantDefinition | undefined {
  if (!name) return undefined
  const direct = PARTICIPANTS_BY_NORMALIZED_NAME.get(normalizeKey(name))
  if (direct) return direct
  return undefined
}

export function findParticipant(identifier: string | null | undefined): ParticipantDefinition | undefined {
  if (!identifier) return undefined
  return getParticipantById(identifier) ?? getParticipantBySlug(identifier) ?? getParticipantByName(identifier)
}

/**
 * Returns canonical avatar URL (face master) for participant ID or object, or null if missing.
 */
export function getParticipantAvatar(idOrPerson: string | { id?: string; name?: string } | null | undefined): string | null {
  if (!idOrPerson) return null
  if (typeof idOrPerson === 'string') {
    const found = findParticipant(idOrPerson)
    return found?.avatar ?? null
  }
  const byId = idOrPerson.id ? getParticipantById(idOrPerson.id) : undefined
  if (byId?.avatar) return byId.avatar
  const byName = idOrPerson.name ? getParticipantByName(idOrPerson.name) : undefined
  return byName?.avatar ?? null
}

/**
 * Returns canonical body/card image URL for participant ID or object, or null if missing.
 */
export function getParticipantBodyImage(idOrPerson: string | { id?: string; name?: string } | null | undefined): string | null {
  if (!idOrPerson) return null
  if (typeof idOrPerson === 'string') {
    const found = findParticipant(idOrPerson)
    return found?.bodyImage ?? null
  }
  const byId = idOrPerson.id ? getParticipantById(idOrPerson.id) : undefined
  if (byId?.bodyImage) return byId.bodyImage
  const byName = idOrPerson.name ? getParticipantByName(idOrPerson.name) : undefined
  return byName?.bodyImage ?? null
}

/**
 * Returns specific fighter sprite paths for a participant, if they exist.
 */
export function getParticipantFighterSprites(idOrPerson: string | { id?: string; name?: string } | null | undefined) {
  if (!idOrPerson) return null;
  const p = typeof idOrPerson === 'string' ? findParticipant(idOrPerson) : (idOrPerson.id ? getParticipantById(idOrPerson.id) : undefined);
  if (!p || p.sourceStatus !== 'ready') return null;
  // All 'ready' participants have generated fighter sprites mapped in assets
  return {
    idle_01: `/assets/participants/${p.slug}/fighter/idle_01.png`,
    idle_02: `/assets/participants/${p.slug}/fighter/idle_02.png`,
    walk_01: `/assets/participants/${p.slug}/fighter/walk_01.png`,
    walk_02: `/assets/participants/${p.slug}/fighter/walk_02.png`,
    attack: `/assets/participants/${p.slug}/fighter/attack.png`,
    hurt: `/assets/participants/${p.slug}/fighter/hurt.png`,
    victory: `/assets/participants/${p.slug}/fighter/victory.png`,
    lying: `/assets/participants/${p.slug}/fighter/lying.png`,
  };
}
/**
 * Returns the canonical "fight avatar" (battle portrait) URL for a
 * participant, by convention path, or null if the source isn't ready.
 * Coloque o arquivo em /public/assets/participants/{slug}/fight_avatar.webp
 */
export function getParticipantFightAvatar(
  idOrPerson: string | { id?: string; name?: string } | null | undefined,
): string | null {
  const p = typeof idOrPerson === 'string'
    ? findParticipant(idOrPerson)
    : (idOrPerson?.id ? getParticipantById(idOrPerson.id) : undefined)
  if (!p || p.sourceStatus !== 'ready') return null
  return `/assets/participants/${p.slug}/fight_avatar.webp`
}

/**
 * Automated validation check for participant registry data integrity.
 */
export function validateParticipantRegistry(): { valid: boolean; errors: string[] } {

  const errors: string[] = []
  const seenIds = new Set<string>()
  const seenSlugs = new Set<string>()

  if (OFFICIAL_PARTICIPANTS.length !== 32) {
    errors.push(`Expected 32 official participants, got ${OFFICIAL_PARTICIPANTS.length}`)
  }

  for (const p of ALL_REGISTERED_PARTICIPANTS) {
    if (!p.id || !p.id.trim()) {
      errors.push(`Participant has empty id`)
    }
    if (!p.displayName || !p.displayName.trim()) {
      errors.push(`Participant ${p.id} has empty displayName`)
    }
    if (seenIds.has(p.id)) {
      errors.push(`Duplicate participant id: ${p.id}`)
    }
    seenIds.add(p.id)

    if (seenSlugs.has(p.slug)) {
      errors.push(`Duplicate participant slug: ${p.slug}`)
    }
    seenSlugs.add(p.slug)

    if (p.sourceStatus === 'ready') {
      if (!p.avatar || !p.avatar.startsWith('/assets/participants/')) {
        errors.push(`Participant ${p.id} marked ready but missing valid avatar path`)
      }
      if (!p.bodyImage || !p.bodyImage.startsWith('/assets/participants/')) {
        errors.push(`Participant ${p.id} marked ready but missing valid bodyImage path`)
      }
    } else {
      if (p.avatar !== null || p.bodyImage !== null) {
        errors.push(`Missing participant ${p.id} should have null avatar and bodyImage`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
