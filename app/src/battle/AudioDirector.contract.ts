export type AudioBus = 'announcer' | 'combat' | 'crowd' | 'ui' | 'music' | 'ambience'

export interface AudioDirector {
  preload(): Promise<void>
  play(event: string): void
  stop(event: string): void
  setBusVolume(bus: AudioBus, volume01: number): void
  setMuted(muted: boolean): void
}

// Implementation should resolve paths from docs/AUDIO_MANIFEST.json (or a generated TS equivalent),
// not hard-code Audio objects across React screens.
