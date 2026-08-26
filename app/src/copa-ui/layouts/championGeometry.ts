/**
 * Duo qualified / champion celebration geometry (layered).
 * Stage: champion_plaza_trophies_bg (celebration plaza — preferred over intro street;
 * no podium sprite asset exists yet). Text via BitmapText + name/score plates.
 * duo_qualified blue/red PNGs are optional accents only — not full structural UI.
 */

import { PLATE_ASPECT, battleTextMaxWidth } from './battleGeometry.ts'

export const DESIGN = { width: 1920, height: 1080 } as const

export type Box = { x: number; y: number; w: number; h: number }

/** Celebration plaza (trophies + lanterns) — distinct from battle coldroom. */
export const CHAMPION_BG = '/assets/backgrounds/champion_plaza_trophies_bg.png' as const

function namePlateBox(x: number, y: number, w: number): Box {
  return { x, y, w, h: Math.round(w / PLATE_ASPECT.name) }
}

function scorePlateBox(x: number, y: number, w: number): Box {
  return { x, y, w, h: Math.round(w / PLATE_ASPECT.score) }
}

/**
 * BitmapText metrics for qualified / champion plates (aligned with Versus/Battle).
 * `scale` multiplies the v4 spec line height (small 64 / medium 96 / large 128).
 */
export const QUALIFIED_HUD = {
  title: {
    size: 'medium' as const,
    scale: 0.39,
  },
  /**
   * Tela do eliminado não tem arte dedicada (winner.png é só pro classificado),
   * então o "OBRIGADO PELA CAMPANHA" precisa de mais destaque próprio —
   * maior que o title padrão, já que carrega o peso visual da tela inteira.
   */
  titleEliminated: {
    size: 'medium' as const,
    scale: 0.5,
  },
  duoName: {
    size: 'medium' as const,
    scale: 0.36,
    maxWidthRatio: 0.7,
  },
  score: {
    size: 'large' as const,
    scale: 0.35,
    maxWidthRatio: 0.72,
  },
  prize: {
    size: 'small' as const,
    scale: 0.35,
  },
  /**
   * Prêmio em destaque máximo na tela do eliminado — é a informação
   * principal ali, junto do agradecimento.
   */
  prizeEliminated: {
    size: 'large' as const,
    scale: 0.62,
  },
} as const

export function qualifiedTextMaxWidth(box: Box, ratio: number) {
  return battleTextMaxWidth(box, ratio, PLATE_ASPECT.name)
}

export function qualifiedScoreMaxWidth(box: Box, ratio: number) {
  return battleTextMaxWidth(box, ratio, PLATE_ASPECT.score)
}

export const DUO_QUALIFIED = {
  /**
   * `winner.png` title (~734×409). Slot ~760×200 → ~0.49 via object-fit:contain
   * (was ~0.88 in a 360px-tall slot that crushed the name crest). No CSS transform scale.
   */
  title: { x: 580, y: 50, w: 760, h: 200 },
  /**
   * Slot largo/alto pro BitmapText do agradecimento (tela do eliminado) —
   * sem imagem pra encaixar, então ganha mais respiro que o slot do winner.png.
   */
  titleEliminated: { x: 310, y: 40, w: 1300, h: 220 },
  /** Aspect-matched nameplate — clear air below winner banner. */
  teamName: namePlateBox(620, 250, 700),
  /** Below name crest with breathing room so ornate spikes do not mash WIN plate. */
  score: scorePlateBox(780, 558, 400),
  /** Victory fighter sprites (bonequinhos) — primary celebration focus. */
  fighter1: { x: 420, y: 470, w: 420, h: 420 },
  fighter2: { x: 1080, y: 470, w: 420, h: 420 },
  /** Large framed photo portraits positioned on the flanks (left & right).
   * ~15% maior que o original (360 -> 420), mesmo centro. */
  portrait1: { x: 50, y: 200, w: 390, h: 520 },
  portrait2: { x: 1450, y: 200, w: 390, h: 520 },
  /** Antes h:48 era pensado pra texto; agora o prêmio é imagem, então ganhou
   * mais altura (mesmo centro vertical, y ajustado). */
  prize: { x: 620, y: 850, w: 800, h: 80 },
  /** Caixa maior/mais central pro valor em destaque na tela do eliminado. */
  prizeEliminated: { x: 410, y: 880, w: 1100, h: 160 },
} as const

/**
 * Champion layout mirrors Duo Qualified hierarchy (title → name crest → fighters)
 * with breathing room. Prize money is not shown on the telão (domain prizes untouched).
 */
export const CHAMPION = {
  title: { x: 460, y: 36, w: 1000, h: 90 },
  teamName: namePlateBox(560, 200, 800),
  fighter1: { x: 420, y: 470, w: 420, h: 420 },
  fighter2: { x: 1080, y: 470, w: 420, h: 420 },
  portrait1: { x: 80, y: 200, w: 360, h: 360 },
  portrait2: { x: 1480, y: 200, w: 360, h: 360 },
} as const

/** Foreground celebration crowd layout for Duo Qualified / Champion scenes. */
export const CELEBRATION_CROWD_BOX: Box = {
  x: 0,
  y: 672,
  w: 1920,
  h: 640,
} as const

export const OPENING = {
  /** Kept for layout reference; OpeningScene no longer renders title/subtitle/logo. */
  title: { x: 260, y: 280, w: 1400, h: 120 },
  subtitle: { x: 510, y: 440, w: 900, h: 60 },
  pressStart: { x: 610, y: 200, w: 700, h: 70 },
  logo: { x: 760, y: 120, w: 400, h: 140 },
  /**
   * IntroFightLayer plate (1448×1086). Opaque feet ≈y=936 (≈150px pad below).
   * ~12.5% smaller than iter-64 492×369 (~30% of prior fullscreen contain).
   * Feet on yellow-road band (~y885). Mounted **under** crowd (hole + front-row occlusion).
   */
  fighters: { x: 745, y: 730, w: 430, h: 323 },
  /**
   * BG + crowd frames are matching 1672×941 full-frame overlays (pixel-aligned in the same box).
   * Float is pack art (back-row feet mid-fence); slight canvas +Y grounds mid-back without
   * collapsing the transparent ring hole. Perfect ground needs art, not a large CSS shift.
   */
  crowdNudgeY: 52,
} as const

export function absoluteBox(box: Box) {
  return {
    position: 'absolute' as const,
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
  }
}