/**
 * Intro cinematic crowd — 3 layered groups.
 * Foreground: 2-frame loop (OK).
 * Upper L/R: frozen on frame_01 until human regenerates art (no teleport).
 */

import { INTRO_CINEMATIC_ASSETS, type IntroCrowdGroupId } from './introCinematicAssets.ts'

export type IntroCrowdGroupConfig = {
  id: IntroCrowdGroupId
  frames: readonly [string, string]
  /** Frame swap period (ms). Infinity / very large = freeze on frame 0. */
  periodMs: number
  /** Extra phase offset before first swap (ms). */
  delayMs: number
  /** Parallax bob amplitude (px). */
  bobPx: number
  /** Bob cycle duration (ms). */
  bobMs: number
  /** When true, always show frames[0] (pending regen). */
  freezeFrame?: boolean
}

export const INTRO_CROWD_GROUPS: readonly IntroCrowdGroupConfig[] = [
  {
    id: 'upperLeft',
    frames: INTRO_CINEMATIC_ASSETS.crowd.upperLeft,
    periodMs: 340,
    delayMs: 0,
    bobPx: 2,
    bobMs: 1400,
    freezeFrame: false,
  },
  {
    id: 'upperRight',
    frames: INTRO_CINEMATIC_ASSETS.crowd.upperRight,
    periodMs: 340,
    delayMs: 120,
    bobPx: 2,
    bobMs: 1400,
    freezeFrame: false,
  },
  {
    id: 'foreground',
    frames: INTRO_CINEMATIC_ASSETS.crowd.foreground,
    periodMs: 320,
    delayMs: 180,
    bobPx: 3,
    bobMs: 640,
    freezeFrame: false,
  },
] as const

/** Discrete 01 ↔ 02 index for a group at local elapsed (after crowd reveal). */
export function introCrowdFrameIndex(elapsedSinceRevealMs: number, group: IntroCrowdGroupConfig): 0 | 1 {
  if (group.freezeFrame) return 0
  const t = Math.max(0, elapsedSinceRevealMs - group.delayMs)
  const step = Math.floor(t / group.periodMs)
  return (step % 2 === 0 ? 0 : 1) as 0 | 1
}

export function introCrowdFrameSrc(elapsedSinceRevealMs: number, group: IntroCrowdGroupConfig): string {
  return group.frames[introCrowdFrameIndex(elapsedSinceRevealMs, group)]
}

/** Subtle vertical parallax bob; groups stay out of phase via delayMs. */
export function introCrowdBobY(elapsedSinceRevealMs: number, group: IntroCrowdGroupConfig): number {
  const t = Math.max(0, elapsedSinceRevealMs - group.delayMs)
  const phase = (t / group.bobMs) * Math.PI * 2
  return -Math.sin(phase) * group.bobPx
}
