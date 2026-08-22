# SDD Decisions — Copa Esperança

Este arquivo contém decisões posteriores ao SDD original e **tem precedência** em caso de conflito visual/nomenclatura.

## DD-001 — Nome oficial
O evento é **Copa Esperança**. Não usar "Campeonato Carioca", "Campeonato do Tempo" como marca principal, futebol, Copa do Mundo, "Arcade 90's", "Fight Club", Tekken ou qualquer marca inventada.

## DD-002 — Estrutura do campeonato
- 32 participantes.
- 16 duplas.
- Oitavas: 16 duplas / 8 confrontos.
- Quartas: 8 duplas / 4 confrontos.
- Semifinais: 4 duplas / 2 confrontos.
- Final: 2 duplas / 1 confronto.
- Campeã: 1 dupla.

Cada confronto é melhor de 3:
- R1: um integrante de cada dupla.
- R2: obrigatoriamente os dois integrantes que não jogaram R1.
- R3: somente em 1x1; cada dupla escolhe livremente seu representante.

## DD-003 — Formação das duplas
As duplas são pré-definidas pelo operador. A apresentação pública simula sorteio/shuffle, mas **jamais deve expor que é fake**.

Tela pública:
- grade 3 x 11 = 33 posições;
- 32 participantes;
- slot especial `?` fixo em linha 2, coluna 6;
- seletor passeia sobre os portraits e termina nos integrantes pré-definidos;
- portrait pequeno na grade + arte grande do personagem quando selecionado.

## DD-004 — Sorteio dos confrontos
A formação das duplas é cenográfica. Os confrontos podem ser sorteados de verdade após as 16 duplas estarem reveladas.

## DD-005 — Chaveamento determinístico
O bracket **não será uma imagem gerada por IA**. Será HTML/CSS/SVG/Canvas determinístico.

Motivo: geradores visuais não são confiáveis para topologia exata.

Matemática obrigatória: `16 → 8 → 4 → 2 → 1`

Cada card de dupla contém:
- número;
- 2 mini portraits;
- uma linha com nomes;
- sem placar na chave;
- apenas estado visual de quem avançou.

## DD-006 — Componentes canônicos são invariantes
Stages/cenários podem variar como em fighting games dos anos 90. Componentes equivalentes não.

São canônicos:
- logo retro;
- VS;
- moldura de portrait;
- placa de nome;
- placa de placar;
- painel de tempo;
- placa de fase;
- cursor;
- bitmap font.

A mesma peça deve ser reutilizada em todas as telas.

## DD-007 — UI em layers; nunca baked
Telas completas deixam de ser a fonte de verdade da UI.

Ordem:
1. stage/background;
2. efeitos ambientais;
3. foto/character art;
4. PNGs canônicos transparentes;
5. texto dinâmico;
6. estados CSS;
7. FX/transições.

Fotos, nomes, tempos, placares, rodada atual e valores mutáveis nunca são gravados em imagem estática.

## DD-008 — Moldura oficial de portrait
Usar `assets/ui/portrait_frame_base.png`.

É a borda simples inspirada nos cards de personagem já produzidos.
- não gerar moldura diferente para seleção, batalha, classificada etc.;
- mini portrait = mesma moldura reduzida via CSS;
- azul/vermelho/selecionado/vencedor = estado CSS, não outro PNG.

## DD-009 — VS oficial
Usar exclusivamente `assets/ui/vs_emblem.png`.
Pode escalar, animar entrada/impacto e alterar posição. Não redesenhar.

## DD-010 — Tipografia
Texto dinâmico usa a bitmap font canônica em 3 tamanhos: small, medium e large.
Mapeamento: `docs/copa-ui/FONT_METRICS_V4.json` (pacote *Font Fix v4 — TRUE
TRANSPARENT*), um PNG transparente por glifo, largura proporcional.
Regras de render: `docs/copa-ui/BITMAP_RENDERER.md`.
O antigo `FONT_METADATA.json` (atlas de célula fixa) está revogado em
`docs/copa-ui/superseded/`.

## DD-011 — Cenários variados
A Esperança não é um "jogo de galpão".
O local real da empresa transformado em pixel art é um **stage**, não a linguagem inteira.
A unidade visual vem da UI canônica e da direção arcade/fighting-game 90s, não de repetir cenário industrial.

## DD-012 — Round 3
- 2 candidatos pequenos por dupla;
- 1 escolhido grande por dupla;
- VS canônico;
- dados em runtime;
- outro stage permitido;
- nenhum texto/branding fictício.

## DD-013 — Captura de cronômetro
A webcam/Python/OpenCV produz apenas candidatos de leitura.
Fluxo: `DETECTAR → ATRIBUIR → CONFERIR → CALCULAR → REVELAR → CONFIRMAR → PONTUAR`

O adaptador de visão nunca altera placar ou vencedor sozinho.

## DD-014 — Regra de resultado
Para cada participante: `difference = abs(observedTime - targetTime)`.
Menor diferença vence. Empate exato não pontua e exige desempate.


## DD-015 — BattleScreen é uma cena, não um HUD
A tela de batalha deve renderizar stage + environment + dois fighters + combat FX + HUD + áudio. Uma implementação que mostra apenas background, fotos e placar está incompleta.

## DD-016 — Quatro fighter sheets obrigatórios
O pacote inclui male/female para BLUE e RED. BLUE ocupa o lado esquerdo; RED o direito. A variante é dado explícito do participante.

## DD-017 — Timeline audiovisual de finalização
Resultado confirmado dirige: `attack → impact → hurt → fall → body impact → K.O. → victory`. Se o placar final é `2x0`, inserir `PERFECT` após `K.O.`. Em `2x1`, nunca tocar `PERFECT`.

## DD-018 — Som é parte da mecânica de apresentação
A identidade sonora é announcer humano/original + Foley de luta + crowd. Sons eletrônicos genéricos de 8-bit não substituem esses elementos. O pack procedural rejeitado não é asset do projeto.

## DD-019 — Cursor de seleção já possui source sheet
`assets/ui/selection_cursor_sheet.png` contém estados P1/P2 (idle/move/lock/selected e auxiliares). Pode ser usado como source atlas na implementação. Um futuro PNG isolado só o substitui após aprovação explícita.
