# PIPELINE LOCK — Copa Esperança Fighters

Este diretório é uma semente para o Cursor implementar uma ferramenta isolada de geração de fighters.

## Escopo
- 32 slots no roster.
- 30 fontes já presentes.
- Wesley: package **LOCKED** 2026-08-20 (QA humana aprovou).
- Lailson: package **LOCKED** 2026-08-20 (QA humana aprovou).
- 8 poses canônicas já incluídas em `templates/`.
- Fighters devem preservar a roupa de cada participante em todos os frames.

## Estratégia
1. `fighter_master`: gerar somente `idle_01` para cada participante READY.
2. Gerar contact sheet dos masters.
3. Usuário aprova/rejeita masters no status.
4. Somente masters aprovados liberam `idle_02`, `walk_01`, `walk_02`, `attack`, `hurt`, `victory`, `lying`.
5. Uma chamada de geração = uma pessoa + um arquivo. Nunca fazer batch visual, collage ou sprite sheet.

## Integração com o jogo
NÃO implementar integração do runtime nesta fase. A ferramenta apenas gera assets em `assets/participants/<id>/fighter/` e mantém status/log/review.

## Pacotes LOCKED (fechados)
Participantes em `LOCKED_PARTICIPANTS` no `orchestrator.ts` não regeneram master/frames (nem com `--force`) até remoção explícita do Set no código:
- `dinarte` (pose reference canônico)
- `adriel`
- `david`
- `fatinha` (package closed 2026-08-20 — master + 8 frames aprovados)
- `livia` (package closed 2026-08-20 — master + 8 frames aprovados)
- `monalisa` (package closed 2026-08-20 — master + 8 frames aprovados)
- `samara` (package closed 2026-08-20 — master + 8 frames aprovados)
- `joao` (package closed 2026-08-21 — master + 8 frames aprovados; QA humana "pode fechar joão"; terno formal + gravata magenta)
- `neto` (package closed 2026-08-20 — master + 8 frames aprovados)
- `rhussiana` (package closed 2026-08-20 — master + 8 frames aprovados; vestido babado + bare hands; attack scale-lock idle_01)
- `ricardo` (package closed 2026-08-20 — master + 8 frames aprovados; camiseta azul UA + braços lisos)
- `manasses` (package closed 2026-08-20 — master + 8 frames aprovados; polo navy + faixas verdes + braços lisos)
- `radja` (package closed 2026-08-21 — master + 8 frames aprovados; QA humana "pode fechar radja novamente"; casaco draped + wraps brancos + cabelo deep black)
- `jailson` (package closed 2026-08-20 — master + 8 frames aprovados; blazer navy + jeans dark denim; victory pants lock idle_01)
- `leandro` (package closed 2026-08-21 — master + 8 frames aprovados; tee preta + cargo + braços lisos; QA humana "pode fechar o leandro")
- `wendson` (package closed 2026-08-20 — master + 8 frames aprovados; cap + óculos + hoodie + cargo)
- `wesley` (package closed 2026-08-20 — master + 8 frames aprovados; polo lime collar + watch)
- `lailson` (package closed 2026-08-20 — master + 8 frames aprovados; NY cap cream + tee cream)
- `lailson2` (package closed 2026-08-21 — master + 8 frames aprovados; QA humana "pode fechar ele")
- `joemerson` (package closed 2026-08-20 — master + 8 frames aprovados; Adidas tee + bermuda distressed + watch)
- `tiago` (package closed 2026-08-20 — master + 8 frames aprovados; DIESEL tee + glasses + watch L)
- `leonardo` (package closed 2026-08-20 — master + 8 frames aprovados; polo heather-gray + jeans; victory Dinarte fist-up)
- `erikson` (package closed 2026-08-20 — master + 8 frames aprovados; Classic Cars tee + watch LEFT; QA humana "ok pode fechar")
- `ryan` (package closed 2026-08-20 — master + 8 frames aprovados; polo lime + logo Esperança + mochila; QA humana "ryan pode fechar")
- `alexandre` (package closed 2026-08-20 — master + 8 frames aprovados; cap + óculos branco + shorts pretos; QA humana "pode fechar alexandre")
- `ana` (package closed 2026-08-20 — master + 8 frames aprovados; vestido verde one-shoulder + óculos rosa + bun; QA humana "pode fechar a ana")
- `fernando` (package closed 2026-08-20 — master + 8 frames aprovados; polo lima + joggers; QA humana "pode fechar o fernando")
- `marconi` (package closed 2026-08-20 — master + 8 frames aprovados; tee preta + jeans charcoal + watch LEFT; QA humana "pode fechar o fernando e o marconi")
- `caio` (package closed 2026-08-21 — master + 8 frames aprovados; tee preta + corrente + stud; QA humana "pode fechar")
- `daniel` (package closed 2026-08-21 — master + 8 frames aprovados; polo branco + tattoo RIGHT + watch LEFT; QA humana "pode fechar"; NÃO confundir com `david`)
- `evellyn` (package closed 2026-08-21 — master + 8 frames aprovados; FEMALE tee marinho + cabelo longo; QA humana "pode fechar")
- `fabio` (package closed 2026-08-21 — master + 8 frames aprovados; blazer navy + camisa branca aberta + tênis branco + watch L; QA humana "pode fechar")
- `izaias` (package closed 2026-08-21 — master + 8 frames aprovados; jaqueta charcoal-navy + 1 cordão + tênis pretos + mãos nuas; QA humana "pode fechar Izaias")
- `hiago` (package closed 2026-08-21 — master + 8 frames aprovados; oversized tee TOP + cargo oliva + óculos + watch L; reserva; QA humana aprovou)
- `kelvin` (package closed 2026-08-21 — master + 8 frames aprovados; teen proportions + óculos redondos + AirPods + watch L; reserva; QA humana "pode fechar o kelvin também")

