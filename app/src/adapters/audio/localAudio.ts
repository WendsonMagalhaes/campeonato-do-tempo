import type { AudioPort } from '../../application/ports.ts'

const FILES: Record<string, string> = {
  ui_confirm: '/audio/ui_confirm.wav',
  /** Soft arcade lock — replaces synthetic blip for AssignTimerValue / manual assign. */
  ui_select: '/assets/audio/ui/selection_lock.wav',
  press_start: '/audio/press_start.wav',
  fake_shuffle_tick: '/audio/fake_shuffle_tick.wav',
  pair_reveal: '/audio/pair_reveal.wav',
  bracket_shuffle: '/audio/bracket_shuffle.wav',
  bracket_lock: '/audio/bracket_lock.wav',
  vs_impact: '/audio/vs_impact.wav',
  timer_detected: '/audio/timer_detected.wav',
  round_reveal: '/audio/round_reveal.wav',
  round_win: '/audio/round_win.wav',
  tie: '/audio/tie.wav',
  match_win: '/audio/match_win.wav',
  advance: '/audio/advance.wav',
  champion: '/audio/champion.wav',
  error: '/audio/error.wav',
}

export function createLocalAudio(): AudioPort {
  return {
    play(name: string) {
      const src = FILES[name]
      if (!src) return
      const audio = new Audio(src)
      audio.play().catch(() => {
        /* áudio quebrado nunca bloqueia */
      })
    },
  }
}
