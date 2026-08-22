import type { AudioBus, AudioDirector } from '../battle/AudioDirector.contract.ts'
import { AUDIO_MIX, MUSIC } from './music-config'
import { SFX } from './sfx-config'

export class AudioDirectorImpl implements AudioDirector {
  private ctx: AudioContext | null = null
  private muted = false

  private masterGain: GainNode | null = null
  private buses: Record<AudioBus, GainNode> | null = null

  private buffers: Map<string, AudioBuffer> = new Map()
  private pendingArrayBuffers: Map<string, ArrayBuffer> = new Map()
  private loadingBuffers: Map<string, Promise<AudioBuffer | null>> = new Map()

  private lastCursorIdx = -1

  private musicSource: AudioBufferSourceNode | null = null
  private ambienceSource: AudioBufferSourceNode | null = null

  private currentMusicPath: string | null = null
  private targetMusicPath: string | null = null

  private currentAmbiencePath: string | null = null
  private targetAmbiencePath: string | null = null

  private volumes: Record<AudioBus, number> = {
    announcer: 1,
    combat: 1,
    crowd: 1,
    ui: 1,
    music: 1,
    ambience: 1,
  }

  private initContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return null

    this.ctx = new AudioContextClass()
    this.masterGain = this.ctx.createGain()
    this.masterGain.connect(this.ctx.destination)

    this.buses = {
      announcer: this.ctx.createGain(),
      combat: this.ctx.createGain(),
      crowd: this.ctx.createGain(),
      ui: this.ctx.createGain(),
      music: this.ctx.createGain(),
      ambience: this.ctx.createGain(),
    }

    Object.keys(this.buses).forEach((busKey) => {
      const bus = this.buses![busKey as AudioBus]
      bus.connect(this.masterGain!)
      bus.gain.value = this.volumes[busKey as AudioBus]
    })

