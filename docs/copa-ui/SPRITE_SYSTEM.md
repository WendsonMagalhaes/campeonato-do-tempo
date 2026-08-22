# Sprite System

## Fonte de verdade
`docs/SPRITE_MANIFEST.json`.

Os quatro sheets de lutador estão presentes no v2. Não substituir por silhouettes ou divs coloridas quando a tela for de batalha.

## Estados lógicos
`idle → attack → hurt → fall/ko → victory`

Também há `walk` para entradas/saídas e transições quando desejado.

Os sheets não devem ser desenhados inteiros na tela. O renderer deve recortar o frame/região apropriado do atlas. Isso pode ser feito por `background-position`, `<canvas>`, CSS `object-position` com clipping ou preprocessing no build. O mecanismo escolhido é implementação; o comportamento é obrigatório.

## Facing
- BLUE/left: direita.
- RED/right: esquerda.

Se um sheet estiver orientado na direção oposta, usar `scaleX(-1)` no layer do sprite, sem alterar o PNG original.

## Participante
Adicionar/usar campo explícito:
```ts
fighterVariant: 'male' | 'female'
```
Não inferir sexo/gênero pelo nome.

## Qual sprite aparece
A cada rodada só aparecem os dois participantes ativos daquela rodada, não os quatro integrantes das duplas.

- R1: os participantes escolhidos para R1.
- R2: obrigatoriamente os dois que não participaram de R1.
- R3: os representantes escolhidos pelas duplas.

## Imagens reais x fighters
Portraits/fotos reais pertencem ao HUD e às telas de seleção/VS. Os sprites genéricos são os lutadores da cena de batalha. Uma coisa não substitui a outra.