Para destravar: editar `src/orchestrator.ts` e remover o id de `LOCKED_PARTICIPANTS`.

## QA cirúrgico Lívia
- Env `LIVIA_SURGICAL_QA=true` edita PNG existente (backup `.pre_surgical_backup.png`).
- Env `LIVIA_HAIR_ONLY=true` — mais estreito: IMAGE1=frame atual (pose locked), IMAGE2=idle_01 (cabelo only). Backup `.pre_hair_only_backup.png`. Sem scale/pose.
- Políticas: sandálias **vermelhas** (idle_01), clutch prata sempre, gaze câmera só em `victory`.
- Escala/cabelo: `walk_01` / `hurt` / `victory` / `attack` / `lying` usam **idle_01** como referência de altura/footprint e volume/cor do cabelo (ombre + honey highlights).
- Backup completo pré-correção: `output/backups/livia_pre_scale_hair_<timestamp>/`.
- Manter `GENERATION_ENABLED=false` ao final.

## QA cirúrgico Radja
- Política wraps: **ALL WITH** white hand wraps (canônico = `idle_01` / master).
- Política cabelo: **DEEP BLACK** com highlights cool charcoal (FORBIDDEN warm brown) — lock = `idle_01`.
- Política casaco: **FALLING OFF / draped on shoulders** (casaco caindo nos ombros) — canônico = `idle_01`. FORBIDDEN jacket pulled up / fully on.
- Env `RADJA_WRAP_LOCK=true` — IMAGE1=frame atual (pose locked), IMAGE2=idle_01 (wraps only). Backup `.pre_wrap_lock_backup.png`.
- Env `RADJA_HAIR_ONLY=true` — IMAGE1=frame atual (pose locked), IMAGE2=idle_01 (hair only). Backup `.pre_hair_only_backup.png`.
- Env `RADJA_JACKET_LOCK=true` — IMAGE1=frame atual (pose locked), IMAGE2=idle_01 (jacket drape only). Backup `.pre_jacket_lock_backup.png`.
- Manter `GENERATION_ENABLED=false` ao final.
- **LOCKED** (package closed 2026-08-21 — QA humana aprovou "pode fechar radja novamente") — regenerar exige remover `radja` de `LOCKED_PARTICIPANTS`.

## QA cirúrgico Rhussiana
- Corpo: **NORMAL slim / average** (mais magra) — FORBIDDEN plump/gordinha exagerada e muscular/ripped/bodybuilder.
- Vestido: black strapless **com babado**, hem ~1 dedo acima do joelho. GOLD heeled sandals + gold hair clip.
- Mãos: **BARE HANDS** — FORBIDDEN boxing/fighter/fingerless combat gloves.
- Escala: idle_01 / idle_02 / victory / **attack** alinhados ao footprint idle_01.
- `walk_01` e `attack` scale-lock: **idle_01** como altura/footprint; Dinarte/template só para pose.
- Env `RHUSSIANA_BODY_SOFTEN=true` / `RHUSSIANA_BELLY_FLATTEN=true` — edits cirúrgicos legados (backup `.pre_*_backup.png`).
- Backup pré-attack-scale: `output/backups/rhussiana_pre_attack_scale_<timestamp>/`.
- Manter `GENERATION_ENABLED=false` ao final.
- **LOCKED** (package closed 2026-08-20) — regenerar exige remover `rhussiana` de `LOCKED_PARTICIPANTS`.

## QA cirúrgico João
- Identidade visual obrigatória = **terno formal** do `idle_01`: blazer charcoal/preto com lapelas, calça social combinando, camisa social escura/preta, gravata **magenta/hot pink**, cinto fino preto com fivela prata, sapatos sociais escuros polidos.
- Rosto/Acessórios: **SEM ÓCULOS** (bare face/eyes), barba/bigode escuros aparados. Mãos: **BARE HANDS** — FORBIDDEN luvas de boxe/fighter/MMA/fingerless/wraps.
- FORBIDDEN: polo, regata, camisa branca, óculos, roupa de fighter genérica, jeans, tênis, frame sem blazer, frame sem gravata, collage/contact-sheet num frame.
- Escala: mesmo footprint/altura do `idle_01` (~471px no canvas 576x576) ancorado na linha base Y=575.
- `idle_01`, `idle_02`, `walk_01`, `attack`, `victory` OK: intocados e aprovados.
- Passada cirúrgica 2026-08-21 (3 correções + refinamento walk_02):
  1. `walk_02`: Passada alternada real e dinâmica do ciclo de caminhada no padrão Dinarte (perna oposta de walk_01 à frente, calcanhar de trás elevado, balanço natural dos braços com mãos nuas).
  2. `hurt`: Recuo de impacto limpo com estritamente DOIS braços reagindo ao golpe, eliminação completa de braço/mão fantasma no tronco/peito.
  3. `lying`: Corpo único horizontal derrotado estritamente no chão com DOIS membros inferiores (um único par de pernas e sapatos sociais pretos), eliminação de pernas/canelas fantasmas.
