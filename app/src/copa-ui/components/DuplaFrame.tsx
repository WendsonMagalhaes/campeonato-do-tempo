import type { CSSProperties } from 'react'
import { BitmapText } from '../components/BitmapText.tsx'

// Ajuste este caminho para onde o PNG realmente está no projeto.
import duplaFrameSrc from '/assets/participants/dupla-frame.png'

// Coordenadas medidas na imagem original (1536x1024px), em %.
const FRAME_W = 1536
const FRAME_H = 1024
const pct = (px: number, total: number) => `${(px / total) * 100}%`

const LEFT_WINDOW: CSSProperties = {
    position: 'absolute',
    left: pct(101, FRAME_W),
    top: pct(110, FRAME_H),
    width: pct(622 - 101, FRAME_W),
    height: pct(720 - 110, FRAME_H),
}

const RIGHT_WINDOW: CSSProperties = {
    position: 'absolute',
    left: pct(912, FRAME_W),
    top: pct(110, FRAME_H),
    width: pct(1433 - 912, FRAME_W),
    height: pct(720 - 110, FRAME_H),
}

const BANNER: CSSProperties = {
    position: 'absolute',
    left: pct(25, FRAME_W),
    top: pct(683, FRAME_H),
    width: pct(1509 - 25, FRAME_W),
    height: pct(990 - 783, FRAME_H),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}

type Props = {
    memberAPhoto: string | null
    memberBPhoto: string | null
    duplaName: string
    memberAAlt?: string
    memberBAlt?: string
    /** className opcional pro pai controlar largura/posição (ex: width: 100%) */
    className?: string
    style?: CSSProperties
}

/** Uma moldura = uma dupla (2 janelas + faixa de nome). Nunca renderiza duas. */
export function DuplaFrame({
    memberAPhoto,
    memberBPhoto,
    duplaName,
    memberAAlt = '',
    memberBAlt = '',
    className,
    style,
}: Props) {
    return (
        <div
            className={className}
            style={{
                position: 'relative',
                width: '100%',
                // trava a proporção real do PNG (1536:1024) — nunca estica/deforma a moldura
                aspectRatio: `${FRAME_W} / ${FRAME_H}`,
                ...style,
            }}
        >
            {/* fotos ficam ATRÁS da moldura, visíveis através das janelas transparentes do PNG.
          img puro (sem PlayerPortrait) — sem fundo/borda/estilo extra do componente. */}
            <div style={{ ...LEFT_WINDOW, overflow: 'hidden' }}>
                {memberAPhoto && (
                    <img
                        src={memberAPhoto}
                        alt={memberAAlt}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                )}
            </div>
            <div style={{ ...RIGHT_WINDOW, overflow: 'hidden' }}>
                {memberBPhoto && (
                    <img
                        src={memberBPhoto}
                        alt={memberBAlt}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                )}
            </div>

            <img
                src={duplaFrameSrc}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '90%',
                    pointerEvents: 'none',
                }}
            />

            <div style={BANNER}>
                <BitmapText text={duplaName.toUpperCase()} size="small" scale={0.13} maxWidth={220} align="center" />
            </div>
        </div>
    )
}