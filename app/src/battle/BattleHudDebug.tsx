import { useMemo, useState, useEffect } from 'react'
import { BattleScene } from './BattleScene.tsx'
import type { ScoreboardProjection } from '../domain/projections.ts'

type VersusView = NonNullable<ScoreboardProjection['versus']>

/**
 * Dev-only harness for Battle HUD layout (names beside portraits, score holes, race time).
 * Open `/debug/battle-hud` (no domain state required).
 * Query:
 *   `?reveal=1` — assigned times + round-win punch (corner times QA)
 *   `?ko=1` — match-finish KO timeline
 *   `?round=1|2|3` — which intro callout (default 1; ignored when reveal/ko)
 */
export function BattleHudDebug() {
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const reveal = params.has('reveal')
  const ko = params.has('ko')
  const roundParam = Number(params.get('round') ?? '1')
  const roundNumber = roundParam === 2 || roundParam === 3 ? roundParam : 1

  // Stable score bump so forceRoundWin/forceMatchFinish resultKey is unique per page load.
  const [punchNonce, setPunchNonce] = useState(0)
  useEffect(() => {
    if (reveal || ko) setPunchNonce(Date.now())
  }, [reveal, ko])

  const versus: VersusView = useMemo(
    () => ({
      stage: 'oitavas',
      teamAName: 'Icaro & Joao',
      teamBName: 'Iris & Jonas',
      membersA: [
        { id: 'a1', name: 'Icaro', photoAssetId: null, fighterVariant: 'male', avatarUrl: '/assets/participants/adriel/face_master_360.png' },
        { id: 'a2', name: 'Joao', photoAssetId: null, fighterVariant: 'male', avatarUrl: '/assets/participants/alexandre/face_master_360.png' },
      ],
      membersB: [
        { id: 'b1', name: 'Iris', photoAssetId: null, fighterVariant: 'female', avatarUrl: '/assets/participants/ana/face_master_360.png' },
        { id: 'b2', name: 'Jonas', photoAssetId: null, fighterVariant: 'male', avatarUrl: '/assets/participants/caio/face_master_360.png' },
      ],
      activeAId: 'a1',
      activeBId: 'b1',
      scoreA: ko ? 2 : 1,
      scoreB: punchNonce > 0 ? 0 : 0,
      roundNumber,
      targetLabel: '00:01:51',
      prizeA: 'R$ 100,00',
      prizeB: 'R$ 100,00',
      timesHidden: !(reveal || ko),
      timeA: reveal || ko ? '00:01:48' : null,
      timeB: reveal || ko ? '00:01:56' : null,
      diffA: reveal || ko ? '00:00:03' : null,
      diffB: reveal || ko ? '00:00:05' : null,
      roundWinner: reveal || ko ? 'Icaro & Joao' : null,
      roundWinnerSide: reveal || ko ? 'left' : null,
      matchPoint: ko,
      finalScoreLabel: ko ? '2-0' : null,
      matchWinnerSide: ko ? 'left' : null,
      tie: false,
    }),
    [reveal, ko, punchNonce, roundNumber],
  )

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020706' }}>
      <BattleScene
        versus={versus}
        screen={roundNumber === 3 ? 'round3' : 'round'}
        getPhoto={() => null}
        forceRoundWin={reveal && !ko && punchNonce > 0}
        forceMatchFinish={ko && punchNonce > 0}
      />
    </div>
  )
}
