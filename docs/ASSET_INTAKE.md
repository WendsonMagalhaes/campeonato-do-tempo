# Asset intake — runtime SoT is `app/public/assets`

## Policy

1. **Official runtime media** lives in **`app/public/assets/`** (Vite serves `/assets/...` offline; default `publicDir`).
2. Place new images/audio/fonts/sprites/runtime frames **directly** under `app/public/assets/...` with stable names.
3. Root `assets/` is **not** the runtime SoT — only project extras (brand reference, participant uploads staging, optional video notes).
4. Do **not** put SoT media under `Copa_Esperanca_Cursor_Pack/` or `audio_addon/` (archives only).
5. Specs/manifests SoT remains root **`docs/`** (`docs/copa-ui/`, `docs/audio/`).

## Layout (official runtime)

```text
app/public/assets/
  audio/ backgrounds/ brand/ environment/ fonts/ fx/
  reference/ runtime/ screens/ sprites/ ui/
```

## When the user pastes a new asset in chat

1. Save under `app/public/assets/<folder>/<stable-name>.ext`.
2. Update code/manifests only if a path or lock must change.
3. Run `npm run assets:verify` from `app/`.
4. If the agent **cannot** write the binary, tell the user:
   > Drop the file into `app/public/assets/<folder>/` as `<suggested-name>` and notify me.

## Brand — Esperança Distribuidora logo (iter 55, 2026-08-16)

- **Runtime:** `app/public/assets/brand/esperanca_distribuidora_logo.png`
- **URL:** `/assets/brand/esperanca_distribuidora_logo.png`
- **Processing:** solid black background keyed out (near-black → alpha 0); cropped to opaque bbox; green pixel-art wordmark preserved.
- **Usage:** Bracket / Chave — centered under phase labels (`BRACKET.logo` in `bracketGeometry.ts`); no overlapping title text.
- **Reference (non-runtime):** `app/public/assets/brand/esperanca-logo-reference.jpeg` (older JPEG reference).

## Selection cursor (Team Formation) — iter 30 / QA iter 33 / hug iter 43

- **Runtime (current):** CSS `.ce-slot-highlight` outline (P1 blue / P2 red) on `gridSlotBox` — **not** SelectionCursor sprites.
- **Geometry:** per-column `GRID.colXs` / `colWs` in `teamFormationGeometry.ts` (pitch compresses on cols 10–11).
- **Sheet SoT (tooling only):** `app/public/assets/ui/selection_cursor_frame_sheet.png` (1024×768; square moldura).
- **Pre-cropped frames (unused at runtime):** `app/public/assets/runtime/cursors/p1|p2/{idle,move,lock,selected}_01..04.png`.
- **Legacy fit:** square `CURSOR_FIT` kept for unused SelectionCursor — never stretch to rectangular buraco.
- **Rejected:** triangular pointer (`selection_cursor_sheet.png`, `runtime/ui/p*_*.png`) — do not use on Formação das Duplas.
- Manifests: `docs/copa-ui/CURSOR_RUNTIME_MANIFEST.json`, `docs/copa-ui/SELECTION_CURSOR_FRAMES.json`.
- **Grid occupancy:** presentation shuffle via `shuffleFormationOccupants` — does not alter duo pairings.

## Bitmap font — Font Fix v4 TRUE TRANSPARENT (iter 10, 2026-08-15)

- **Origem:** `Copa_Esperanca_Font_Fix_v4_TRUE_TRANSPARENT_2026-08-15/` (fora do repo, pasta de downloads do humano).
- **Runtime instalado:** `app/public/assets/fonts/glyphs/{small,medium,large}/uXXXX.png` — 3 × 115 = 345 PNGs, um por glifo, já transparentes. O spec tem 116 entradas: a 116ª é o espaço, que não tem PNG (`src: null`) e avança por `spaceAdvance`.
- **Spec instalado:** `docs/copa-ui/FONT_METRICS_V4.json` (SoT), `docs/copa-ui/BITMAP_RENDERER.md` (regras), `docs/copa-ui/FONT_V4_KNOWN_DEFECTS.md` (defeitos de arte em aberto).
- **Removido do runtime:** `app/public/assets/fonts/font_label_small.png`, `font_hud_medium.png`, `font_display_large.png`, `font_source_sheet.png`.
- **Specs revogados:** `docs/copa-ui/superseded/FONT_METADATA.json`, `docs/copa-ui/superseded/BITMAP_FONT_GLYPHS.json` (atlas de célula fixa). Ver `docs/copa-ui/superseded/README.md`.
- **Regra:** nunca aplicar crop, inset, chroma-key ou largura monoespaçada. Largura vem de `glyphs[char].files[size].width`.
- **Human gate aberto:** dois defeitos de arte no pacote (acentos superiores apagados; pontuação inflada em `small`/`medium`) — detalhados em `docs/copa-ui/FONT_V4_KNOWN_DEFECTS.md`.
- **2026-08-15 — rollback de tentativa v5:** regeneração automática a partir da folha-fonte corrompeu glifos; **restaurado** o pacote v4 original (`Downloads/Copa_Esperanca_Font_Fix_v4_TRUE_TRANSPARENT_2026-08-15`) em `app/public/assets/fonts/glyphs/` (345 PNGs) + `docs/copa-ui/FONT_METRICS_V4.json`. v5 só via pacote humano limpo.

