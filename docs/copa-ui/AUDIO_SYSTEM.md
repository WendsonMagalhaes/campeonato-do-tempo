# Audio System — fighting game, não "som retrô genérico"

## Direção obrigatória
A identidade é de fighting game arcade 90s: **voz de announcer + Foley físico + crowd**. Não usar boings, bleeps ou arpejos 8-bit genéricos como substitutos.

Os WAVs finais ainda serão produzidos/selecionados. O v2 contém a arquitetura e os nomes de arquivos, não o pack procedural rejeitado.

## Announcer obrigatório
- `ROUND 1!`
- `ROUND 2!`
- `FINAL ROUND!`
- `FIGHT!`
- `K.O.!`
- `PERFECT!`
- `WINNER!` (opcional na tela de classificada se não ficar redundante)

A voz deve ser original, não imitação de ator/personagem específico.

## Foley obrigatório
- punch light/heavy;
- vocal curto de dano masculino/feminino;
- som de queda/movimento do corpo;
- body impact/thud no chão;
- crowd ambient/cheer.

## Regra PERFECT
`PERFECT` toca **somente quando o placar final do confronto é 2x0**.
Nunca significa que alguém acertou exatamente o tempo-alvo.

## Sequência 2x0
```text
result confirmed
→ attack animation
→ punch/heavy impact + visual impact
→ hurt vocal
→ fall movement
→ body impact/thud
→ "K.O.!"
→ 180–350 ms pause
→ "PERFECT!"
→ big crowd cheer
→ winner victory pose
→ dupla classificada
```

## Sequência 2x1
Mesma finalização, mas sem `PERFECT!`.

## Round 3
```text
"FINAL ROUND!"
→ short dramatic pause
→ "FIGHT!"
→ idle until operator confirms result
```

## Implementação
Usar um `AudioDirector` baseado em eventos de domínio. Não espalhar `new Audio()` em componentes de tela. O áudio deve poder ser mutado globalmente e ter volumes por bus (`announcer`, `combat`, `crowd`, `ui`).

Veja `docs/AUDIO_MANIFEST.json`.