    return this.ctx
  }

  async preload() {
    const paths = new Set<string>()
    Object.values(MUSIC).forEach((p) => paths.add(p))
    Object.values(SFX.announcer).forEach((p) => paths.add(p))
    SFX.ui.cursorMove.forEach((p) => paths.add(p))
    paths.add(SFX.ui.selectionLock)
    paths.add(SFX.ui.vsImpact)
    paths.add(SFX.ui.screenTransition)
    paths.add(SFX.ui.bracketAdvance)
    paths.add(SFX.ui.flash)
    paths.add(SFX.combat.mediumHit)
    paths.add(SFX.combat.heavyHit)
    SFX.crowd.roundWin.forEach((p) => paths.add(p))
    SFX.crowd.matchWin.forEach((p) => paths.add(p))
    paths.add(SFX.crowd.matchWinShort)
    paths.add(SFX.ambience.crowd)
    paths.add(SFX.ambience.coldRoom)

    paths.add('/assets/audio/fighters/female/hurt_01.wav')
    paths.add('/assets/audio/fighters/male/hurt_01.wav')
    paths.add('/assets/audio/fighters/male/hurt_02.wav')
    paths.add('/assets/audio/fighters/common/knockdown_impact_01.wav')
    paths.add('/assets/audio/fighters/common/knockdown_impact_02.wav')

    await Promise.all(
      Array.from(paths).map(async (path) => {
        try {
          const res = await fetch(path)
          if (!res.ok) return
          const arrayBuffer = await res.arrayBuffer()
          if (this.ctx) {
            try {
              const decoded = await this.ctx.decodeAudioData(arrayBuffer.slice(0))
              this.buffers.set(path, decoded)
            } catch (e) {
              console.warn('[AudioDirector] decode failed for', path, e)
            }
          } else {
            this.pendingArrayBuffers.set(path, arrayBuffer)
          }
        } catch (e) {
          console.warn('[AudioDirector] fetch failed for', path, e)
        }
      }),
    )
  }

  async unlock() {
    const ctx = this.initContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch (e) {
        console.warn('[AudioDirector] resume failed:', e)
      }
    }

    // Decode all pending buffers
    for (const [path, arrayBuffer] of this.pendingArrayBuffers.entries()) {
      try {
        const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0))
        this.buffers.set(path, decoded)
      } catch (e) {
        console.warn('[AudioDirector] pending decode failed for', path, e)
      }
    }
    this.pendingArrayBuffers.clear()

    // Resume target music or ambience if pending
    if (this.targetMusicPath && this.targetMusicPath !== this.currentMusicPath) {
      this.playMusicByPath(this.targetMusicPath)
    }
    if (this.targetAmbiencePath && this.targetAmbiencePath !== this.currentAmbiencePath) {
      this.playAmbienceByPath(this.targetAmbiencePath)
    }
  }

  private async getOrLoadBuffer(path: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(path)) return this.buffers.get(path)!
    if (this.loadingBuffers.has(path)) return this.loadingBuffers.get(path)!

    const promise = (async () => {
      try {
        const ctx = this.initContext()
        if (!ctx) return null
        let arrayBuf = this.pendingArrayBuffers.get(path)
        if (!arrayBuf) {
          const res = await fetch(path)
          if (!res.ok) return null
          arrayBuf = await res.arrayBuffer()
        }
        const decoded = await ctx.decodeAudioData(arrayBuf.slice(0))
        this.buffers.set(path, decoded)
        this.pendingArrayBuffers.delete(path)
        return decoded
      } catch (e) {
        console.warn('[AudioDirector] Failed to load buffer for', path, e)
        return null
      } finally {
        this.loadingBuffers.delete(path)
      }
    })()

    this.loadingBuffers.set(path, promise)
    return promise
  }

  play(event: string) {
    if (this.muted) return
    const ctx = this.initContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    let path: string | null = null
    let bus: AudioBus = 'ui'

    if (event === 'ui.cursorMove' || event === 'fake_shuffle_tick') {
      bus = 'ui'
      let idx = Math.floor(Math.random() * SFX.ui.cursorMove.length)
      if (idx === this.lastCursorIdx) {
        idx = (idx + 1) % SFX.ui.cursorMove.length
      }
      this.lastCursorIdx = idx
      path = SFX.ui.cursorMove[idx]
    } else if (
      event === 'ui.selectionLock' ||
      event === 'ui.confirm' ||
      event === 'ui_confirm' ||
      event === 'bracket_lock' ||
      event === 'pair_reveal'
    ) {
      bus = 'ui'
      path = SFX.ui.selectionLock
    } else if (event === 'ui.vsImpact' || event === 'vs_impact') {
      bus = 'ui'
      path = SFX.ui.vsImpact
    } else if (event === 'ui.bracketAdvance' || event === 'bracket_shuffle') {
      bus = 'ui'
      path = SFX.ui.bracketAdvance
    } else if (event === 'combat.punchHeavy' || event === 'combat.heavyHit') {
      bus = 'combat'
      path = SFX.combat.heavyHit
      this.applyDucking('combat')
    } else if (event === 'combat.punchMedium' || event === 'combat.mediumHit') {
      bus = 'combat'
      path = SFX.combat.mediumHit
    } else if (event === 'combat.hurtVariant' || event === 'fighter.male.hurt') {
      bus = 'combat'
      path =
        Math.random() < 0.5
          ? '/assets/audio/fighters/male/hurt_01.wav'
          : '/assets/audio/fighters/male/hurt_02.wav'
    } else if (event === 'fighter.female.hurt') {
      bus = 'combat'
      path = '/assets/audio/fighters/female/hurt_01.wav'
    } else if (event === 'combat.bodyImpact' || event === 'fighter.knockdownImpact') {
      bus = 'combat'
      path = '/assets/audio/fighters/common/knockdown_impact_01.wav'
    } else if (event === 'announcer.ko') {
      bus = 'announcer'
      path = SFX.announcer.ko
      this.applyDucking('voice')
    } else if (event === 'announcer.perfect') {
      bus = 'announcer'
      path = SFX.announcer.perfect
      this.applyDucking('voice')
    } else if (event === 'announcer.fight') {
      bus = 'announcer'
      path = SFX.announcer.fight
      this.applyDucking('voice')
    } else if (event === 'announcer.round1') {
      bus = 'announcer'
      path = SFX.announcer.round1
      this.applyDucking('voice')
    } else if (event === 'announcer.round2') {
      bus = 'announcer'
      path = SFX.announcer.round2
      this.applyDucking('voice')
    } else if (event === 'announcer.finalRound') {
      bus = 'announcer'
      path = SFX.announcer.finalRound
      this.applyDucking('voice')
    } else if (event === 'crowd.cheerBig' || event === 'match_win' || event === 'champion') {
      bus = 'crowd'
      const variants = SFX.crowd.matchWin
      path = variants[Math.floor(Math.random() * variants.length)]
    } else if (event === 'crowd.cheerShort' || event === 'round_win' || event === 'tie') {
      bus = 'crowd'
      const variants = SFX.crowd.roundWin
      path = variants[Math.floor(Math.random() * variants.length)]
    }

    if (!path) return

    const buffer = this.buffers.get(path)
    if (buffer) {
      this.playBufferDirect(buffer, bus, false)
    } else {
      void this.getOrLoadBuffer(path).then((buf) => {
        if (buf) this.playBufferDirect(buf, bus, false)
      })
    }
  }

  playMusic(track: keyof typeof MUSIC | null) {
    const path = track ? MUSIC[track] : null
    this.targetMusicPath = path
    this.playMusicByPath(path)
  }

  private playMusicByPath(path: string | null) {
    if (this.currentMusicPath === path && this.musicSource) return

    if (this.musicSource) {
      try {
        this.musicSource.stop()
        this.musicSource.disconnect()
      } catch (_) {}
      this.musicSource = null
    }
    this.currentMusicPath = null

    if (!path) return

    const ctx = this.initContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    const buffer = this.buffers.get(path)
    if (buffer) {
      this.musicSource = this.playBufferDirect(buffer, 'music', true)
      this.currentMusicPath = path
    } else {
      void this.getOrLoadBuffer(path).then((buf) => {
        if (this.targetMusicPath === path && buf) {
          if (this.musicSource) {
            try {
              this.musicSource.stop()
              this.musicSource.disconnect()
            } catch (_) {}
          }
          this.musicSource = this.playBufferDirect(buf, 'music', true)
          this.currentMusicPath = path
        }
      })
    }
  }

  playAmbience(track: 'coldRoom' | 'crowd' | null) {
    const path = track ? SFX.ambience[track] : null
    this.targetAmbiencePath = path
    this.playAmbienceByPath(path)
  }

  private playAmbienceByPath(path: string | null) {
    if (this.currentAmbiencePath === path && this.ambienceSource) return

    if (this.ambienceSource) {
      try {
        this.ambienceSource.stop()
        this.ambienceSource.disconnect()
      } catch (_) {}
      this.ambienceSource = null
    }
    this.currentAmbiencePath = null

    if (!path) return

    const ctx = this.initContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    const buffer = this.buffers.get(path)
    if (buffer) {
      this.ambienceSource = this.playBufferDirect(buffer, 'ambience', true)
      this.currentAmbiencePath = path
    } else {
      void this.getOrLoadBuffer(path).then((buf) => {
        if (this.targetAmbiencePath === path && buf) {
          if (this.ambienceSource) {
            try {
              this.ambienceSource.stop()
              this.ambienceSource.disconnect()
            } catch (_) {}
          }
          this.ambienceSource = this.playBufferDirect(buf, 'ambience', true)
          this.currentAmbiencePath = path
        }
      })
    }
  }

  private playBufferDirect(buffer: AudioBuffer, bus: AudioBus, loop = false): AudioBufferSourceNode | null {
    if (!this.ctx || !this.buses || this.muted) return null
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.loop = loop
    source.connect(this.buses[bus])
    source.start()
    return source
  }

  private applyDucking(type: 'voice' | 'combat') {
    if (!this.ctx || !this.buses) return
    const now = this.ctx.currentTime
    const musicGain = this.buses.music.gain

    const db = type === 'voice' ? AUDIO_MIX.voiceDuckDb : AUDIO_MIX.combatDuckDb
    const attackMs = type === 'voice' ? AUDIO_MIX.voiceDuckAttackMs : 50
    const duckGainValue = Math.pow(10, db / 20) * this.volumes.music

    musicGain.cancelScheduledValues(now)
    musicGain.setValueAtTime(musicGain.value, now)
    musicGain.linearRampToValueAtTime(duckGainValue, now + attackMs / 1000)

    const releaseMs = type === 'voice' ? AUDIO_MIX.voiceDuckReleaseMs : AUDIO_MIX.combatDuckMs
    musicGain.linearRampToValueAtTime(this.volumes.music, now + attackMs / 1000 + releaseMs / 1000)
  }

  stop(_event: string) {}

  setBusVolume(bus: AudioBus, volume01: number) {
    const v = Math.max(0, Math.min(1, volume01))
    this.volumes[bus] = v
    if (this.buses && this.ctx) {
      this.buses[bus].gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05)
    }
  }
}
