import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

const DESIGN_W = 1920;
const DESIGN_H = 1080;

export function FixedCanvas({ children, className }: { children: ReactNode; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ scale: 1, left: 0, top: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => {
      const r = host.getBoundingClientRect();
      const scale = Math.min(r.width / DESIGN_W, r.height / DESIGN_H);
      setFrame({
        scale,
        left: Math.floor((r.width - DESIGN_W * scale) / 2),
        top: Math.floor((r.height - DESIGN_H * scale) / 2),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const stageStyle: CSSProperties = {
    width: DESIGN_W,
    height: DESIGN_H,
    position: 'absolute',
    left: frame.left,
    top: frame.top,
    transform: `scale(${frame.scale})`,
    transformOrigin: 'top left',
    overflow: 'hidden',
  };

  return (
    <div ref={hostRef} className={className ?? ''} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#020706' }}>
      <div style={stageStyle}>{children}</div>
    </div>
  );
}
