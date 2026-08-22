import { TournamentProvider } from './application/store.tsx'
import { OperatorApp } from './ui/operator/OperatorApp.tsx'
import { ScoreboardApp } from './ui/scoreboard/ScoreboardApp.tsx'
import { BattleSpriteDebug } from './battle/BattleSpriteDebug.tsx'
import { BattleHudDebug } from './battle/BattleHudDebug.tsx'
import { BitmapTextDebug } from './battle/BitmapTextDebug.tsx'
import { DuoQualifiedDebug } from './battle/DuoQualifiedDebug.tsx'
import { ChampionDebug } from './battle/ChampionDebug.tsx'
import { VersusDebug } from './copa-ui/runtime/VersusDebug.tsx'
import { Round3Debug } from './copa-ui/runtime/Round3Debug.tsx'
import '@fontsource/press-start-2p'
import '@fontsource/vt323'
import './ui/theme/arcade.css'
import './ui/canonical/canonical-ui.css'

export default function App() {
  const path = window.location.pathname
  if (path.startsWith('/debug/battle-sprites')) return <BattleSpriteDebug />
  if (path.startsWith('/debug/battle-hud')) return <BattleHudDebug />
  if (path.startsWith('/debug/bitmap-text')) return <BitmapTextDebug />
  if (path.startsWith('/debug/duo-qualified')) return <DuoQualifiedDebug />
  if (path.startsWith('/debug/champion')) return <ChampionDebug />
  if (path.startsWith('/debug/versus')) return <VersusDebug />
  if (path.startsWith('/debug/round3')) return <Round3Debug />
  if (path.startsWith('/telao')) return <ScoreboardApp />
  return (
    <TournamentProvider>
      <OperatorApp />
    </TournamentProvider>
  )
}
