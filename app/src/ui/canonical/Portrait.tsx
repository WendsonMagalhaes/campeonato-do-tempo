import { useState } from 'react'
import type { PortraitState } from './canonical-assets'

type Props = {
  photoUrl?: string | null
  alt: string
  state?: PortraitState
  className?: string
}

export function Portrait({ photoUrl, alt, state = 'neutral', className }: Props) {
  const [failed, setFailed] = useState(false)
  const hasPhoto = Boolean(photoUrl) && !failed

  return (
    <div className={`ce-portrait ${className ?? ''}`} data-state={state}>
      {hasPhoto ? (
        <img
          className="ce-portrait__photo ce-pixel"
          src={photoUrl!}
          alt={alt}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="ce-portrait__fallback" aria-label={`${alt} sem foto`}>
          <span>?</span>
        </div>
      )}
      <img
        className="ce-portrait__frame ce-pixel"
        src="/assets/ui/portrait_frame_base.png"
        alt=""
        aria-hidden="true"
      />
    </div>
  )
}