- Manter `GENERATION_ENABLED=false` ao final.
- **LOCKED** (package closed 2026-08-21 — QA humana aprovou "pode fechar joão"). Regenerar exige remover `joao` de `LOCKED_PARTICIPANTS`.

## QA cirúrgico Neto
- Identidade visual obrigatória = **idle_01**: camiseta preta justa manga curta + jeans azul médio + tênis pretos; corpo fordo/normal.
- Mãos: **BARE HANDS** — FORBIDDEN boxing/fighter/MMA/fingerless gloves / wraps.
- FORBIDDEN: cargo pants, calça charcoal, cinto marrom, colar dourado, roupa de fighter genérica, luvas.
- Escala: mesmo footprint/altura do `idle_01` (~70-80% do canvas 576x576) — especialmente `walk_02` (não pode sair pequeno).
- `idle_01`, `idle_02`, `lying` OK: **não regenerar** a menos que QA humana peça.
- Hurt: calça deve ser o **mesmo azul denim** do idle_01 (não light-wash).
- Backup pré-correção: `output/backups/neto_pre_qa_gloves_scale_YYYYMMDD/`.
- Package **LOCKED** 2026-08-20 (QA humana aprovou). Manter `GENERATION_ENABLED=false`.

## QA cirúrgico Leandro
- Identidade visual obrigatória = **idle_01**: camiseta preta crew-neck manga curta + calça cargo charcoal/oliva + botas/tênis escuros sola clara. Rosto pixel art limpo e simétrico.
- Corpo: **NORMAL** average — braços **LISOS** (SMOOTH), ZERO músculos visíveis. FORBIDDEN buff/ripped/biceps.
- Cabelo: **mesmo** short dark fade do idle_01 em TODOS os frames (especialmente `lying`).
- Mãos/punhos: **BARE HANDS + BARE WRISTS** — FORBIDDEN luvas e relógios.
- Escala: normalização matemática exata baseada na linha base Y=575 (~554px).
- `walk_02` HARD FAIL: exatamente **UM** sprite full-canvas — FORBIDDEN multi-miniaturas.
- `lying`: figura única deitada horizontalmente no chão.
- Backup: `output/backups/leandro_pre_qa_smooth_arms_YYYYMMDD/`.
- Passada 2026-08-21: rosto/olhos limpos, escala e poses aprovados por QA humana ("pode fechar o leandro").
- **LOCKED** (package closed 2026-08-21) — regenerar exige remover `leandro` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false` ao final.

## Wendson package (2026-08-20)
- Identidade: black baseball cap + round black glasses + full dark beard + black hoodie (kangaroo pocket, hood down) + black cargo pants + black sneakers; watch left wrist; ear plug.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT smooth non-muscular arms (NOT Dinarte muscular).
- Outputs: seed `assets/participants/wendson/fighter/` + `app/public/assets/participants/wendson/fighter/` + review contact sheet.
- **LOCKED** (package closed 2026-08-20) — regenerar exige remover `wendson` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Lailson package (2026-08-20)
- Identidade: cream/off-white NY Yankees baseball cap + cream/off-white plain tee + deep blue jeans/cargo + beige/tan sneakers (dark stripe, white soles); thin mustache + goatee; tan skin.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT smooth non-muscular arms (NOT Dinarte muscular).
- Outputs: seed `assets/participants/lailson/fighter/` + `app/public/assets/participants/lailson/fighter/` + `review/lailson_frames_contact_sheet.png`.
- Fixes iniciais: `walk_02` multi-sprite → single; `victory` idle-guard → fist raise Dinarte.
- QA 2026-08-20: `idle_02` bob determinístico (+12px) a partir dos pixels do idle_01 (mesmo estilo); `walk_02` style-lock edit a partir de walk_01/idle_01. Backup `output/backups/lailson_pre_idle02_walk02_style_*`.
- QA 2026-08-21: Rollback de `attack`, `hurt`, `victory`, `lying`, `walk_01` para o baseline aprovado de `e35bf47`/`2a30a35`; `idle_02` microvariação sutil de punhos/guarda relaxada mantendo 100% das roupas/escala; `walk_02` passada alternada com calça jeans escura, camiseta cream e boné NY combinando com `walk_01` e `idle_01`.
- **LOCKED** (package closed 2026-08-21) — regenerar exige remover `lailson` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Wesley package (2026-08-20)
- Identidade: dark charcoal/black polo + bright lime green collar; black digital watch LEFT wrist; dark pants; black sneakers white soles; short dark fade hair; medium-tan skin; clean-shaven.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT smooth non-muscular arms (NOT Dinarte muscular).
- Outputs: seed `assets/participants/wesley/fighter/` + `app/public/assets/participants/wesley/fighter/` + `review/wesley_frames_contact_sheet.png`.
- Fixes na geração: `walk_02` collage → single sprite; `attack` ghost/arm → right punch lunge Dinarte; `victory` arm straight up.
- **LOCKED** (package closed 2026-08-20 — QA humana aprovou). Regenerar exige remover `wesley` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## QA cirúrgico Jailson
- Identidade: dark navy open blazer/shirt (sleeves rolled) + black tee + **DARK blue denim** (exact idle_01 — NOT light-wash) + brown belt gold buckle + pale-blue sneakers + glasses.
- Mãos: **BARE HANDS** — FORBIDDEN gloves / watch.
- Victory pants lock 2026-08-20: regen ONLY `victory` (pants were lighter than idle_01); other frames untouched.
- Backup: `output/backups/jailson_pre_victory_pants_<timestamp>/`.
- **LOCKED** (package closed 2026-08-20) — regenerar exige remover `jailson` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false` ao final.

