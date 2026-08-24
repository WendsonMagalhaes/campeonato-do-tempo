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
    /** Highlighted / currently the draw target (adds glow + accent color only -- does not change the frame image). */
    active?: boolean
    /** Shows the "off" (grayed) frame -- e.g. already paired. */
    used?: boolean
    /** Shows the "select" (thin) frame -- e.g. currently under the cursor / selectable. */
    selected?: boolean
    /** Cursor color when active: p1 = blue, p2 = red. */
    accent?: AvatarAccent
    /** Scale of the bitmap name text below the frame. */
    nameScale?: number
}) {
    const [failed, setFailed] = useState(false)
    const hasPhoto = Boolean(photoSrc) && !failed
    // `active` only drives the glow/accent (see `is-active` class below) --
    // it no longer swaps the frame image. Only `selected` shows the thin
    // "select" frame. This keeps the grid on the same frame throughout the
    // draw (spinning + locked), while callers that still want the select
    // frame (e.g. the side spotlight panels) opt in via `selected`.
    const frameSrc = used ? FRAME_OFF : selected ? FRAME_SELECT : FRAME_ON

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