## Optional archive merge

```bash
npm run assets:install -- --source ../path-to-archive
```

## Hybrid UI reminder

- Team Formation uses structural `screens/team_formation_variant_03.png`.
- Opening / Versus / R3 / Qualified / Champion / Bracket use **canonical layers**.

## Known gaps (female_red frames)

`runtime/fighters/female_red/` has a full frame set under `app/public/assets`, but some pairs are still identical placeholders pending real art:

- `hurt_02.png` currently equals `hurt_01.png`
- `idle_02.png` currently equals `idle_01.png`

Replace with distinct frames when available (pack archive had no better originals at restore time).

## Battle / celebration callout PNGs (iter 57, 2026-08-16)

Human-confirmed mapping — large centered overlays (~750px wide). **Do not** squash into HUD `roundTitle` (540×72), score-panel holes, Round3 title, Versus, or Bracket.

| File | Runtime URL | Size | Usage |
| --- | --- | --- | --- |
| `round_1.png` | `/assets/ui/round_1.png` | 759×292 | Battle intro, synced with announcer ROUND 1 |
| `round_2.png` | `/assets/ui/round_2.png` | 755×282 | Battle intro, ROUND 2 |
| `final_round.png` | `/assets/ui/final_round.png` | 763×376 | Battle intro R3 / deciding — FINAL ROUND |
| `fight.png` | `/assets/ui/fight.png` | 765×369 | After round banner beat + announcer FIGHT |
| `ko.png` | `/assets/ui/ko.png` | 756×365 | Match-finish KO (replaces BitmapText `K.O.`) |
| `winner.png` | `/assets/ui/winner.png` | 734×409 | **Duo Qualified title only** |

**Scales:** Battle callouts ~**0.85** natural (`transform: scale(0.85)` on intrinsic PNG). Duo Qualified `winner.png` ~**0.54** via `object-fit:contain` in `DUO_QUALIFIED.title` (760×220) — hierarchy WINNER → name crest → score with vertical gaps; no extra CSS scale.

**Not mapped:**
- `VENCE A RODADA: NOME` — keep BitmapText as today.
- **Champion** — keep BitmapText `CAMPEÃ`; **dedicated champion title asset pending human production** (do not reuse `winner.png`). Telão **não** mostra prêmio em R$; BG permanece `champion_plaza_trophies_bg` (intro street avaliado — pior encaixe celebratório). **Pódio pendente de asset** (nenhum `*podium*` em `app/public/assets/`).
- PERFECT — BitmapText only (no asset).

Code: `battleCallouts` / `calloutForRound` in `app/src/battle/battle-assets.ts`; overlay slot `BATTLE.calloutOverlay` in `battleGeometry.ts`.

## Crowd Feature v2 — intro + coldroom BG (iter 60, 2026-08-16)

Pack: `Copa_Esperanca_Crowd_Feature_v2_2026-08-16` (downloads). Installed under runtime only — **did not** overwrite `backgrounds/opening_street_bg.png` or `backgrounds/battle_dock_coldroom_bg.png`.

| Pack path | Runtime URL |
| --- | --- |
| `assets/intro/background/opening_street_bg.png` | `/assets/runtime/intro/background/opening_street_bg.png` |
| `assets/intro/crowd/intro_crowd_frame_0{1,2,3}.png` | `/assets/runtime/intro/crowd/intro_crowd_frame_0{1,2,3}.png` |
| `assets/intro/fighters/intro_fighters_frame_01_idle.png` (+ green/red attack) | `/assets/runtime/intro/fighters/...` |
| `assets/coldroom/background_swap/coldroom_bg_anim_f0{1,2,3}.png` | `/assets/runtime/coldroom/background_swap/coldroom_bg_anim_f0{1,2,3}.png` |

