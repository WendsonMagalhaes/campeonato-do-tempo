import { useMemo, useState } from 'react'
import { FixedCanvas } from '../copa-ui/components/FixedCanvas.tsx'
import {
  BATTLE,
  BATTLE_BG,
  absoluteBox,
  fighterPlacement,
} from '../copa-ui/layouts/battleGeometry.ts'
import { FighterSprite } from './FighterSprite.tsx'
import { createStubAudioDirector } from './createStubAudioDirector.ts'
import { useBattleDirector } from './useBattleDirector.ts'
import { APPROACH_PX, WALK_IN_MS } from './battle-timeline.ts'
import { battleFx } from './battle-assets.ts'
import type { FighterAnim, FighterVariant } from './battle-assets.ts'
import { ALL_REGISTERED_PARTICIPANTS } from '../domain/participants.ts'
import '../copa-ui/runtime/runtime.css'
import '../ui/canonical/canonical-ui.css'

/**
 * Dev-only visual harness for fighter grounding + animation QA.
 * Open `/debug/battle-sprites` (no domain state required).
 * "Round win" / "KO" buttons replay the real battle timelines
 * (walk-in attack, hurt flip, fall, crowd) with stub audio.
 */
export function BattleSpriteDebug() {
  const [leftAnim, setLeftAnim] = useState<FighterAnim>('idle')
  const [rightAnim, setRightAnim] = useState<FighterAnim>('idle')
  const [leftVariant, setLeftVariant] = useState<FighterVariant>('female')
  const [leftSlug, setLeftSlug] = useState<string>('fatinha')
  const [rightVariant, setRightVariant] = useState<FighterVariant>('female')
  const [rightSlug, setRightSlug] = useState<string>('samara')
  const [timeline, setTimeline] = useState<{ key: string; winner: 'left' | 'right'; ko: boolean } | null>(null)

  const audio = useMemo(() => createStubAudioDirector({ enabled: false }), [])
  const visual = useBattleDirector({
    resultKey: timeline?.key ?? null,
    winnerSide: timeline?.winner ?? null,
    matchPoint: timeline?.ko ?? false,
    finalScore: timeline?.ko ? '2-1' : null,
    introKey: null,
    roundNumber: null,
    audio,
    loserVariant: timeline?.winner === 'left' ? rightVariant : leftVariant,
  })

  const leftPlace = useMemo(() => fighterPlacement(BATTLE.leftFighter), [])
  const rightPlace = useMemo(() => fighterPlacement(BATTLE.rightFighter), [])

  const anims: FighterAnim[] = ['idle', 'walk', 'attack', 'hurt', 'fall', 'lying', 'victory']

  // Manual selectors drive the scene unless a timeline replay is running.
  const effLeft = timeline ? visual.left : leftAnim
  const effRight = timeline ? visual.right : rightAnim
  const leftShift = timeline && visual.advanceSide === 'left' ? APPROACH_PX : 0
  const rightShift = timeline && visual.advanceSide === 'right' ? -APPROACH_PX : 0

  const handleSelectLeft = (slug: string) => {
    setLeftSlug(slug)
    const p = ALL_REGISTERED_PARTICIPANTS.find((x) => x.slug === slug)
    if (p) setLeftVariant(p.fighterVariant)
  }

  const handleSelectRight = (slug: string) => {
    setRightSlug(slug)
    const p = ALL_REGISTERED_PARTICIPANTS.find((x) => x.slug === slug)
    if (p) setRightVariant(p.fighterVariant)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020706' }}>
      <div
        style={{
          position: 'fixed',
          zIndex: 50,
          top: 8,
          left: 8,
          right: 8,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'rgba(5, 15, 20, 0.92)',
          border: '1px solid rgba(0, 255, 180, 0.4)',
          borderRadius: 6,
          color: '#fff',
          padding: '10px 14px',
          fontFamily: 'monospace',
          fontSize: 13,
          boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ fontWeight: 'bold', color: '#2ea8ff', textTransform: 'uppercase' }}>
          Lutador Esquerda (AZUL):
        </div>
        <label>
          Personagem:{' '}
          <select
            value={leftSlug}
            onChange={(e) => handleSelectLeft(e.target.value)}
            style={{ background: '#112233', color: '#fff', padding: '3px 6px', borderRadius: 4 }}
          >
            <option value="">-- Genérico (Fallback) --</option>
            {ALL_REGISTERED_PARTICIPANTS.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.displayName} ({p.fighterVariant})
              </option>
            ))}
          </select>
        </label>
        <label>
          Animação:{' '}
          <select
            value={leftAnim}
            onChange={(e) => setLeftAnim(e.target.value as FighterAnim)}
            style={{ background: '#112233', color: '#fff', padding: '3px 6px', borderRadius: 4 }}
          >
            {anims.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

        <div style={{ fontWeight: 'bold', color: '#ff4a35', textTransform: 'uppercase' }}>
          Lutador Direita (VERMELHO):
        </div>
        <label>
          Personagem:{' '}
          <select
            value={rightSlug}
            onChange={(e) => handleSelectRight(e.target.value)}
            style={{ background: '#331111', color: '#fff', padding: '3px 6px', borderRadius: 4 }}
          >
            <option value="">-- Genérico (Fallback) --</option>
            {ALL_REGISTERED_PARTICIPANTS.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.displayName} ({p.fighterVariant})
              </option>
            ))}
          </select>
        </label>
        <label>
          Animação:{' '}
          <select
            value={rightAnim}
            onChange={(e) => setRightAnim(e.target.value as FighterAnim)}
            style={{ background: '#331111', color: '#fff', padding: '3px 6px', borderRadius: 4 }}
          >
            {anims.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setTimeline({ key: `rw-${Date.now()}`, winner: 'left', ko: false })}
            style={{ background: '#0a3d62', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
          >
            Win L (Golpe)
          </button>
          <button
            onClick={() => setTimeline({ key: `rw-${Date.now()}`, winner: 'right', ko: false })}
            style={{ background: '#b71540', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
          >
            Win R (Golpe)
          </button>
          <button
            onClick={() => setTimeline({ key: `ko-${Date.now()}`, winner: 'left', ko: true })}
            style={{ background: '#1e3799', color: '#ffd32a', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
          >
            KO L (Nocaute)
          </button>
          <button
            onClick={() => setTimeline({ key: `ko-${Date.now()}`, winner: 'right', ko: true })}
            style={{ background: '#eb2f06', color: '#ffd32a', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
          >
            KO R (Nocaute)
          </button>
          <button
            onClick={() => setTimeline(null)}
            style={{ background: '#444', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
          >
            Reset
          </button>
        </div>
      </div>

      <FixedCanvas className="ce-scene-host ce-battle-host">
        <img
          className="ce-battle-bg ce-pixel"
          src={BATTLE_BG}
          alt=""
          aria-hidden="true"
          style={absoluteBox(BATTLE.background)}
        />
        <FighterSprite
          className="ce-battle-fighter"
          side="blue"
          variant={leftVariant}
          participantSlug={leftSlug || undefined}
          anim={effLeft}
          style={{
            position: 'absolute',
            left: leftPlace.left,
            top: leftPlace.top,
            width: leftPlace.width,
            height: leftPlace.height,
            zIndex: 3,
            transform: `translateX(${leftShift}px)`,
            transition: `transform ${WALK_IN_MS}ms linear`,
          }}
        />
        <FighterSprite
          className="ce-battle-fighter"
          side="red"
          variant={rightVariant}
          participantSlug={rightSlug || undefined}
          anim={effRight}
          style={{
            position: 'absolute',
            left: rightPlace.left,
            top: rightPlace.top,
            width: rightPlace.width,
            height: rightPlace.height,
            zIndex: 3,
            transform: `translateX(${rightShift}px)`,
            transition: `transform ${WALK_IN_MS}ms linear`,
          }}
        />
        {timeline && visual.impactVisible ? (
          <img
            className="ce-battle-impact ce-pixel"
            src={battleFx.impact}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: BATTLE.impactCenter.x - BATTLE.impactSize.w / 2,
              top: BATTLE.impactCenter.y - BATTLE.impactSize.h / 2,
              width: BATTLE.impactSize.w,
              height: BATTLE.impactSize.h,
              objectFit: 'contain',
              zIndex: 3,
              pointerEvents: 'none',
              transform: `translateX(${leftShift + rightShift}px)`,
            }}
          />
        ) : null}
        {/* Floor baseline guide for QA */}
        <div
          data-testid="floor-guide"
          style={{
            position: 'absolute',
            left: 0,
            top: BATTLE.leftFighter.baselineY,
            width: 1920,
            height: 2,
            background: 'rgba(255,0,0,.55)',
            zIndex: 9,
            pointerEvents: 'none',
          }}
        />
      </FixedCanvas>
    </div>
  )
}
