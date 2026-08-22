import { useEffect, useRef, useState } from 'react'

import type { AudioDirector } from './AudioDirector.contract.ts'
import { battleCallouts, calloutForRound } from './battle-assets.ts'
import type { FighterVariant } from './battle-assets.ts'
import {
  applyFighterState,
  initialBattleVisualState,
  type BattleVisualState,
  type FighterAnim,
} from './battle-state-machine.ts'
import { buildMatchFinishTimeline, buildRoundWinTimeline, type BattleCue } from './battle-timeline.ts'

export interface BattleDirectorInput {
  /** Fires when a round result is revealed (not while times are hidden). */
  resultKey: string | null
  winnerSide: 'left' | 'right' | null
  matchPoint: boolean
  finalScore: '2-0' | '2-1' | null
  /**
   * Unique key when a round becomes active (players selected).
   * Drives announcer ROUND → pause → FIGHT once per round.
   */
  introKey: string | null
  /** 1 / 2 / 3 — selects announcer.round1 | round2 | finalRound */
  roundNumber: number | null
  audio: AudioDirector
  /** Hurt vocal gender keyed off the participant who takes the hit. */
  loserVariant?: FighterVariant
}

/** ROUND call duration + short dramatic pause before FIGHT (ms). */
export const INTRO_FIGHT_AT_MS: Record<number, number> = {
  1: 1650,
  2: 1600,
  3: 1700,
}

/** How long the FIGHT PNG stays after the fight announcer cue. */
export const INTRO_FIGHT_CALLOUT_MS = 1400

export type RoundIntroPlan = {
  roundNumber: number
  roundEvent: 'announcer.round1' | 'announcer.round2' | 'announcer.finalRound'
  roundCalloutSrc: string
  fightCalloutSrc: string
  fightAtMs: number
  clearAtMs: number
}

/** Pure schedule for ROUND → FIGHT → clear (R1 / R2 / final). */
export function buildRoundIntroPlan(roundNumber: number): RoundIntroPlan {
  const n = roundNumber === 1 || roundNumber === 2 || roundNumber === 3 ? roundNumber : 1
  const fightAtMs = INTRO_FIGHT_AT_MS[n] ?? 1650
  return {
    roundNumber: n,
    roundEvent: n === 1 ? 'announcer.round1' : n === 2 ? 'announcer.round2' : 'announcer.finalRound',
    roundCalloutSrc: calloutForRound(n),
    fightCalloutSrc: battleCallouts.fight,
    fightAtMs,
    clearAtMs: fightAtMs + INTRO_FIGHT_CALLOUT_MS,
  }
}

/**
 * Drives fighter/FX/camera state from battle timeline cues + round intro VO.
 * AudioDirector hooks are always invoked; WAV assets may still be pending.
 */
