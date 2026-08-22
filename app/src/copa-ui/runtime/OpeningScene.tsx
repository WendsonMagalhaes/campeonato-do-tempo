import { useEffect, useRef, useState } from 'react'
import { FixedCanvas } from '../components/FixedCanvas.tsx'
import { BitmapText } from '../components/BitmapText.tsx'
import { absoluteBox, OPENING } from '../layouts/championGeometry.ts'
import { globalAudio } from '../../audio/singleton.ts'
import { IntroCrowdLayer } from './IntroCrowdLayer.tsx'
import { IntroFightLayer } from './IntroFightLayer.tsx'
import { INTRO_CINEMATIC_ASSETS } from './introCinematicAssets.ts'
import {
  INTRO_STRIP,
  INTRO_TIMELINE,
  introFrameStateAt,
  type IntroFrameState,
} from './introTimeline.ts'
import './runtime.css'

type Props = {
  /** Retained for scoreboard call sites; opening no longer shows the tournament title. */
  tournamentName: string
  /**
   * Bump when intro BGM actually starts (e.g. after audio unlock) so the
   * cinematic clock re-zeros in sync with music.
   */
  timelineEpoch?: number | string
}

/**
 * Opening / press-start — FixedCanvas 1920×1080.
 *
 * Unified world camera: single continuous tall strip (sky → street).
 * Crowd and fighters are statically positioned in the street world so the
 * camera descent itself naturally reveals them.
 * No background swap on settle — tall strip remains active throughout.
 * After settle: PRESS START appears.
 */
export function OpeningScene({ tournamentName: _tournamentName, timelineEpoch = 0 }: Props) {
  const [frame, setFrame] = useState<IntroFrameState>(() => introFrameStateAt(0))
  const pressMusicSwitched = useRef(false)

  useEffect(() => {
    if (timelineEpoch === 'locked') return

    pressMusicSwitched.current = false
    const startedAt = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const elapsed = now - startedAt
      const next = introFrameStateAt(elapsed)
      setFrame(next)

      if (!pressMusicSwitched.current && elapsed >= INTRO_TIMELINE.crowdFullEnergy) {
        pressMusicSwitched.current = true
        globalAudio.playMusic('introPressStart')
      }

      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [timelineEpoch])

  const crowdSinceReveal = Math.max(0, frame.elapsedMs - INTRO_TIMELINE.cameraDropStart)
  const tallStrip = INTRO_CINEMATIC_ASSETS.tallStrip ?? INTRO_CINEMATIC_ASSETS.street
  const scrollY = frame.cameraY + frame.skyDriftY

  return (
    <FixedCanvas className="ce-scene-host ce-opening-host">
      {/* Continuous camera scroll — single unified world (sky → street) */}
      <div
        className="ce-opening-camera"
        style={{ transform: `translate3d(0, ${-scrollY}px, 0)` }}
      >
        {/* Continuous tall background strip — stays active throughout entire scene (no swap) */}
        <img
          src={tallStrip}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="ce-opening-tall-strip ce-pixel"
        />

        {/* Sky Logo positioned in upper sky world */}
        {INTRO_CINEMATIC_ASSETS.skyLogo ? (
          <img
            src={INTRO_CINEMATIC_ASSETS.skyLogo}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="ce-opening-sky-logo ce-pixel"
          />
        ) : null}

        {/* Street World Group (ground level at streetY) */}
        <div
          className="ce-opening-street-world"
          style={{ top: INTRO_STRIP.streetY }}
        >
          {/* Upper Background Crowd on Sidewalks + Foreground Crowd */}
          <IntroCrowdLayer elapsedSinceRevealMs={crowdSinceReveal} opacity={1} />

          {/* Center Ring Fighters (under foreground crowd, above upper crowd) */}
          <IntroFightLayer />
        </div>
      </div>

      <div className="ce-team-vignette ce-opening-vignette" aria-hidden="true" />

      {/* Single PRESS START — BitmapText only */}
      {frame.showPressStart ? (
        <div
          style={absoluteBox(OPENING.pressStart)}
          className="ce-center ce-press-start ce-opening-press-start"
        >
          <BitmapText
            text="PRESS START"
            size="medium"
            align="center"
            scale={0.45}
            maxWidth={OPENING.pressStart.w}
          />
        </div>
      ) : null}
    </FixedCanvas>
  )
}
