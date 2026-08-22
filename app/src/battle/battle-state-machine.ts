export type FighterAnim = 'idle' | 'walk' | 'attack' | 'hurt' | 'fall' | 'lying' | 'victory'
export type BattlePhase =
  | 'pre-round'
  | 'round-announce'
  | 'waiting-result'
  | 'attack'
  | 'impact'
  | 'hurt'
  | 'fall'
  | 'lying-ko'
  | 'ko-announce'
  | 'perfect-announce'
  | 'score-reveal'
  | 'victory'
  | 'qualified'

export type CrowdMood = 'ambient' | 'cheer'

export interface BattleVisualState {
  phase: BattlePhase
  left: FighterAnim
  right: FighterAnim
  impactVisible: boolean
  cameraShake: 'none' | 'light' | 'heavy' | 'ko'
  overlayText: string | null
  /**
   * Large PNG callout (ROUND / FIGHT / KO) — centered overlay, not HUD BitmapText.
   * Null when idle or when BitmapText overlays (PERFECT / VENCE A RODADA) own the band.
   */
  calloutSrc: string | null
  /** Environment crowd_sheet: ambient loop vs cheer when SFX fires. */
  crowdMood: CrowdMood
  /** Which fighter walked forward to punch (null = both at rest position). */
  advanceSide: 'left' | 'right' | null
}

export const initialBattleVisualState: BattleVisualState = {
  phase: 'waiting-result',
  left: 'idle',
  right: 'idle',
  impactVisible: false,
  cameraShake: 'none',
  overlayText: null,
  calloutSrc: null,
  crowdMood: 'ambient',
  advanceSide: null,
}

export function applyFighterState(
  state: BattleVisualState,
  side: 'left' | 'right',
  anim: FighterAnim,
): BattleVisualState {
  return side === 'left' ? { ...state, left: anim } : { ...state, right: anim }
}
