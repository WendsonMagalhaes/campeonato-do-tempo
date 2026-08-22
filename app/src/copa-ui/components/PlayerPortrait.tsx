import { useState } from 'react';

export function PlayerPortrait({
  src,
  alt,
  focusY = 28,
  selected = false,
  className,
}: {
  src?: string | null;
  alt: string;
  focusY?: number;
  selected?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const hasPhoto = Boolean(src) && !failed;

  return (
    <div className={`ce-fixed-portrait ${selected ? 'is-selected' : ''} ${className ?? ''}`}>
      <div className="ce-fixed-portrait__content">
        {hasPhoto ? (
          <img
            src={src!}
            alt={alt}
            onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${focusY}%`, display: 'block' }}
          />
        ) : (
          <div className="ce-fixed-portrait__fallback" aria-label={`${alt} sem foto`}>
            <span>?</span>
          </div>
        )}
      </div>
      <img className="ce-fixed-portrait__frame" src="/assets/ui/portrait_frame_base.png" alt="" aria-hidden="true" />
    </div>
  );
}
