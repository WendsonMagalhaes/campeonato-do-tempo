# BITMAP RENDERER — DECISÃO V4 (TRUE TRANSPARENT)

Fonte única de verdade da fonte bitmap: **`docs/copa-ui/FONT_METRICS_V4.json`**
(pacote *Copa Esperança Font Fix v4 — TRUE TRANSPARENT*).

Renderer único do projeto: **`app/src/copa-ui/components/BitmapText.tsx`**.

Não existe nenhum outro caminho de renderização de texto bitmap. `BitmapTextCanvas`
(atlas + `drawImage` + key-out de placa) e o renderer CSS com spans foram removidos.

## Estratégia

- Um PNG **já transparente** por caractere. Sem atlas, sem spritesheet.
- Sem `background-position`, sem `row * cellWidth`, sem `col * cellHeight`.
- Sem crop em runtime, sem inset, sem chroma-key, sem remoção de placa.
- Sem largura monoespaçada: cada glifo avança pela sua largura real.
- `image-rendering: pixelated` em cada glifo. Nenhum filtro que degrade pixel art.

## O que vem do spec (não inventar)

| Dado | Origem no spec |
|---|---|
| caminho do PNG | `glyphs[char].files[size].src` |
| largura real | `glyphs[char].files[size].width` |
| altura real | `glyphs[char].files[size].height` |
| avanço | `glyphs[char].files[size].advance` |
| espaço | `sizes[size].spaceAdvance` |
| altura de linha | `sizes[size].lineHeight` |
| tracking padrão | `sizes[size].defaultTracking` |
| aliases | `aliases` (travessões, aspas curvas, `…`, NBSP) |
| fallback | `rendering.defaultFallback` (`?`) |

## Único valor derivado: offset vertical (`top`)

O spec não traz baseline explícita. A regra derivada, aplicada pelo gerador e
coberta por teste:

- Se `height === lineHeight` (tamanhos `small` e `medium`, cujos PNGs foram
  normalizados para preencher a caixa de linha) → `top = 0`.
- Caso contrário (tamanho `large`, que preserva o recorte natural) →
  `top = clamp(source.bbox[1] - source.detectedRowTop, 0, lineHeight - height)`,
  isto é, o deslocamento que o glifo tem dentro da sua linha na folha original.

Essa regra foi validada contra o preview oficial do pacote
(`previews/COPA_ESPERANCA_large.png`): posição horizontal bate exatamente e a
vertical bate com diferença ≤ 1 px.

## Pipeline

```
docs/copa-ui/FONT_METRICS_V4.json      (SoT do spec)
  └─ npm run font:generate             (app/scripts/generate-font-v4.mjs)
       └─ app/src/copa-ui/fonts/font-v4.generated.ts
            └─ app/src/copa-ui/fonts/bitmapTextLayout.ts   (layout em pixels de glifo)
                 └─ app/src/copa-ui/components/BitmapText.tsx
```

`npm run font:check` falha se o módulo gerado divergir do spec.
Mídia de runtime: `app/public/assets/fonts/glyphs/{small,medium,large}/uXXXX.png`.

## API

```tsx
<BitmapText
  text="COPA ESPERANÇA"
  size="small" | "medium" | "large"   // default "medium"
  tracking={2}                        // default: defaultTracking do tamanho
  align="left" | "center" | "right"   // default "left"
  multiline                           // default true; false achata \n em espaço
  scale={0.5}                         // multiplica o lineHeight do spec
  maxWidth={480}                      // orçamento em px CSS; só reduz
  className ariaLabel style
/>
```

`scale` multiplica o `lineHeight` do spec (small 64 / medium 96 / large 128).
Os atlases aposentados usavam célula de saída igual a metade disso, por isso a
migração dividiu por 2 todos os `scale` das telas e dos `*_HUD`.

## Proibido

- Reintroduzir atlas, `background-position` ou fatiamento por célula.
- Aplicar crop, inset, `ADVANCE_RATIO` ou key-out de cor.
- Assumir largura fixa por caractere.
- Editar `font-v4.generated.ts` à mão.
- Carregar `font_display_large.png`, `font_hud_medium.png`, `font_label_small.png`
  ou `font_source_sheet.png` em runtime (removidos de `app/public/assets/fonts/`).

## Defeitos conhecidos do pacote v4

Ver `docs/copa-ui/FONT_V4_KNOWN_DEFECTS.md` — dois problemas de **arte** (não de
renderer) que aguardam decisão humana.
