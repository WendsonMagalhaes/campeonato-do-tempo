import type { AudioBus, AudioDirector } from './AudioDirector.contract.ts'

/**
 * Stub AudioDirector for Copa Esperança v2.
 * Final WAVs arrive in a later multitask round — hooks stay live, playback is no-op / optional fallback.
 * Existing localAudio (`/audio/*.wav` synthetics) remains a temporary UI fallback that can be silenced later.
 */
export function createStubAudioDirector(options?: {
  fallbackPlay?: (legacyName: string) => void
  eventMap?: Record<string, string>
  enabled?: boolean
}): AudioDirector {
  let muted = false
  const volumes: Record<AudioBus, number> = {
    announcer: 1,
    combat: 1,
    crowd: 1,
    ui: 1,
    music: 1,
    ambience: 1,
  }
  const enabled = options?.enabled ?? true
  const eventMap = options?.eventMap ?? {
    'combat.punchHeavy': 'round_win',
    'combat.hurtVariant': 'round_reveal',
    'combat.bodyImpact': 'vs_impact',
    'announcer.ko': 'match_win',
    'announcer.perfect': 'champion',
    'crowd.cheerBig': 'champion',
    'crowd.cheerShort': 'round_win',
    'ui.confirm': 'ui_confirm',
  }

  return {
    async preload() {
      /* WAVs pending — nothing to decode yet. */
    },
    play(event: string) {
      if (!enabled || muted) return
      const bus = busForEvent(event)
      if (volumes[bus] <= 0) return
      const legacy = eventMap[event]
      if (legacy && options?.fallbackPlay) {
        options.fallbackPlay(legacy)
      }
      // Future: resolve path from AUDIO_MANIFEST and play the real sample.
    },
    stop(_event: string) {
      /* no-op until real AudioBufferSourceNodes exist */
    },
    setBusVolume(bus: AudioBus, volume01: number) {
      volumes[bus] = Math.max(0, Math.min(1, volume01))
    },
    setMuted(next: boolean) {
      muted = next
    },
  }
}

function busForEvent(event: string): AudioBus {
  if (event.startsWith('announcer.')) return 'announcer'
  if (event.startsWith('combat.')) return 'combat'
  if (event.startsWith('crowd.')) return 'crowd'
  return 'ui'
}
