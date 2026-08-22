import { BitmapText } from '../copa-ui/components/BitmapText.tsx'
import '../ui/canonical/canonical-ui.css'

/**
 * Isolated bitmap font surface for Playwright lettering checks.
 * Open `/debug/bitmap-text`.
 *
 * Mirrors the smoke test of docs/copa-ui/ACCEPTANCE_TESTS_FONT.md.
 */
export function BitmapTextDebug() {
  return (
    <div
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: 48,
        background: '#061018',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <div data-testid="bitmap-title-large">
        <BitmapText text="COPA ESPERANÇA" size="large" align="center" scale={0.5} />
      </div>
      <div data-testid="bitmap-title-medium">
        <BitmapText text="PRESS START" size="medium" align="center" scale={0.5} />
      </div>
      <div data-testid="bitmap-title-accents">
        <BitmapText text="ÁÀÂÃÉÊÍÓÔÕÚÇ" size="large" align="center" scale={0.42} />
      </div>
      <div data-testid="bitmap-lowercase-accents">
        <BitmapText text="áàâãéêíóôõúç" size="medium" align="center" scale={0.42} />
      </div>
      <div data-testid="bitmap-digits">
        <BitmapText text="0123456789" size="medium" align="center" scale={0.42} />
      </div>
      <div data-testid="bitmap-money">
        <BitmapText text="00:03:50 - R$ 500,00" size="large" align="center" scale={0.42} />
      </div>
      <div data-testid="bitmap-width-proof">
        <BitmapText text="IWI MIM" size="medium" align="center" scale={0.42} />
      </div>
      <div data-testid="bitmap-multiline">
        <BitmapText text={'DUPLA FORMADA\nJOÃO & LÍVIA'} size="small" align="center" scale={0.5} />
      </div>
      <div data-testid="bitmap-align-right" style={{ width: 640 }}>
        <BitmapText text={'ALINHA\nDIREITA'} size="small" align="right" scale={0.5} />
      </div>
    </div>
  )
}