## QA cirúrgico Ricardo
- Identidade visual obrigatória = **idle_01**: camiseta **azul royal** crew-neck com logo **Under Armour** azul-claro no peito + calça athletic charcoal/preta + tênis escuros; cabelo short dark buzz; limpo de barba.
- Corpo: **NORMAL** average — braços **LISOS** (SMOOTH), ZERO músculos visíveis. FORBIDDEN buff/ripped/biceps (Dinarte-only).
- Mãos: **BARE HANDS** — FORBIDDEN luvas / wraps / relógios.
- Escala: mesmo footprint do idle_01 (~70-80% canvas) em todos os frames.
- Env `SMOOTH_ARMS_EDIT=true` (ou `LEANDRO_SMOOTH_ARMS=true`) — edit pose-locked apagando músculos (pula `lying`).
- Backup: `output/backups/ricardo_pre_smooth_arms_YYYYMMDD/`.
- Manter `GENERATION_ENABLED=false` ao final.
- **LOCKED** (package closed 2026-08-20) — regenerar exige remover `ricardo` de `LOCKED_PARTICIPANTS`.

## QA cirúrgico Izaias
- Identidade: jaqueta puffer **charcoal-navy** (mesmo tom do idle_01 / walk_02 — NÃO azul-claro) + camiseta branca + jeans charcoal + **EXATAMENTE 1** cordão de aço prata (nunca 2/3, nunca ausente).
- Mãos: **BARE HANDS** — FORBIDDEN luvas/fingerless/wraps.
- Calçado HARD LOCK: tênis pretos sólidos com cadarço preto (mesmo design em TODOS os frames).
- Corpo: braços lisos / NORMAL (não musculoso).
- Env `IZAIAS_JACKET_COLOR_LOCK=true` — edit pose-locked (IMAGE1=frame, IMAGE2=idle_01 cor do casaco). Preferir regen full `walk_01` com outfit lock de walk_02 quando a cor divergir.
- Backup: `output/backups/izaias_pre_walk01_jacket_color_<timestamp>/` (também `izaias_pre_qa_shoes_gloves_chain_<timestamp>/`).
- **LOCKED** (package closed 2026-08-21 — QA humana aprovou "pode fechar Izaias"). Tênis pretos, mãos nuas, 1 cordão e walk_01 casaco charcoal-navy fechados pela QA humana. Regenerar exige remover `izaias` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false` ao final.

## QA Manassés
- Identidade: navy polo com duas faixas verdes no colarinho/punhos, cabelo/barba salt-and-pepper, calça escura, tênis escuros sola clara.
- Corpo DEFAULT: braços **lisos** (SMOOTH_ARMS_EDIT habilitado para `manasses`); musculatura = só Dinarte.
- Pose lock: sheet Dinarte 2x4; sheet em `review/manasses_frames_contact_sheet.png`.
- Backup pré-smooth: `output/backups/manasses_pre_smooth_arms_<timestamp>/`.
- Package **LOCKED** 2026-08-20 (QA humana aprovou). Manter `GENERATION_ENABLED=false`.

## Joemerson package (2026-08-20)
- Identidade: black short-sleeve Adidas tee (3 white shoulder stripes + left-chest logo) + blue distressed denim shorts + black/green sneakers white soles + gold chain(s) + silver watch left wrist + left forearm tattoo; short dark fade; light stubble.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT smooth non-muscular arms (NOT Dinarte muscular).
- Scale lock: `walk_01` / `attack` / `victory` usam **idle_01** como altura/footprint (`resolveRhussianaWalkScaleRef`).
- QA 2026-08-20: regen ONLY walk_01 (bermuda+watch) + attack (watch+scale); depois ONLY idle_02 (micro+watch) + victory (tee lock idle_01).
- Backups: `output/backups/joemerson_pre_walk01_attack_qa_<timestamp>/`, `output/backups/joemerson_pre_idle02_victory_qa_<timestamp>/`.
- Outputs: seed `assets/participants/joemerson/fighter/` + `app/public/assets/participants/joemerson/fighter/` + `review/joemerson_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-20 — QA humana aprovou "pode fechar"). Regenerar exige remover `joemerson` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Erikson package (2026-08-20)
- Identidade: navy crew-neck tee com graphic **Classic Cars** (carros amarelos) + jeans azul médio + tênis brancos + corrente grossa dourada + studs dourados + smartwatch preto no pulso esquerdo; short dark textured top + fade; pele bronzeada.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT smooth non-muscular arms (NOT Dinarte muscular).
- Gaze: 3/4 olhando oponente (RIGHT) — FORBIDDEN camera stare (reforçado em `eriksonIdentityAddon`).
- Identity addon: `eriksonIdentityAddon` no GeminiImageProvider; scale-lock walk/victory/idle_02 via idle_01.
- QA 2026-08-20: regen master (gaze); idle_02 bob determinístico +10px from idle_01; walk_01 watch; walk_02 style; victory scale + fist-up (sem ghost arm). attack/hurt/lying OK intocados.
- QA 2026-08-20 (2): regen ONLY `idle_02` — **guarda baixa** (punhos na cintura/quadril) vs idle_01 chest-height; idle_01 e demais frames intocados. Backup `erikson_pre_idle02_low_guard_<timestamp>/`.
- QA 2026-08-20 (3): **watch laterality only** (poses locked). Keep idle/hurt/victory. `walk_01`/`walk_02`: move watch to LEFT wrist (two-pass remove→add via `ERIKSON_WATCH_LOCK`). `attack`/`lying`: remove watch from visible RIGHT arm (left hidden). Edit mode `eriksonWatchLockEdit`. Backup `erikson_pre_watch_laterality_<timestamp>/`.
- Backups: `output/backups/erikson_pre_walk_attack_fix_<timestamp>/`, `erikson_pre_qa_gaze_watch_style_<timestamp>/`, `erikson_pre_idle02_low_guard_<timestamp>/`, `erikson_pre_watch_laterality_<timestamp>/`.
- Outputs: seed `assets/participants/erikson/fighter/` + `app/public/assets/participants/erikson/fighter/` + `review/erikson_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-20 — QA humana aprovou "ok pode fechar"). Regenerar exige remover `erikson` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Leonardo package (2026-08-20)
- Identidade: light heather-gray polo com duas faixas finas navy no colarinho e punhos + jeans azul médio + tênis branco/cinza claro; cabelo short salt-and-pepper; stubble leve; pele medium/tan.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT NORMAL + smooth arms (NOT Dinarte muscular).
- Scale lock: walk_01/walk_02/attack/victory/hurt usam **idle_01** como altura/footprint (orchestrator); no provider victory **não** anexa idle_01 full body (contaminava guarda) — scale via Dinarte IMAGE 1 + text/source/face.
- QA 2026-08-20: regen master NORMAL; all derived; hurt (no ghost leg); walk_01 style-lock via idle_01 (provider + retries). Style-edit pose-locked rejeitado (gerou collage 3-up).
- QA victory-only 2026-08-20: regen ONLY `victory` — Dinarte fist-up (RIGHT arm UP above head, LEFT fist waist); idle_01 identity; NORMAL body. SHA256 `a1f86f1f035ff30c953a8b5e3f64e5297b7186573017d2cee3415ffc92f39aef`.
- Backups: `output/backups/leonardo_pre_hair_body_hurt_qa_*`, `leonardo_pre_walk01_style_*`, `leonardo_pre_victory_qa_*`.
- Outputs: seed `assets/participants/leonardo/fighter/` + `app/public/assets/participants/leonardo/fighter/` + `review/leonardo_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-20 — QA humana aprovou "pode fechar leonardo"). Regenerar exige remover `leonardo` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Tiago package (2026-08-20)
- Identidade: charcoal DIESEL allover tee + dark pants + white sneakers + black rectangular glasses + black sports watch LEFT wrist; short dark spiky hair; smooth arms.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- QA 2026-08-20: regen ONLY `idle_02` — guarda claramente mais alta (punhos ~queixo) vs idle_01 mid-chest; idle_01 e demais frames intocados.
- Backup: `output/backups/tiago_pre_idle02_guard_qa_<timestamp>/`.
- Outputs: seed `assets/participants/tiago/fighter/` + `app/public/assets/participants/tiago/fighter/` + `review/tiago_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-20 — QA humana aprovou "pode fechar e travar"). Regenerar exige remover `tiago` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.
- NOTA: feedback calça/sapato/victory/relógio era do **Marconi**, não do Tiago.

## Marconi package (2026-08-20)
- Identidade: plain BLACK crew-neck tee + dark charcoal jeans + black sneakers (thin grey sole) + chunky black round digital watch LEFT wrist; short dark buzz + full beard; stocky NORMAL; smooth arms.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- QA 2026-08-20: idle_02 bob determinístico (+12px) from idle_01; regen walks/attack/hurt/victory/lying for scale + clothes + watch lock; victory smooth non-buff.
- QA walks/shoes 2026-08-20: regen walk_01/walk_02 (calça charcoal, WATCH não pulseira, estilo idle_01); lying sola cinza; walk_01 surgical pose-lock + watch/calça/tênis de idle_01. Backup `output/backups/marconi_pre_walk_shoes_qa_<timestamp>/`.
- QA 4 erros 2026-08-20: walk_01 watch → LEFT; walk_02 chubby; hurt sem corrente/cargo; attack estilo+gordinho idle_01. Backup `output/backups/marconi_pre_walk_hurt_attack_qa_<timestamp>/`.
- Residuais anteriores (watch em attack) tratados na QA walk/idle/watch.
- QA walk/idle/watch 2026-08-20: idle_02 guarda baixa (nao clone); walk_01 calça+tênis = idle_01; walk_02 mesmo estilo idle_01 + chubby; attack+lying REMOVE watch (braco esquerdo oculto, regra Erikson). Backup `output/backups/marconi_pre_walk_idle02_watchrm_qa_<timestamp>/`. Script `scripts/marconi-qa-surgical.mts`.
- QA bg/watch/lying 2026-08-20: idle_02 solid magenta (sem checker); walks watch LEFT (= idle_01); lying grounded bottomGap 0. Backup `output/backups/marconi_pre_bg_watch_lying_qa_<timestamp>/`.
- QA walk_02 scale 2026-08-20: regen ONLY walk_02 scale-lock = idle_01 (bbox height 96.4%, same topGap/bottomGap). Backup `output/backups/marconi_pre_walk02_scale_qa_<timestamp>/`.
- Outputs: seed `assets/participants/marconi/fighter/` + `app/public/assets/participants/marconi/fighter/` + `review/marconi_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-20 — QA humana aprovou "pode fechar o fernando e o marconi"). Regenerar exige remover `marconi` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Alexandre package (2026-08-20)
- Identidade: black baseball cap + thick WHITE-framed sunglasses + salt-and-pepper beard (grey/white chin) + silver chain + black patterned short-sleeve tee + black athletic shorts + black sneakers; dense black tattoo on RIGHT forearm; NO watch; tan skin.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT smooth non-muscular arms (NOT Dinarte muscular).
- Identity addon: `alexandreIdentityAddon`; scale-lock walks/idle_02 via idle_01; dedicated master path with Dinarte idle pose (no old idle_01 camera lock).
- Victory: skip idle_01 full-body attach (same as Leonardo) to avoid idle-guard contamination; RIGHT arm fist-up.
- QA 2026-08-20 gaze/walk: regen master/idle_01 (3/4 RIGHT opponent, not camera) + idle_02 microvariation + walk_01/walk_02 Dinarte strides. Attack/hurt/victory/lying unchanged. Backup `output/backups/alexandre_pre_gaze_walk_qa_<timestamp>/`.
- QA 2026-08-20 idle_02 low guard: regen ONLY idle_02 (fists at waist/hip vs idle_01 chest guard). idle_01 and other frames unchanged. Backup `output/backups/alexandre_pre_idle02_lowguard_qa_<timestamp>/`.
- Outputs: seed `assets/participants/alexandre/fighter/` + `app/public/assets/participants/alexandre/fighter/` + `review/alexandre_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-20 — QA humana aprovou "pode fechar alexandre quando terminar ja vi que ficou bom"). Regenerar exige remover `alexandre` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Fernando package (2026-08-20)
- Identidade: black polo + BRIGHT GREEN collar AND green sleeve cuffs + small chest logo + black jogger pants + black sneakers white soles; dark curly volume-on-top fade; thin mustache + goatee; silver stud earrings; medium-tan skin; NO watch.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT smooth non-muscular arms (NOT Dinarte muscular).
- Identity addon: `fernandoIdentityAddon`; scale-lock walks/hurt/idle_02/attack via idle_01. Attack/victory skip idle_01 full-body attach (avoids idle-guard ghost arms); attack uses idle_01 as HEIGHT-ONLY scale chip.
- QA 2026-08-20: regen lying flatten (flat KO head-left/feet-right vs knees-up sit). Backup `output/backups/fernando_pre_lying_flatten_<timestamp>/`.
- QA 2026-08-20 idle_02/attack/victory: regen ONLY those 3 — idle_02 same scale/guard family; attack Dinarte punch EXACTLY TWO ARMS; victory Dinarte fist-up EXACTLY TWO ARMS. idle_01/walks/hurt/lying unchanged. Backup `output/backups/fernando_pre_idle02_attack_victory_qa_<timestamp>/`.
- QA 2026-08-20 attack scale: regen ONLY attack — same head-to-toe height as idle_01 (not small). Backup `output/backups/fernando_pre_attack_scale_qa_<timestamp>/`.
- Outputs: seed `assets/participants/fernando/fighter/` + `app/public/assets/participants/fernando/fighter/` + `review/fernando_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-20 — QA humana aprovou "pode fechar o fernando e o marconi"). Regenerar exige remover `fernando` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Ana package (2026-08-20)
- Identidade: FEMALE; emerald green one-shoulder gown (LEFT strap, RIGHT shoulder bare) + matching emerald sash/belt; dark/emerald closed-toe heels; dark HIGH BUN + two face-framing strands; rose-pink rounded glasses; gold hoop earrings; tan/olive skin; BARE hands; NO watch.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT NORMAL female + smooth arms (NOT Dinarte muscular; NOT male body).
- Identity addon: `anaIdentityAddon`; dedicated master path; scale-lock derived frames via idle_01.
- QA 2026-08-20: regen idle_02 (heels, not barefoot) + walk_02 (Dinarte opposite stride). Backup `output/backups/ana_pre_idle02_walk02_qa_<timestamp>/`.
- QA idle_02 guarda baixa 2026-08-20: regen ONLY `idle_02` — fists at waist/hip vs idle_01 chest/chin; idle_01 and remaining frames untouched. Backup `output/backups/ana_pre_idle02_low_guard_<timestamp>/`.
- Outputs: seed `assets/participants/ana/fighter/` + `app/public/assets/participants/ana/fighter/` + `review/ana_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-20 — QA humana aprovou "pode fechar a ana"). Regenerar exige remover `ana` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Ryan package (2026-08-20)
- Identidade: black polo + BRIGHT LIME GREEN collar AND lime-green sleeve bands + left-chest "ESPERANÇA DISTRIBUIDORA DE FRIOS" logo + black backpack straps + black pants/joggers + black sneakers white soles; short dark hair (not curly); dark stubble; NO watch; light-to-medium tan skin.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT smooth non-muscular arms (NOT Dinarte muscular). Distinguir de Fernando (cabelo crespo + cavanhaque + brincos).
- Identity addon: `ryanIdentityAddon`; scale-lock walks/attack/victory/hurt/idle_02 via idle_01.
- QA 2026-08-20: regen walk_02 (passada oposta, sem puxar alça); victory skip idle_01 body (RIGHT fist-up, sem braço fantasma). Backup `output/backups/ryan_pre_victory_walk02_qa_<timestamp>/`.
- Outputs: seed `assets/participants/ryan/fighter/` + `app/public/assets/participants/ryan/fighter/` + `review/ryan_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-20 — QA humana aprovou "ryan pode fechar"). Regenerar exige remover `ryan` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Caio package (2026-08-20)
- Identidade: PLAIN black crew-neck tee + thin silver chain + RIGHT-ear silver stud + dark charcoal jeans + black sneakers white soles; short dark fade hair; groomed short dark beard + mustache; medium-tan skin; NO watch.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT smooth non-muscular arms (NOT Dinarte muscular).
- Identity addon: `caioIdentityAddon`; dedicated master path with Dinarte idle pose (3/4 RIGHT, not camera / not crossed-arms photo).
- Scale-lock walks/hurt/idle_02/attack via idle_01. Attack/victory skip idle_01 full-body attach (avoids idle-guard ghost arms); attack uses idle_01 as HEIGHT-ONLY scale chip.
- idle_02: guarda baixa (fists waist/hip vs idle_01 chest). Watch: source has none — omit; if left arm hidden (attack/lying), do NOT put a watch on the right wrist.
- Outputs: seed `assets/participants/caio/fighter/` + `app/public/assets/participants/caio/fighter/` + `review/caio_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-21 — QA humana aprovou "pode fechar"). Regenerar exige remover `caio` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Evellyn package (2026-08-20)
- Identidade: FEMALE; long straight jet-black hair (side-part, over both shoulders to mid-torso) + PLAIN dark navy/charcoal short-sleeve crew-neck tee + dark charcoal pants + dark sneakers; medium tan/warm skin; BARE hands; NO watch; NO glasses; NO jewelry.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT NORMAL female + smooth arms (NOT Dinarte muscular; NOT male body). Same approach as Ana.
- Identity addon: `evellynIdentityAddon`; dedicated master path; scale-lock derived frames via idle_01.
- Attack/victory skip idle_01 full-body attach (avoids idle-guard ghost arms); attack uses idle_01 as HEIGHT-ONLY scale chip.
- QA 2026-08-20: regen idle_02 (guarda baixa vs idle_01 chest) + attack (Dinarte RIGHT punch, LEFT chambered, EXACTLY TWO ARMS). Backup `output/backups/evellyn_pre_idle02_attack_qa_<timestamp>/`.
- Outputs: seed `assets/participants/evellyn/fighter/` + `app/public/assets/participants/evellyn/fighter/` + `review/evellyn_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-21 — QA humana aprovou "pode fechar"). Regenerar exige remover `evellyn` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Fabio package (2026-08-20)
- Identidade: navy blazer + WHITE open-collar dress shirt (NO necktie) + dark chest tattoo in the open V + matching navy dress pants + bright WHITE sneakers; short dark fade; thin mustache + goatee; silver watch LEFT wrist; medium-tan/olive skin.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying).
- Corpo: DEFAULT smooth non-muscular arms (NOT Dinarte muscular). NOT Joao (no magenta tie, no dress shoes).
- Identity addon: `fabioIdentityAddon`; dedicated master path; scale-lock walks/attack/victory/hurt/idle_02 via idle_01. Attack/victory skip idle_01 full-body attach (avoids idle-guard ghost arms); attack uses idle_01 as HEIGHT-ONLY scale chip.
- Watch laterality: LEFT wrist when visible; OMIT on attack/lying if left arm hidden (never move to right). Hurt regen for LEFT watch.
- QA walk consistency 2026-08-21: regen ONLY walk_01/walk_02 — idle_01 style+body-mass lock (leg thickness, navy blazer cut, navy pants, white sneakers). idle_01/master untouched. Backup `output/backups/fabio_pre_walk_consistency_qa_<timestamp>/`.
- Walk builders: skip sibling walk_02 outfit lock; walk_01/walk_02 attach idle_01 as STYLE+IDENTITY+BODY (not clothes-color-chip-only that ignored legs).
- Outputs: seed `assets/participants/fabio/fighter/` + `app/public/assets/participants/fabio/fighter/` + `review/fabio_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-21 — QA humana aprovou "pode fechar"). Regenerar exige remover `fabio` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Daniel package (2026-08-21)
- Identidade: WHITE polo manga curta + jeans azul escuro slim + slip-on branco; fade curto; bigode fino + cavanhaque; aparelho visivel com boca aberta; tatuagem sleeve preta no BRACO DIREITO; relogio dourado grosso no pulso ESQUERDO; chaves no quadril direito. THIS IS DANIEL, NOT DAVID.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying). Gaze 3/4 RIGHT (oponente), nao camera.
- Corpo: DEFAULT smooth non-muscular arms (NOT Dinarte muscular).
- Identity addon: `danielIdentityAddon`; dedicated master path; scale-lock walks/attack/victory/hurt/idle_02/lying via idle_01.
- Attack/victory skip idle_01 full-body attach (avoids idle-guard ghost arms); attack uses idle_01 as HEIGHT-ONLY scale chip.
- Watch: LEFT wrist when visible; OMIT on attack/lying if left arm hidden (never move to right).
- idle_02: guarda baixa (fists waist/hip vs idle_01 chest).
- QA 2026-08-21: regen lying (ONE KO body, no standing collage) + attack (omit watch on punching wrist). Backup `output/backups/daniel_pre_lying_attack_qa_<timestamp>/`.
- Outputs: seed `assets/participants/daniel/fighter/` + `app/public/assets/participants/daniel/fighter/` + `review/daniel_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-21 — QA humana aprovou "pode fechar"). Regenerar exige remover `daniel` de `LOCKED_PARTICIPANTS`. THIS IS DANIEL, NOT DAVID.
- Manter `GENERATION_ENABLED=false`.

