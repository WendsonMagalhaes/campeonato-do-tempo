# Battle Timeline

Tempos são orientativos e devem ser ajustados com os WAVs finais.

## Início de R1/R2/R3 (intro visual + VO)
```text
0 ms      tela/stage montado, fighters idle
0 ms      PNG callout ROUND 1 / ROUND 2 / FINAL ROUND (scale ~0.85) + announcer
~1600–1700 ms  PNG callout FIGHT + announcer FIGHT  (obrigatório em R1, R2 e final)
~3000–3100 ms  callout clear; HUD estabilizado; aguardando resultado do operador
```

Assets: `/assets/ui/round_1.png`, `round_2.png`, `final_round.png`, `fight.png`.
Slot: `BATTLE.calloutOverlay` (não usar `roundTitle` 540×72).
Implementação: `buildRoundIntroPlan` + `useBattleDirector` — sempre re-agenda timers no effect (Strict Mode não pode deixar ROUND preso).

## Tempos de revelação / KO
Cantos inferiores (`BATTLE.leftFighterTime` / `rightFighterTime`), moldura CSS neon, pinados (sem walk-in translate). `formatRaceTime` MM:SS:CS.

## Walk-in attack (2026-08-16)

O atacante não teleporta: caminha `APPROACH_PX` (155px) em `WALK_IN_MS`
(1120 ms ≈ **4 passos** do ciclo walk 5fps — +280ms vs 840ms/3 passos, gap maior)
até o alcance do soco, golpeia da posição avançada (impact FX acompanha o
deslocamento) e depois caminha de volta. Constantes em `battle-timeline.ts`;
deslocamento via `advanceSide` no `BattleVisualState` + `translateX` com
transition no `BattleScene`.

## Round sem encerrar confronto
```text
0 ms      confirmedRoundResult; vencedor walk + avanço (155px em 1120ms ≈ 4 passos)
1120 ms   vencedor attack (posição avançada)
1230 ms   impact FX + punch sound + shake
1245 ms   perdedor hurt + hurt vocal
2020 ms   score reveal; perdedor idle; vencedor walk de volta
3140 ms   vencedor idle na posição de descanso
```

## Round que encerra confronto
```text
0 ms      confirmedRoundResult; vencedor walk + avanço (155px em 1120ms ≈ 4 passos)
1120 ms   vencedor attack (posição avançada)
1230 ms   heavy impact FX + punch heavy + shake
1245 ms   perdedor hurt + vocal
1440 ms   início fall
1720 ms   body hits floor + thud
1840 ms   announcer K.O. + PNG callout `/assets/ui/ko.png` (não BitmapText)
2220 ms   se 2x0: limpa KO PNG; announcer PERFECT + BitmapText PERFECT
2290 ms   vencedor walk de volta (durante K.O./PERFECT)
3470 ms   crowd cheer + vencedor victory (posição de descanso); 2x1 limpa KO PNG
4220 ms   transição para DUPLA CLASSIFICADA (`winner.png` no título)
```

Holds do scoreboard: `MATCH_KO_HOLD_MS = 4500`, `ROUND_WIN_HOLD_MS = 3300`.

## R3
```text
representantes confirmados
→ battle stage
→ FINAL ROUND!
→ FIGHT!
→ idle / aguarda resultado
→ finalização normal
```
