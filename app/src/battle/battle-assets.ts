export type FighterVariant = 'male' | 'female'
export type TeamSide = 'blue' | 'red'

export const fighterSheets = {
  blue: {
    male: '/assets/sprites/fighter_male_blue_sheet.png',
    female: '/assets/sprites/fighter_female_blue_sheet.png',
  },
  red: {
    male: '/assets/sprites/fighter_male_red_sheet.png',
    female: '/assets/sprites/fighter_female_red_sheet.png',
  },
} as const

export const battleFx = {
  /** Prefer pre-extracted runtime PNGs — never show the full impact sheet. */
  impact: '/assets/runtime/fx/impact_heavy.png',
  impactLight: '/assets/runtime/fx/impact_light.png',
  impactFlash: '/assets/runtime/fx/impact_flash.png',
  confetti: '/assets/runtime/fx/confetti.png',
  /** Celebration crowd frames (back-facing high quality foreground crowd). */
  celebrationCrowd: [
    '/assets/runtime/intro/crowd/layered/30_intro_crowd_foreground_frame_01.png',
    '/assets/runtime/intro/crowd/layered/31_intro_crowd_foreground_frame_02.png',
  ] as const,
  /** Source sheets (crop single cells in components; do not blit entire sheet). */
  impactSheet: '/assets/fx/impact_fx_sheet.png',
  coldMist: '/assets/environment/cold_mist_sheet.png',
  coldroomEnvironment: '/assets/environment/coldroom_environment_fx_sheet.png',
  crowd: '/assets/sprites/crowd_sheet.png',
} as const

export const battleBackgrounds = {
  coldroom: '/assets/backgrounds/battle_dock_coldroom_bg.png',
  opening: '/assets/backgrounds/opening_street_bg.png',
  champion: '/assets/backgrounds/champion_plaza_trophies_bg.png',
  bracket: '/assets/backgrounds/bracket_city_plaza_bg.png',
} as const

export const canonicalUi = {
  namePlate: '/assets/ui/name_plate_base.png',
  scorePanel: '/assets/ui/score_panel_base.png',
  vsEmblem: '/assets/ui/vs_emblem.png',
  portraitFrame: '/assets/ui/portrait_frame_base.png',
  timePanel: '/assets/ui/time_panel_base.png',
  phasePlate: '/assets/ui/phase_plate_base.png',
  esperancaLogo: '/assets/ui/esperanca_retro_logo.png',
} as const

/**
 * Large centered announcer callouts (~750×300–400). Do NOT squash into HUD
 * `roundTitle` (540×72) or score-panel holes. Draw at ~0.75–0.95 natural scale.
 * Champion title asset is pending human production — do not reuse `winner`.
 */
export const battleCallouts = {
  round1: '/assets/ui/round_1.png',
  round2: '/assets/ui/round_2.png',
  finalRound: '/assets/ui/final_round.png',
  fight: '/assets/ui/fight.png',
  ko: '/assets/ui/ko.png',
  /** Duo Qualified title only — not Champion. */
  winner: '/assets/ui/winner.png',
} as const

export type BattleCalloutId = keyof typeof battleCallouts

/** Intrinsic sizes (px) — keep aspect; scale via CSS, never stretch to HUD slots. */
export const BATTLE_CALLOUT_NATURAL = {
  round1: { w: 759, h: 292 },
  round2: { w: 755, h: 282 },
  finalRound: { w: 763, h: 376 },
  fight: { w: 765, h: 369 },
  ko: { w: 756, h: 365 },
  winner: { w: 734, h: 409 },
} as const

export function calloutForRound(roundNumber: number): string {
  if (roundNumber === 1) return battleCallouts.round1
  if (roundNumber === 2) return battleCallouts.round2
  return battleCallouts.finalRound
}

/** New square moldura sheet (SoT). Triangular selection_cursor_sheet is REJECTED for TF. */
export const selectionCursorFrameSheet = '/assets/ui/selection_cursor_frame_sheet.png'
/** @deprecated Triangular pointer sheet — do not use on Team Formation. */
export const selectionCursorSheet = '/assets/ui/selection_cursor_sheet.png'
/** @deprecated Isolated triangular pointer — do not use on Team Formation. */
export const selectionCursor = '/assets/ui/selection_cursor.png'

/**
 * @deprecated Sheets are NOT a uniform grid — do not crop with background-position.
 * Use `/assets/runtime/fighters/{variant}_{side}/{frame}.png` (576×576, bottom-center).
 */
export const FIGHTER_RUNTIME_CANVAS = { width: 576, height: 576, anchor: 'bottom-center' } as const

export type FighterAnim = 'idle' | 'walk' | 'attack' | 'hurt' | 'fall' | 'lying' | 'victory'

export function fighterRuntimeKey(side: TeamSide, variant: FighterVariant): string {
  return `${variant}_${side}`
}