## Hiago package (2026-08-21)
- Reserva (fora dos 32 oficiais). THIS IS HIAGO — NOT IZAIAS.
- Identidade: oversized black tee com "TOP" no peito esquerdo + calça cargo jogger verde-oliva + tênis preto/branco + óculos redondos pretos + corrente com pingente + quiff volumoso ondulado; relógio ESQUERDO; sem barba; braços lisos.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying). Gaze 3/4 RIGHT.
- Identity addon: `hiagoIdentityAddon`; dedicated master path; scale-lock walks/attack/victory/hurt/idle_02/lying via idle_01.
- Attack/victory skip idle_01 full-body attach (avoids idle-guard ghost arms); attack uses idle_01 as HEIGHT-ONLY scale chip.
- Watch: LEFT wrist when visible; OMIT on attack/lying if left arm hidden (never move to right).
- idle_02: guarda baixa (fists waist/hip vs idle_01 chest).
- Outputs: seed `assets/participants/hiago/fighter/` + `app/public/assets/participants/hiago/fighter/` + `review/hiago_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-21 — QA humana aprovou). Regenerar exige remover `hiago` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Kelvin package (2026-08-21)
- Reserva (fora dos 32 oficiais). THIS IS KELVIN.
- Identidade: proporções corporais jovens/teen (ombros estreitos, torso fino, braços lisos esguios sem musculatura adulta) + oversized black tee + calça jeans escura slim + tênis pretos/brancos + óculos redondos pretos + AirPods brancos nos ouvidos + relógio preto no pulso ESQUERDO; cabelo curto escuro com franja/topete jovem; sem barba.
- Pose lock: Dinarte contact sheet (8 frames, ordem idle_01/idle_02/walk_01/walk_02/attack/hurt/victory/lying). Gaze 3/4 RIGHT.
- Identity addon: `kelvinIdentityAddon`; dedicated master path; scale-lock walks/attack/victory/hurt/idle_02/lying via idle_01.
- Attack/victory skip idle_01 full-body attach (avoids idle-guard ghost arms); attack uses idle_01 as HEIGHT-ONLY scale chip.
- Watch: LEFT wrist when visible; OMIT on attack/lying if left arm hidden (never move to right).
- idle_02: guarda baixa (fists waist/hip vs idle_01 chest).
- QA 2026-08-21: regen victory para ajustar porte físico a adolescente/teen proporcional ao `idle_01`.
- Outputs: seed `assets/participants/kelvin/fighter/` + `app/public/assets/participants/kelvin/fighter/` + `review/kelvin_frames_contact_sheet.png`.
- **LOCKED** (package closed 2026-08-21 — QA humana aprovou "pode fechar o kelvin também"). Regenerar exige remover `kelvin` de `LOCKED_PARTICIPANTS`.
- Manter `GENERATION_ENABLED=false`.

## Padrão global de corpo (DEFAULT)
- Default para TODOS: braços **lisos / smooth**, corpo NORMAL (nem magro, nem musculoso).
- Musculatura/braços ripped = **exceção somente do Dinarte** (e casos especiais marcados explicitamente).
- Specs em `prompts/fighter_master.md` e `prompts/frame.md`; runtime reforça via `defaultSmoothArmsAddon` no provider.
- `SMOOTH_ARMS_EDIT=true` aplica edit cirúrgico para `leandro`, `ricardo` e `manasses`.
- NÃO regenerar pacotes LOCKED só por causa desta mudança de default.

## Segurança
- Não apagar nem mover assets existentes do jogo.
- Não alterar `runtime/fighters` nesta fase.
- Não gerar automaticamente ao instalar/descompactar.
- Não armazenar API key em arquivo versionado.
