# Battle Scene Spec — obrigatório

## Objetivo
A tela de batalha **não é um HUD sobre um background**. É uma pequena cena de fighting game montada por layers e dirigida pelo estado do confronto.

## Ordem de layers — obrigatória
1. **Stage/background** — por exemplo `assets/backgrounds/battle_dock_coldroom_bg.png`.
2. **Environment FX** — névoa/condensação **desligada** até arte de porta ancorada (evita plumas flutuando); crowd estático no chão (`runtime/crowd/`, assets melhores pendentes de entrega humana).
3. **Fighters** — exatamente 2 lutadores ativos na rodada.
4. **Combat FX** — impacto, flash, poeira, K.O./finalização.
5. **HUD canônico** — portraits reais; nomes em BitmapText **ao lado** dos retratos (`A & B`, sem `name_plate` na batalha); dígitos do placar nos quadrados laterais do `score_panel` (v4 `medium` maior; placa central **~20% menor** para liberar faces do mezanino); buraco central = **fase da chave só** (`OITAVAS` / `QUARTAS` / `SEMIS` / `FINAL`, sem sufixo `R1`/`R2`/`R3` — a rodada vai no callout PNG); `TEMPO ALVO` na faixa mid-lower (acima do vão das cabeças / sob o corrimão do mezanino), só quando o alvo está definido, em **placa arcade local** (sem vignette global); status (`VENCE A RODADA` / `PERFECT` / `EMPATE`) na faixa `roundTitle` — **não** anunciar “tempos ocultos”; `TEMPO ALVO` em `small` + valor em `medium`; tempos de revelação em `large`. Hierarquia **somente via tamanhos Font Fix v4** (sem segunda fonte).
6. **Tempos nos cantos no hit/KO** — no impacto/revelação, `formatRaceTime` (`MM:SS:CS`) nos cantos inferiores com moldura neon arcade (não acima das cabeças; não durante “tempos ocultos”).
7. **Text overlays** — bitmap font callouts na faixa `roundTitle` (VENCE A RODADA, PERFECT, EMPATE). **Não** colocar ROUND/FIGHT/KO PNG nesse slot 540×72. **Não** renderizar banner de tempos ocultos.
8. **Large PNG callouts** — `BATTLE.calloutOverlay`: intro `round_*` / `final_round` → `fight` → **clear** (R1, R2 e final), e match-finish `ko.png`, em ~0.85 da escala natural (~750px), `image-rendering: pixelated`.
9. **Audio** — announcer + Foley sincronizados à timeline.

## Fighters
- lado esquerdo = equipe BLUE, olhando para a direita;
- lado direito = equipe RED, olhando para a esquerda;
- variante male/female vem de `participant.fighterVariant`, nunca do nome;
- assets obrigatórios:
  - `fighter_male_blue_sheet.png`
  - `fighter_female_blue_sheet.png`
  - `fighter_male_red_sheet.png`
  - `fighter_female_red_sheet.png`

## Cena parada
Antes da revelação do resultado, ambos ficam em `idle`. O telão **não revela o tempo capturado antes da ação do operador**.

## Resultado de uma rodada comum
Após confirmação do resultado:
1. vencedor entra em `attack`;
2. `impact_fx_sheet.png` aparece no contato;
3. perdedor entra em `hurt`;
4. se a rodada não encerra o confronto, voltar ambos para `idle` após reação e atualizar score;
5. se a rodada encerra o confronto, executar sequência de K.O. completa descrita em `BATTLE_TIMELINE.md`.

## Fim de confronto
A tela só avança para `duoQualified` depois da sequência audiovisual de término. O bracket só é alterado após o vencedor ser confirmado pelo operador.

## Stage não é identidade global
O cold-room/dock é um stage. Outras telas/stages podem usar rua/fachada, arena, cidade noturna, celebração etc. A identidade comum vem da UI canônica e da linguagem fighting-game 90s.