export function useBattleDirector(input: BattleDirectorInput): BattleVisualState {
  const [visual, setVisual] = useState<BattleVisualState>(initialBattleVisualState)
  const timersRef = useRef<number[]>([])
  const introTimersRef = useRef<number[]>([])
  const lastKeyRef = useRef<string | null>(null)
  const lastIntroRef = useRef<string | null>(null)
  const audioRef = useRef(input.audio)
  audioRef.current = input.audio
  const loserVariantRef = useRef<FighterVariant>(input.loserVariant ?? 'male')
  loserVariantRef.current = input.loserVariant ?? 'male'

  useEffect(() => {
    const clearIntro = () => {
      introTimersRef.current.forEach((id) => window.clearTimeout(id))
      introTimersRef.current = []
    }

    if (!input.introKey || !input.roundNumber) {
      clearIntro()
      lastIntroRef.current = null
      return clearIntro
    }

    // Always (re)schedule on effect entry. React Strict Mode runs mount→cleanup→mount;
    // skipping when lastIntroRef already matches left ROUND stuck with no FIGHT/clear.
    clearIntro()
    lastIntroRef.current = input.introKey
    const plan = buildRoundIntroPlan(input.roundNumber)

    // Visual ROUND banner synced with announcer (R1 / R2 / final — always then FIGHT).
    setVisual((prev) => ({
      ...prev,
      phase: 'round-announce',
      calloutSrc: plan.roundCalloutSrc,
      overlayText: null,
    }))
    audioRef.current.play(plan.roundEvent)

    const fightId = window.setTimeout(() => {
      setVisual((prev) => ({
        ...prev,
        calloutSrc: plan.fightCalloutSrc,
      }))
      audioRef.current.play('announcer.fight')
    }, plan.fightAtMs)
    introTimersRef.current.push(fightId)

    const clearId = window.setTimeout(() => {
      setVisual((prev) => ({
        ...prev,
        phase: 'waiting-result',
        calloutSrc: null,
      }))
    }, plan.clearAtMs)
    introTimersRef.current.push(clearId)

    return clearIntro
  }, [input.introKey, input.roundNumber])

  useEffect(() => {
    const clearTimers = () => {
      timersRef.current.forEach((id) => window.clearTimeout(id))
      timersRef.current = []
    }

    if (!input.resultKey || !input.winnerSide) {
      clearTimers()
      lastKeyRef.current = null
      // Preserve intro callout when resetting between results; only wipe timeline fields.
      setVisual((prev) => ({
        ...initialBattleVisualState,
        calloutSrc: prev.calloutSrc,
        phase: prev.calloutSrc ? prev.phase : initialBattleVisualState.phase,
      }))
      return clearTimers
    }

    // Always (re)schedule on effect entry. React Strict Mode runs mount→cleanup→mount;
    // skipping when lastKeyRef already matches left the timeline cancelled forever.
    clearTimers()
    lastKeyRef.current = input.resultKey
    setVisual(initialBattleVisualState)

    const cues: BattleCue[] =
      input.matchPoint && input.finalScore
        ? buildMatchFinishTimeline(input.winnerSide, input.finalScore)
        : buildRoundWinTimeline(input.winnerSide)

    for (const cue of cues) {
      const id = window.setTimeout(() => {
        setVisual((prev) => applyCue(prev, cue, audioRef.current, loserVariantRef.current))
      }, cue.at)
      timersRef.current.push(id)
    }

    return clearTimers
  }, [input.resultKey, input.winnerSide, input.matchPoint, input.finalScore])

  return visual
}

function applyCue(
  prev: BattleVisualState,
  cue: BattleCue,
  audio: AudioDirector,
  loserVariant: FighterVariant,
): BattleVisualState {
  switch (cue.type) {
    case 'fighter': {
      const anim = cue.state as FighterAnim
      return applyFighterState(prev, cue.side, anim)
    }
    case 'fx':
      return {
        ...prev,
        impactVisible: cue.name !== 'impact.hide',
      }
    case 'audio': {
      if (cue.event === 'combat.hurtVariant') {
        audio.play(loserVariant === 'female' ? 'fighter.female.hurt' : 'fighter.male.hurt')
        return prev
      }
      audio.play(cue.event)
      // Sync crowd_sheet reaction with crowd cheer SFX (FX_SYSTEM / BATTLE_TIMELINE).
      if (
        cue.event.startsWith('crowd.cheer') ||
        cue.event === 'round_win' ||
        cue.event === 'match_win' ||
        cue.event === 'champion'
      ) {
        return { ...prev, crowdMood: 'cheer' }
      }
      return prev
    }
    case 'advance':
      return { ...prev, advanceSide: cue.side }
    case 'camera':
      return { ...prev, cameraShake: cue.shake }
    case 'phase':
      return { ...prev, phase: cue.phase as BattleVisualState['phase'] }
    case 'overlay':
      return { ...prev, overlayText: cue.text }
    case 'callout':
      return { ...prev, calloutSrc: cue.src }
    case 'screen':
      return prev
    default:
      return prev
  }
}
