import { DuoQualifiedScene } from './DuoQualifiedScene.tsx'
import '../copa-ui/runtime/runtime.css'
import '../ui/canonical/canonical-ui.css'

/**
 * Dev-only harness for Duo Qualified celebration (crowd + confetti).
 * Open `/debug/duo-qualified` (no domain state required).
 */
export function DuoQualifiedDebug() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020706' }}>
      <DuoQualifiedScene
        teamName="Caio & Samara"
        scoreA={2}
        scoreB={1}
        side="red"
        members={[
          { id: 'caio', name: 'Caio', photoUrl: '/assets/participants/caio/body_master.png', fighterVariant: 'male' },
          { id: 'samara', name: 'Samara', photoUrl: '/assets/participants/samara/body_master.png', fighterVariant: 'female' },
        ]}
      />
    </div>
  )
}
