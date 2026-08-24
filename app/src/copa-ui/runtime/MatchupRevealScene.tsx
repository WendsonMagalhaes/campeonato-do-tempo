import { useEffect, useRef, useState } from 'react'
import { BitmapText } from '../components/BitmapText.tsx'
import { DuplaFrame } from '../components/DuplaFrame.tsx'
import { canonicalUi } from '../../battle/battle-assets.ts'
import { globalAudio } from '../../audio/singleton.ts'
import type { ScoreboardProjection } from '../../domain/projections.ts'
import './runtime.css'

type MatchView = ScoreboardProjection['matches'][number]

type Props = {
    /** Confrontos das oitavas, já ordenados por posição. */
    matches: MatchView[]
    getPhoto: (photoAssetId: string | null | undefined) => string | null
    /** Chamado quando o último confronto termina de ser exibido. */
    onDone: () => void
    /** Quanto tempo cada confronto fica em tela (ms). */
    stepMs?: number
}

// Tamanho de cada moldura de dupla — DuplaFrame mantém a proporção real
// do PNG (1536:1024) sozinho via aspectRatio, só precisamos dar a largura.
const DUO_W = 420
const VS_SIZE = 120

// Duração da transição de saída (fade+slide) antes de trocar de confronto —
// tem que bater com a animação declarada em runtime.css (.ce-matchup-exit-*).
const EXIT_MS = 350

/**
 * Apresentação centralizada de cada confronto das oitavas, com fundo
 * transparente — fica sobreposta à BracketScene, deixando a chave visível
 * ao fundo. Usada na transição bracket_drawn -> in_progress, no lugar do
 * antigo "tour de câmera" que só dava zoom nos cards pequenos do bracket.
 */
export function MatchupRevealScene({ matches, getPhoto, onDone, stepMs = 2500 }: Props) {
    const [index, setIndex] = useState(0)
    const [visible, setVisible] = useState(true)
    const lastKeyRef = useRef<string | null>(null)

    useEffect(() => {
        setIndex(0)
        setVisible(true)
        lastKeyRef.current = null
    }, [matches])

    useEffect(() => {
        if (matches.length === 0) {
            onDone()
            return
        }
        if (index >= matches.length) return

        const match = matches[index]
        if (lastKeyRef.current !== match.id) {
            lastKeyRef.current = match.id
            setVisible(true)
            globalAudio.play('ui.selectionLock')
        }

        const holdTimer = window.setTimeout(() => {
            setVisible(false)
            const isLast = index + 1 >= matches.length
            window.setTimeout(() => {
                if (isLast) {
                    onDone()
                } else {
                    setIndex((i) => i + 1)
                }
            }, EXIT_MS)
        }, stepMs)

        return () => window.clearTimeout(holdTimer)
    }, [index, matches, stepMs, onDone])

    const match = matches[index]
    if (!match) return null

    const m0a = match.membersA?.[0]
    const m1a = match.membersA?.[1]
    const m0b = match.membersB?.[0]
    const m1b = match.membersB?.[1]

    return (
        <div
            className="ce-matchup-reveal-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                // fundo transparente + desfoque do que está atrás (a chave)
                background: 'rgba(0, 0, 0, 0.25)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)', // Safari precisa do prefixo
                pointerEvents: 'none',
            }}
        >
            <div style={{ marginBottom: 18, textAlign: 'center' }}>
                <BitmapText text="OITAVAS DE FINAL" size="medium" scale={0.45} align="center" maxWidth={800} />
            </div>
            <div style={{ marginBottom: 28, textAlign: 'center' }}>
                <BitmapText
                    text={`CONFRONTO ${index + 1} DE ${matches.length}`}
                    size="small"
                    scale={0.3}
                    align="center"
                    maxWidth={800}
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                <div
                    key={`left-${match.id}`}
                    className={visible ? 'ce-versus-enter-left' : 'ce-matchup-exit-left'}
                    style={{ width: DUO_W }}
                >
                    <DuplaFrame
                        duplaName={match.teamA || 'A DEFINIR'}
                        memberAPhoto={m0a ? (m0a.photoAssetId ? getPhoto(m0a.photoAssetId) : m0a.avatarUrl ?? null) : null}
                        memberBPhoto={m1a ? (m1a.photoAssetId ? getPhoto(m1a.photoAssetId) : m1a.avatarUrl ?? null) : null}
                        memberAAlt={m0a?.name ?? ''}
                        memberBAlt={m1a?.name ?? ''}
                    />
                </div>

                <img
                    src={canonicalUi.vsEmblem}
                    alt="VS"
                    className="ce-vs"
                    style={{ width: VS_SIZE, height: VS_SIZE, objectFit: 'contain', flexShrink: 0 }}
                />

                <div
                    key={`right-${match.id}`}
                    className={visible ? 'ce-versus-enter-right' : 'ce-matchup-exit-right'}
                    style={{ width: DUO_W }}
                >
                    <DuplaFrame
                        duplaName={match.teamB || 'A DEFINIR'}
                        memberAPhoto={m0b ? (m0b.photoAssetId ? getPhoto(m0b.photoAssetId) : m0b.avatarUrl ?? null) : null}
                        memberBPhoto={m1b ? (m1b.photoAssetId ? getPhoto(m1b.photoAssetId) : m1b.avatarUrl ?? null) : null}
                        memberAAlt={m0b?.name ?? ''}
                        memberBAlt={m1b?.name ?? ''}
                    />
                </div>
            </div>
        </div>
    )
}