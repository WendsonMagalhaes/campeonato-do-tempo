import { VersusScene } from './VersusScene.tsx'
import './runtime.css'
import '../../ui/canonical/canonical-ui.css'

/**
 * Dev-only harness for Versus intro (360×360 portraits, medium@0.5 names, entrance motion).
 * Open `/debug/versus` (no domain state required).
 */
export function VersusDebug() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020706' }}>
      <VersusScene
        phaseLabel="OITAVAS"
        teamAName="Icaro & Joao"
        teamBName="Iris & Jonas"
        membersA={[
          { id: 'a1', name: 'Icaro', photoUrl: '/assets/participants/adriel/face_master_360.png' },
          { id: 'a2', name: 'Joao', photoUrl: '/assets/participants/alexandre/face_master_360.png' },
        ]}
        membersB={[
          { id: 'b1', name: 'Iris', photoUrl: '/assets/participants/ana/face_master_360.png' },
          { id: 'b2', name: 'Jonas', photoUrl: '/assets/participants/caio/face_master_360.png' },
        ]}
        targetLabel={null}
      />
    </div>
  )
}