**Behavior (superseded by iter 66 cinematic):** Opening was BG → fighters → crowd → PRESS START. Coldroom battle BG swap unchanged.

## Intro Cinematic Pack v2 (iter 66, 2026-08-16)

Pack: `Copa_Esperanca_Intro_Cinematic_Pack_v2_2026-08-16`. Opening replaced with sky→logo pass→street settle→layered crowd→PRESS START. Timeline SoT: `introTimeline.ts` (`KICK_TIMESTAMP_MS` = 17557).

| Pack path | Runtime URL |
| --- | --- |
| `assets/sky/01_intro_sky_far.png` | `/assets/runtime/intro/sky/01_intro_sky_far.png` |
| `assets/sky/02_intro_sky_mid.png` | `/assets/runtime/intro/sky/02_intro_sky_mid.png` |
| `assets/sky/03_intro_sky_logo_2026.png` | `/assets/runtime/intro/sky/03_intro_sky_logo_2026.png` |
| `refs/00_intro_street_base_reference.png` | `/assets/runtime/intro/background/intro_street_base.png` |
| `assets/crowd/10|11_intro_crowd_upper_left_frame_0{1,2}.png` | `/assets/runtime/intro/crowd/layered/10|11_...` |
| `assets/crowd/20|21_intro_crowd_upper_right_frame_0{1,2}.png` | `/assets/runtime/intro/crowd/layered/20|21_...` |
| `assets/crowd/30|31_intro_crowd_foreground_frame_0{1,2}.png` | `/assets/runtime/intro/crowd/layered/30|31_...` |

**Behavior (iter 66):** BGM `introCinematic` aligned to timeline zero; strip far→mid→logo→street; fighters retired.

## Intro cinematic polish (iter 67, 2026-08-16)

**Camera architecture:** `translateY` scroll over a **single tall continuous sky→street strip**. Drop-in: set `INTRO_CINEMATIC_ASSETS.tallStrip` + adjust `INTRO_STRIP.panelCount` / height. Logo = baked into tall strip **or** `logoOverlay` cutout.

**Interim (until tall strip + upper crowd regen):**
- Scroll panels = far sky + street only (`INTRO_SCROLL_PANELS`). Mid/logo skies **not** used as hard-cut camera panels (`logoOverlay` null — pack logo art is another full sky).
- **Street SoT on Opening:** `opening_street_bg.png` (clean). Pack `intro_street_base.png` has baked COPA ESPERANÇA / 16 DUPLAS / PRESS START — do **not** use (caused duplicate PRESS START + title junk).
- Opening UI text: **only** one BitmapText `PRESS START`. No title/subtitle/logo blocks in `OpeningScene`.
- `PRE_DROP_MAX_MS = 4000` — visual drop leads musical kick (`KICK_TIMESTAMP_MS` 17557 kept as audio reference; drums may lag until BGM retimed/seek).
- Fighters restored (`IntroFightLayer` under crowd hole after street settle).
- Foreground crowd keeps 01↔02 loop; **upper L/R frozen on frame_01** pending human regen.

## Intro cinematic tall background & true transparent crowd (iter 69, 2026-08-16)

