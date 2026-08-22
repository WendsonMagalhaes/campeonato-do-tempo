# APOSENTADOS — NÃO USAR

Specs de fonte bitmap **revogados** em 2026-08-15 pela adoção do pacote
*Copa Esperança Font Fix v4 — TRUE TRANSPARENT*.

| arquivo | por que morreu |
|---|---|
| `FONT_METADATA.json` | descrevia atlas 13×10 com célula fixa e `recommendedLetterSpacingEm`; o v4 não tem atlas nem largura fixa |
| `BITMAP_FONT_GLYPHS.json` | descrevia `drawImage` com retângulos de origem por célula e `displayCell`; o v4 usa um PNG transparente por glifo |

Autoridade atual:

- Métricas: `docs/copa-ui/FONT_METRICS_V4.json`
- Regras de render: `docs/copa-ui/BITMAP_RENDERER.md`
- Defeitos de arte em aberto: `docs/copa-ui/FONT_V4_KNOWN_DEFECTS.md`

Os atlases citados aqui (`font_label_small.png`, `font_hud_medium.png`,
`font_display_large.png`, `font_source_sheet.png`) foram **removidos** de
`app/public/assets/fonts/`. Qualquer referência a eles em runtime é bug.

Mantidos apenas como registro histórico. Não são fonte de verdade.
