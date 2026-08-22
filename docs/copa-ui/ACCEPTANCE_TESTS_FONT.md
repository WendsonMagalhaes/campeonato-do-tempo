# ACCEPTANCE TESTS — FONT FIX v3

A migração somente está aprovada se:

- [ ] `COPA ESPERANÇA` não mostra linhas/brancas divisórias entre letras.
- [ ] `PRESS START` não mostra células quadradas visíveis.
- [ ] `I` ocupa menos largura que `M`.
- [ ] `W` ocupa mais largura que `I`.
- [ ] espaços entre palavras são consistentes.
- [ ] `Á Ã É Ê Í Ó Ô Õ Ú Ç` renderizam corretamente.
- [ ] `á à â ã é ê í ó ô õ ú ç` renderizam corretamente.
- [ ] números `0-9` renderizam.
- [ ] `R$ 500,00` renderiza sem atlas.
- [ ] nenhum caractere é recortado pelo container.
- [ ] resize usa `image-rendering: pixelated`.
- [ ] não existe `background-position` no novo renderer.
- [ ] não existe cálculo de `row * cellWidth` ou `col * cellHeight`.
- [ ] sheets antigos não são carregados pelo browser durante o uso normal.
- [ ] re-render React não altera espaçamento.
- [ ] alinhamento center funciona no título.
- [ ] múltiplas linhas mantêm line-height estável.

## Smoke test recomendado

Renderizar simultaneamente:

```text
COPA ESPERANÇA
PRESS START
JOÃO & LÍVIA
3,50 s - R$ 500,00
ÁÀÂÃÉÊÍÓÔÕÚÇ
áàâãéêíóôõúç
0123456789
```

- [ ] Nenhuma linha vertical residual do sheet aparece entre glyphs.