Origem: `C:\Users\Zeus\Downloads\download manula de imagens\` (arquivos originais transparentes enviados pelo humano, sem chroma-key artificial).

| Arquivo original | Runtime URL | Resolução | Descrição |
| --- | --- | --- | --- |
| `ChatGPT Image 16 de ago. de 2026, 12_44_22.png` | `/assets/runtime/intro/background/intro_street_tall_bg.png` | 1341×1173 | Background vertical contínuo estendido (céu azul + arranha-céus até rua) |
| `ChatGPT Image 16 de ago. de 2026, 12_44_53.png` | `/assets/runtime/intro/crowd/layered/10_intro_crowd_upper_left_frame_01.png` | 2172×724 | Multidão calçada superior esquerda — Frame 01 (true transparent) |
| `ChatGPT Image 16 de ago. de 2026, 12_45_42.png` | `/assets/runtime/intro/crowd/layered/11_intro_crowd_upper_left_frame_02.png` | 2172×724 | Multidão calçada superior esquerda — Frame 02 (true transparent) |
| `ChatGPT Image 16 de ago. de 2026, 12_47_01.png` | `/assets/runtime/intro/crowd/layered/30_intro_crowd_foreground_frame_01.png` | 2172×724 | Multidão de costas foreground corpo inteiro — Frame 01 (true transparent) |
| `ChatGPT Image 16 de ago. de 2026, 12_46_48.png` | `/assets/runtime/intro/crowd/layered/31_intro_crowd_foreground_frame_02.png` | 2172×724 | Multidão de costas foreground corpo inteiro — Frame 02 (true transparent) |

## Intro cinematic upper-right crowd, sky logo & camera world integration (iter 70, 2026-08-16)

Origem: `C:\Users\Zeus\Downloads\download manula de imagens\` (novos assets adicionados pelo humano).

| Arquivo original | Runtime URL | Resolução | Descrição |
| --- | --- | --- | --- |
| `ChatGPT Image 16 de ago. de 2026, 14_39_12 (2).png` | `/assets/runtime/intro/crowd/layered/20_intro_crowd_upper_right_frame_01.png` | 2172×724 | Multidão calçada superior direita — Frame 01 (true transparent) |
| `ChatGPT Image 16 de ago. de 2026, 14_39_12 (3).png` | `/assets/runtime/intro/crowd/layered/21_intro_crowd_upper_right_frame_02.png` | 2172×724 | Multidão calçada superior direita — Frame 02 (true transparent) |
| `ChatGPT Image 16 de ago. de 2026, 14_39_11 (1).png` | `/assets/runtime/intro/sky/03_intro_sky_logo_2026.png` | 2172×724 | Logo "Copa Esperança 2026" para o céu (true transparent overlay) |

**Comportamento & Calibração (iter 70):**
- **Unified World Camera:** Os elementos da rua (lutadores e multidão) e do céu (logo) são posicionados em coordenadas do mundo contínuo (1920×1680). A descida suave da câmera (`translateY`) revela os elementos naturalmente sem transição artificial de opacidade (`no fade-in`) e sem troca de background no final (`no background swap / no pop`).
- **Grounding na Calçada (Upper Crowd):** Posição Y ajustada para `y: 600` (com `w: 530, h: 177`), apoiando os pés dos espectadores firmemente na calçada (atrás da grade à esquerda e ao lado do caminhão à direita), eliminando qualquer flutuação no ar.
- **Enquadramento do Foreground (Pessoas de Costas):** Posição Y ajustada para `y: 775` (com `w: 1920, h: 540`), emoldurando a borda inferior sem cobrir as pernas/joelhos dos lutadores no centro.
- **Normalização de Frames (Sem Jitter/Pop Horizontal):** Frame 02 de `upperLeft` normalizado com pixel-alignment para casar exatamente com a bounding box do Frame 01, eliminando qualquer salto lateral ao alternar os frames da animação. `upperRight` e `foreground` verificados com consistência sub-pixel.
- **Descida de Câmera Suave & Majestosa:** Duração da descida ajustada para 4.5s (início aos 3000ms, chegada à rua aos 7500ms) com curva `easeInOutCubic` contínua, permitindo apreciar o logo no céu e a descida cinematográfica até o ringue.


**Comportamento (iter 69):**
- `INTRO_CINEMATIC_ASSETS.tallStrip` ativado com `/assets/runtime/intro/background/intro_street_tall_bg.png`.
- Panning vertical suave da câmera do céu até a rua via `translateY`.
- Multidão `upperLeft` desfrisada (`freezeFrame: false`, alternando frames 01 e 02 a cada 340ms), posicionada na calçada com escala em perspectiva 3D (`w: 630, h: 210` a `y: 390`).
- Multidão `upperRight` permanece congelada no frame 01 (`freezeFrame: true`) aguardando novos assets do humano.
- Multidão `foreground` animada com frames de corpo inteiro/pernas (`y: 670`).
- Camada de lutadores (`IntroFightLayer`) no ringue e único `PRESS START` em BitmapText no centro.

## Incident note (resolved — iter 28)

Windows EPERM locks on `female_red/{hurt_02,idle_02,lying}.png` were cleared by stopping project Vite processes, then promoting `app/media/assets` → `app/public/assets`. Vite `publicDir` is default `public` again. Temporary `app/media/` workaround was removed after promote.
