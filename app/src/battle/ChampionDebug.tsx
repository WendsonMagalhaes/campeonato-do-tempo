import { ChampionScene } from './ChampionScene.tsx'
import '../copa-ui/runtime/runtime.css'
import '../ui/canonical/canonical-ui.css'

/**
 * Dev-only harness for Champion celebration (crowd + confetti).
 * Open `/debug/champion` (no domain state required).
 */
export function ChampionDebug() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020706' }}>
      <ChampionScene
        teamName="Leonardo & Livia"
        members={[
          { id: 'leonardo', name: 'Leonardo', photoUrl: '/assets/participants/leonardo/body_master.png', fighterVariant: 'male' },
          { id: 'livia', name: 'Livia', photoUrl: '/assets/participants/livia/body_master.png', fighterVariant: 'female' },
        ]}
      />
    </div>
  )
}
