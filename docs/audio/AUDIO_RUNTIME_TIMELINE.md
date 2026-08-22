# Copa Esperança — Audio Runtime Timeline

## Princípio
O som segue os **frames/eventos da animação**, e não delays mágicos desconectados da BattleScene.

## Início de Round 1 / Round 2
Os callouts específicos de ROUND 1 / ROUND 2 ainda não estão neste lote.
Quando existirem:

`ROUND -> pause -> FIGHT -> idle battle state`

## Round 3
1. `announcer.finalRound`
2. pausa dramática curta controlada pelo controller
3. `announcer.fight`
4. habilita estado ativo da batalha

## Resultado de uma rodada sem encerrar o confronto
No frame de contato:
- `combat.heavyHit`
- `fighter.<gender>.hurt`

Durante a queda:
- opcional `fighter.exhaustedVocal`

No frame em que o corpo encosta no chão:
- `fighter.knockdownImpact`

Depois:
- vencedor entra em pose
- **não tocar K.O. nem PERFECT se o confronto continua**

## Golpe que encerra o confronto
No contato:
- `combat.heavyHit`
- `fighter.<gender>.hurt`

Na queda:
- opcional `fighter.exhaustedVocal`

No contato com o chão:
- `fighter.knockdownImpact`

Depois do impacto:
- `announcer.ko`

Se placar final = 2x0:
- `announcer.perfect`

Depois:
- winner pose
- crowd / classified transition quando esses assets forem adicionados

## Regra PERFECT
`PERFECT = vitória da dupla por 2x0.`

Não significa acerto exato no cronômetro.
Não toca em vitória 2x1.
