import { useEffect, useState, type CSSProperties } from 'react'
import type { FighterAnim, FighterVariant, TeamSide } from './battle-assets.ts'
import { fighterRuntimeKey } from './battle-assets.ts'
import { bakedFacing, desiredFacing, type FacingDir } from './fighterFacing.ts'
import { getParticipantFighterSprites } from '../domain/participants.ts'

type Props = {
  side: TeamSide
  variant: FighterVariant
  participantSlug?: string
  anim: FighterAnim
  /**
   * Optional facing override (celebration screens place both teammates on one color).
   * Battle omits this — facing follows TeamSide (look at opponent).
   */
  face?: FacingDir
  className?: string
  style?: CSSProperties
}

type AnimDef = { frames: string[]; fps: number; loop: boolean }

/**
 * Pre-extracted 576×576 runtime frames (FIGHTER_RUNTIME_MANIFEST / SPRITE_RUNTIME.md).
 * Never crop fighter sheets with background-position — cells are irregular and overlap.
 * Sheet key is always `{fighterVariant}_{sideColor}` (side from match only).
 */
const ANIMATIONS: Record<string, Record<FighterAnim, AnimDef>> = {
  male_blue: {
    idle: { frames: ['idle_01', 'idle_02'], fps: 3, loop: true },
    walk: { frames: ['walk_01', 'walk_02'], fps: 5, loop: true },
    attack: { frames: ['attack'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    fall: { frames: ['hurt', 'lying'], fps: 5, loop: false },
    lying: { frames: ['lying'], fps: 1, loop: false },
    victory: { frames: ['victory'], fps: 1, loop: false },
  },
  male_red: {
    idle: { frames: ['idle_01', 'idle_02'], fps: 3, loop: true },
    walk: { frames: ['walk_01', 'walk_02'], fps: 5, loop: true },
    attack: { frames: ['attack'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    fall: { frames: ['hurt', 'lying'], fps: 5, loop: false },
    lying: { frames: ['lying'], fps: 1, loop: false },
    victory: { frames: ['victory'], fps: 1, loop: false },
  },
  female_blue: {
    // idle_02 is the sheet's second guard pose (fist shifts to the hip) — valid breathing pair.
    idle: { frames: ['idle_01', 'idle_02'], fps: 3, loop: true },
    walk: { frames: ['walk_01', 'walk_02'], fps: 5, loop: true },
    attack: { frames: ['attack'], fps: 1, loop: false },
    hurt: { frames: ['hurt'], fps: 1, loop: false },
    fall: { frames: ['hurt', 'lying'], fps: 5, loop: false },
    lying: { frames: ['lying'], fps: 1, loop: false },
    victory: { frames: ['victory'], fps: 1, loop: false },
  },
  female_red: {
    // idle_02 re-extracted 2026-08-15 from sheet cell x=392 (runtime file was an
    // idle_01 placeholder) — real fight-pose pair, no walk-cycle fallback needed.
    idle: { frames: ['idle_01', 'idle_02'], fps: 3, loop: true },
    walk: { frames: ['walk_01', 'walk_02', 'walk_03', 'walk_04', 'walk_05'], fps: 7, loop: true },
    attack: { frames: ['attack'], fps: 1, loop: false },
    hurt: { frames: ['hurt_01', 'hurt_02'], fps: 6, loop: false },
    fall: { frames: ['hurt_02', 'lying'], fps: 5, loop: false },
    lying: { frames: ['lying'], fps: 1, loop: false },
    victory: { frames: ['victory'], fps: 1, loop: false },
  },
}

/** Stable animation definitions for custom participant sprites (prevents re-triggering effects). */
export const CUSTOM_ANIMATIONS: Record<FighterAnim, AnimDef> = {
  idle: { frames: ['idle_01', 'idle_02'], fps: 3, loop: true },
  walk: { frames: ['walk_01', 'walk_02'], fps: 5, loop: true },
  attack: { frames: ['attack'], fps: 1, loop: false },
  hurt: { frames: ['hurt'], fps: 1, loop: false },
  fall: { frames: ['hurt', 'lying'], fps: 5, loop: false },
  lying: { frames: ['lying'], fps: 1, loop: false },
  victory: { frames: ['victory'], fps: 1, loop: false },
}

/** Opaque content height inside 576 canvas (measured) — normalize on-screen body size. */
const CONTENT_HEIGHT: Record<string, number> = {
  male_blue: 425,
  male_red: 426,
  female_blue: 453,
  female_red: 344,
}

/** Measured opaque content height for all 34 custom participants (idle reference). */
export const PARTICIPANT_CONTENT_HEIGHT: Record<string, number> = {
  adriel: 419,
  alexandre: 547,
  ana: 548,
  caio: 545,
  daniel: 549,
  david: 458,
  dinarte: 427,
  erikson: 546,
  evellyn: 546,
  fabio: 546,
  fatinha: 506,
  fernando: 550,
  izaias: 547,
  jailson: 444,
  joao: 470,
  joemerson: 551,
  lailson: 553,
  leandro: 552,
  leonardo: 548,
  livia: 526,
  manasses: 548,
  marconi: 560,
  monalisa: 458,
  neto: 429,
  radja: 492,
  rhussiana: 545,
  ricardo: 545,
  ryan: 550,
  samara: 457,
  tiago: 547,
  wendson: 549,
  wesley: 548,
  // Junior / reserve participants (children scale)
  hiago: 546,
  kelvin: 547,
}

const TARGET_CONTENT_H = 420
const CHILD_SCALE_MULTIPLIER = 0.85
const CHILD_SLUGS = new Set(['hiago', 'kelvin'])

export function getParticipantScale(slug: string, targetH: number = TARGET_CONTENT_H): number {
  const measuredH = PARTICIPANT_CONTENT_HEIGHT[slug.toLowerCase()] ?? targetH
  const baseScale = targetH / measuredH
  if (CHILD_SLUGS.has(slug.toLowerCase())) {
    return baseScale * CHILD_SCALE_MULTIPLIER
  }
  return baseScale
}

function heightNorm(side: TeamSide, variant: FighterVariant): number {
  const key = fighterRuntimeKey(side, variant)
  const h = CONTENT_HEIGHT[key] ?? TARGET_CONTENT_H
  return TARGET_CONTENT_H / h
}

/**
 * Crops are already normalized to 576×576 bottom-center. Flip + height norm
 * live on an inner layer so the outer grounding box stays stable.
 */
export function fighterAnimation(key: string, anim: FighterAnim): AnimDef {
  return ANIMATIONS[key]?.[anim] ?? ANIMATIONS.male_blue.idle
}

export function FighterSprite({ side, variant, participantSlug, anim, face, className, style }: Props) {
  const key = fighterRuntimeKey(side, variant)
  
  const customSprites = participantSlug ? getParticipantFighterSprites(participantSlug) : null
  const animation = customSprites ? CUSTOM_ANIMATIONS[anim] : fighterAnimation(key, anim)

  const [frame, setFrame] = useState(0)

  useEffect(() => {
    setFrame(0)
    if (animation.frames.length <= 1) return
    const ms = 1000 / animation.fps
    const id = window.setInterval(() => {
      setFrame((v) => {
        const next = v + 1
        if (next < animation.frames.length) return next
        return animation.loop ? 0 : animation.frames.length - 1
      })
    }, ms)
    return () => window.clearInterval(id)
  }, [key, anim, animation.frames, animation.fps, animation.loop])

  const file = animation.frames[Math.min(frame, animation.frames.length - 1)]
  const src = customSprites ? (customSprites as any)[file] : `/assets/runtime/fighters/${key}/${file}.png`
  // Mirror = desired facing vs baked PNG facing. Optional `face` for same-team celebration pairs.
  // Stable per (side, variant, anim[, face]) — no mid-anim flicker.
  const want = face ?? desiredFacing(side)
  const mirror = want !== bakedFacing(side, variant, anim)
  const scale = participantSlug
    ? getParticipantScale(participantSlug)
    : heightNorm(side, variant)
  const sx = mirror ? -scale : scale

  return (
    <div
      className={`ce-fighter-wrap ${className ?? ''}`}
      data-side={side}
      data-anim={anim}
      data-variant={variant}
      data-fighter-key={key}
      data-mirror={mirror ? '1' : '0'}
      data-baked-facing={mirror ? 'corrected' : 'native'}
      style={{
        overflow: 'hidden',
        contain: 'paint',
        isolation: 'isolate',
        ...style,
      }}
    >
      <div
        data-fighter-scale
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${sx}, ${scale})`,
          transformOrigin: 'center bottom',
        }}
      >
        <img
          className="ce-fighter"
          src={src}
          alt=""
          aria-label={`${side} ${variant} fighter ${anim}`}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: '50% 100%',
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />
      </div>
    </div>
  )
}
