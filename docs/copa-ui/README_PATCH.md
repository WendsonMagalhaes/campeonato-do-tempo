# UI RUNTIME PATCH v3 — HANDOFF

## Objetivo

Remover do agente qualquer autonomia de composição que não seja necessária.

Este patch é complementar ao visual pack v2 e ao Audio Add-on v1.

## Primeiro: corrigir estrutura de assets

Leia `docs/ASSET_INSTALLATION.md`.

A aplicação deve servir `/assets/...` a partir do seu public/static root.
Não importar de dentro da pasta aninhada do pacote.

## Ordem de leitura

1. `docs/DO_NOT_INFER_LAYOUT.md`
2. `docs/ASSET_INSTALLATION.md`
3. `docs/EXACT_SCREEN_GEOMETRY.json`
4. `docs/BITMAP_RENDERER.md`
5. `docs/SPRITE_RUNTIME.md`
6. `docs/FIGHTER_RUNTIME_MANIFEST.json`
7. `docs/CURSOR_RUNTIME_MANIFEST.json`
8. `docs/FX_RUNTIME_MANIFEST.json`
9. `src/copa-ui/runtime/TeamFormationScene.tsx`

## Prioridade de migração

1. Asset paths.
2. FixedCanvas 1920×1080.
3. BitmapTextCanvas.
4. PlayerPortrait.
5. TeamFormationScene.
6. FighterSprite.
7. Demais telas usando EXACT_SCREEN_GEOMETRY.

## Team formation

A tela anterior deve ser substituída estruturalmente, não ajustada margem por margem.

O componente de referência é `TeamFormationScene.tsx`.

O BG dedicado ainda pode ser criado posteriormente em
`/assets/backgrounds/team_formation_bg.png`.

Enquanto ele não existe, o runtime usa `opening_street_bg.png` escurecido
como fallback intencional. Não usar fundo preto puro.

## Aceitação

Falha se:
- texto bitmap estiver cortado;
- logo da empresa aparecer como fallback de foto;
- grid não for 3×11;
- `?` não estiver em row 2 / col 6;
- selected portraits tiverem proporções diferentes;
- VS sair da coordenada fixa;
- qualquer sprite sheet for recortado em runtime;
- assets continuarem sendo importados da pasta aninhada do pack.
