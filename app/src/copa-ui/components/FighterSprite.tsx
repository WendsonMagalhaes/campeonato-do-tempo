import { useEffect, useState } from 'react';

type Color = 'blue' | 'red';
type Variant = 'male' | 'female';
export type FighterState = 'idle' | 'walk' | 'attack' | 'hurt' | 'fall' | 'lying' | 'victory';

const TABLE: Record<string, Partial<Record<FighterState, { frames: string[]; fps: number; loop: boolean }>>> = {
  male_blue: {
    idle:{frames:['idle_01','idle_02'],fps:3,loop:true}, walk:{frames:['walk_01','walk_02'],fps:5,loop:true},
    attack:{frames:['attack'],fps:1,loop:false}, hurt:{frames:['hurt'],fps:1,loop:false},
    fall:{frames:['hurt','lying'],fps:5,loop:false}, lying:{frames:['lying'],fps:1,loop:false}, victory:{frames:['victory'],fps:1,loop:false},
  },
  male_red: {
    idle:{frames:['idle_01','idle_02'],fps:3,loop:true}, walk:{frames:['walk_01','walk_02'],fps:5,loop:true},
    attack:{frames:['attack'],fps:1,loop:false}, hurt:{frames:['hurt'],fps:1,loop:false},
    fall:{frames:['hurt','lying'],fps:5,loop:false}, lying:{frames:['lying'],fps:1,loop:false}, victory:{frames:['victory'],fps:1,loop:false},
  },
  female_blue: {
    idle:{frames:['idle_01','idle_02'],fps:3,loop:true}, walk:{frames:['walk_01','walk_02'],fps:5,loop:true},
    attack:{frames:['attack'],fps:1,loop:false}, hurt:{frames:['hurt'],fps:1,loop:false},
    fall:{frames:['hurt','lying'],fps:5,loop:false}, lying:{frames:['lying'],fps:1,loop:false}, victory:{frames:['victory'],fps:1,loop:false},
  },
  female_red: {
    idle:{frames:['idle_01','idle_02'],fps:3,loop:true}, walk:{frames:['walk_01','walk_02','walk_03','walk_04','walk_05'],fps:7,loop:true},
    attack:{frames:['attack'],fps:1,loop:false}, hurt:{frames:['hurt_01','hurt_02'],fps:6,loop:false},
    fall:{frames:['hurt_02','lying'],fps:5,loop:false}, lying:{frames:['lying'],fps:1,loop:false}, victory:{frames:['victory'],fps:1,loop:false},
  },
};

export function FighterSprite({ color, variant, state, className }: { color: Color; variant: Variant; state: FighterState; className?: string }) {
  const key = `${variant}_${color}`;
  const animation = TABLE[key][state]!;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (animation.frames.length <= 1) return;
    const ms = 1000 / animation.fps;
    const id = window.setInterval(() => {
      setFrame(v => {
        const next = v + 1;
        if (next < animation.frames.length) return next;
        return animation.loop ? 0 : animation.frames.length - 1;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [key, state]);

  const file = animation.frames[Math.min(frame, animation.frames.length - 1)];
  const src = `/assets/runtime/fighters/${key}/${file}.png`;

  return <img src={src} alt="" aria-hidden="true" className={className} draggable={false}
    style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'50% 100%', imageRendering:'pixelated', display:'block' }} />;
}
