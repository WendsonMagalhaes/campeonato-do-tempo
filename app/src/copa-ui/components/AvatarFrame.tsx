import { useState } from 'react'
import { BitmapText } from './BitmapText.tsx'

const FRAME_ON = '/assets/participants/avatar-frame.png'
const FRAME_OFF = '/assets/participants/avatar-frame-off.png'
const FRAME_SELECT = '/assets/participants/avatar-frame-select.png'

export type AvatarAccent = 'p1' | 'p2' | null

export function AvatarFrame({
    photoSrc,
    name,
    active = false,
    used = false,
    selected = false,
    accent = null,
    nameScale = 0.24,
}: {
    photoSrc?: string | null
    name: string
    /** Highlighted / currently the draw target (keeps the select frame + adds glow). */
    active?: boolean
    /** Shows the "off" (grayed) frame -- e.g. already paired. */
    used?: boolean
    /** Shows the "select" frame -- e.g. currently under the cursor / selectable. */
    selected?: boolean
    /** Cursor color when active: p1 = blue, p2 = red. */
    accent?: AvatarAccent
    /** Scale of the bitmap name text below the frame. */
    nameScale?: number
}) {
    const [failed, setFailed] = useState(false)
    const hasPhoto = Boolean(photoSrc) && !failed
    const frameSrc = used ? FRAME_OFF : (selected || active) ? FRAME_SELECT : FRAME_ON

    const classes = [
        'ce-avatar-frame',
        active ? 'is-active' : '',
        used ? 'is-used' : '',
        selected ? 'is-selected' : '',
        accent ? `accent-${accent}` : '',
    ].filter(Boolean).join(' ')

    return (
        <div className={classes}>
            <div className="ce-avatar-frame__photo">
                {hasPhoto ? (
                    <img
                        src={photoSrc!}
                        alt={name}
                        onError={() => setFailed(true)}
                        draggable={false}
                        style={used ? { filter: 'grayscale(1)' } : undefined}
                    />
                ) : (
                    <div className="ce-avatar-frame__fallback" aria-label={`${name} sem foto`}>
                        ?
                    </div>
                )}
            </div>

            <img
                src={frameSrc}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="ce-avatar-frame__frame"
            />

            <div className="ce-avatar-frame__name">
                <BitmapText text={name.toUpperCase()} size="small" align="center" scale={nameScale} maxWidth={220} />
            </div>
        </div>
    )
}