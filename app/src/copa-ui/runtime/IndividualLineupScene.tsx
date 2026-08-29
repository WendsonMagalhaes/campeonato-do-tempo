import { useMemo } from 'react'
import { FixedCanvas } from '../components/FixedCanvas.tsx'
import { BitmapText } from '../components/BitmapText.tsx'
import { AvatarFrame } from '../components/AvatarFrame.tsx'
import { computeAutoGrid, type GridArea } from '../layouts/autoFormationGrid.ts'
import { VERSUS_BG } from '../layouts/versusGeometry.ts'
import { canonicalUi } from '../../battle/battle-assets.ts'
import './runtime.css'

export type LineupPortrait = { id: string; name: string; photoUrl: string | null }

export type LineupMatch = {
    id: string
    label: string
    participantA: LineupPortrait | null
    participantB: LineupPortrait | null
    /** Only used when mode === 'finished'. */
    scoreA?: number | null
    scoreB?: number | null
}

type Props = {
    title: string
    subtitle?: string
    matches: LineupMatch[]
    /** 'upcoming' shows the VS emblem between avatars; 'finished' shows the score. */
    mode?: 'upcoming' | 'finished'
    backgroundSrc?: string
}

// ---------------------------------------------------------------------
// Geometria -- mesma lógica de escala do TeamFormationScene (design
// canvas 1920x1080, computeAutoGrid pra distribuir os cards). Ajuste
// estas constantes se o resultado ficar grande/pequeno demais pro seu
// background real.
// ---------------------------------------------------------------------
const GRID_AREA: GridArea = { x: 120, y: 260, w: 1680, h: 700 }
/** width / height do card do confronto (mais largo que alto, pra caber os 2 avatares + vs). */
const CARD_ASPECT = 1.9
const CARD_GAP = 24

/** Proporção do próprio avatar dentro do card -- igual ao usado no grid do TeamFormationScene. */
const AVATAR_ASPECT = 0.8
const LABEL_H = 40
const LABEL_GAP = 8

function CardLabel({ x, y, w, text }: { x: number; y: number; w: number; text: string }) {
    return (
        <div
            style={{ position: 'absolute', left: x, top: y, width: w, height: LABEL_H, textAlign: 'center' }}
            className="ce-center"
        >
            <BitmapText text={text.toUpperCase()} size="small" align="center" scale={0.32} maxWidth={w - 12} />
        </div>
    )
}

function MidBadge({
    x,
    y,
    size,
    mode,
    scoreA,
    scoreB,
}: {
    x: number
    y: number
    size: number
    mode: 'upcoming' | 'finished'
    scoreA?: number | null
    scoreB?: number | null
}) {
    if (mode === 'finished' && typeof scoreA === 'number' && typeof scoreB === 'number') {
        return (
            <div
                style={{ position: 'absolute', left: x, top: y, width: size, height: size }}
                className="ce-center"
            >
                <BitmapText text={`${scoreA} x ${scoreB}`} size="small" align="center" scale={0.4} maxWidth={size} />
            </div>
        )
    }
    return (
        <img
            src={canonicalUi.vsEmblem}
            alt="VS"
            style={{ position: 'absolute', left: x, top: y, width: size, height: size, objectFit: 'contain' }}
        />
    )
}

/**
 * Grade de confrontos individuais -- reaproveita o mesmo vocabulário
 * visual das outras telas (FixedCanvas + AvatarFrame + emblema VS) em
 * vez de cards de CSS solto. Serve tanto pra lista de próximos confrontos
 * (`mode="upcoming"`) quanto pro resumo final com placar (`mode="finished"`).
 */
export function IndividualLineupScene({
    title,
    subtitle,
    matches,
    mode = 'upcoming',
    backgroundSrc = VERSUS_BG,
}: Props) {
    const grid = useMemo(
        () => computeAutoGrid(Math.max(matches.length, 1), GRID_AREA, { aspectRatio: CARD_ASPECT, gap: CARD_GAP }),
        [matches.length],
    )

    return (
        <FixedCanvas className="ce-scene-host">
            <img src={backgroundSrc} alt="" aria-hidden="true" className="ce-versus-stage-bg" draggable={false} />
            <div className="ce-team-vignette" aria-hidden="true" />

            <div style={{ position: 'absolute', left: 0, top: 96, width: 1920 }} className="ce-center">
                <BitmapText text={title.toUpperCase()} size="medium" align="center" scale={0.55} maxWidth={1600} />
            </div>
            {subtitle ? (
                <div style={{ position: 'absolute', left: 0, top: 160, width: 1920 }} className="ce-center">
                    <BitmapText text={subtitle.toUpperCase()} size="small" align="center" scale={0.35} maxWidth={1400} />
                </div>
            ) : null}

            {matches.length === 0 ? (
                <div style={{ ...GRID_AREA, position: 'absolute' }} className="ce-center">
                    <BitmapText text="AGUARDANDO CONFRONTOS" size="medium" align="center" scale={0.45} maxWidth={1200} />
                </div>
            ) : (
                matches.map((match, i) => {
                    const cell = grid.cells[i]
                    const avatarH = cell.h - LABEL_H - LABEL_GAP
                    const avatarW = avatarH * AVATAR_ASPECT
                    const midSize = Math.max(Math.min(cell.h * 0.3, cell.w - avatarW * 2 - 24), 48)
                    const avatarTop = cell.y + LABEL_H + LABEL_GAP
                    const leftX = cell.x
                    const rightX = cell.x + cell.w - avatarW
                    const midX = cell.x + cell.w / 2 - midSize / 2
                    const midY = avatarTop + avatarH / 2 - midSize / 2

                    return (
                        <div key={match.id}>
                            <CardLabel x={cell.x} y={cell.y} w={cell.w} text={match.label} />

                            <div style={{ position: 'absolute', left: leftX, top: avatarTop, width: avatarW, height: avatarH }}>
                                <AvatarFrame
                                    name={match.participantA?.name ?? '?'}
                                    photoSrc={match.participantA?.photoUrl}
                                    nameScale={0.2}
                                />
                            </div>

                            <MidBadge x={midX} y={midY} size={midSize} mode={mode} scoreA={match.scoreA} scoreB={match.scoreB} />

                            <div style={{ position: 'absolute', left: rightX, top: avatarTop, width: avatarW, height: avatarH }}>
                                <AvatarFrame
                                    name={match.participantB?.name ?? '?'}
                                    photoSrc={match.participantB?.photoUrl}
                                    nameScale={0.2}
                                />
                            </div>
                        </div>
                    )
                })
            )}
        </FixedCanvas>
    )
}