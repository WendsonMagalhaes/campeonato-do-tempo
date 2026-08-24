import { useEffect, useRef } from 'react'
import { BitmapText } from '../components/BitmapText.tsx'
import { canonicalUi } from '../../battle/battle-assets.ts'
import { globalAudio } from '../../audio/singleton.ts'
import './runtime.css'

export type RoundAnnounceMember = { id: string; name: string; photoUrl: string | null }

type Props = {
    roundLabel: string
    left: RoundAnnounceMember
    right: RoundAnnounceMember
    onDone: () => void
    holdMs?: number
}

// Corpo inteiro = imagem em pé (retrato), não o quadrado do PlayerPortrait.
const BODY_W = 340
const BODY_H = 620
const VS_SIZE = 130

/**
 * Anúncio dos 2 participantes de uma rodada, antes do BattleScene começar.
 * Mostra só a foto de corpo inteiro de cada um (sem moldura de nome) — o
 * VS entre os dois já deixa claro quem enfrenta quem. Overlay transparente
 * com blur — a cena de baixo (batalha/chave) continua visível ao fundo.
 */
export function RoundAnnounceScene({ roundLabel, left, right, onDone, holdMs = 2500 }: Props) {
    const playedRef = useRef<string | null>(null)

    useEffect(() => {
        const key = `${left.id}-${right.id}`
        if (playedRef.current !== key) {
            playedRef.current = key
            globalAudio.play('vs_impact') // troque pelo sfx de anúncio que preferir
        }
        const t = window.setTimeout(onDone, holdMs)
        return () => window.clearTimeout(t)
    }, [left.id, right.id, holdMs, onDone])

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                pointerEvents: 'none',
            }}
        >
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <BitmapText text={roundLabel.toUpperCase()} size="medium" scale={0.45} align="center" maxWidth={800} />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40 }}>
                <div
                    className="ce-versus-enter-left"
                    style={{ width: BODY_W, height: BODY_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                >
                    {left.photoUrl ? (
                        <img
                            src={left.photoUrl}
                            alt={left.name}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                        />
                    ) : null}
                </div>

                <img
                    src={canonicalUi.vsEmblem}
                    alt="VS"
                    style={{ width: VS_SIZE, height: VS_SIZE, objectFit: 'contain', flexShrink: 0, marginBottom: BODY_H / 2 - VS_SIZE / 2 }}
                />

                <div
                    className="ce-versus-enter-right"
                    style={{ width: BODY_W, height: BODY_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                >
                    {right.photoUrl ? (
                        <img
                            src={right.photoUrl}
                            alt={right.name}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    )
}