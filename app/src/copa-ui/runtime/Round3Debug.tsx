import { Round3SelectionScene } from './Round3SelectionScene.tsx'
import './runtime.css'
import '../../ui/canonical/canonical-ui.css'

/**
 * Dev-only harness for Round 3 representative selection
 * (large portraits, no score banner / duo labels, draft neon optional).
 * Open `/debug/round3` (no domain state required).
 * Query: `?draft=a1,b2` to preview P1/P2 neon highlights.
 */
export function Round3Debug() {
  const params = new URLSearchParams(window.location.search)
  const draft = (params.get('draft') ?? '').split(',').map((s) => s.trim())
  const draftAId = draft[0] || null
  const draftBId = draft[1] || null

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020706' }}>
      <Round3SelectionScene
        membersA={[
          { id: 'a1', name: 'Livia', photoUrl: '/assets/participants/livia/face_master_360.png' },
          { id: 'a2', name: 'Samara', photoUrl: '/assets/participants/samara/face_master_360.png' },
        ]}
        membersB={[
          { id: 'b1', name: 'Ana', photoUrl: '/assets/participants/ana/face_master_360.png' },
          { id: 'b2', name: 'Daniel', photoUrl: '/assets/participants/daniel/face_master_360.png' },
        ]}
        draftAId={draftAId}
        draftBId={draftBId}
      />
    </div>
  )
}
