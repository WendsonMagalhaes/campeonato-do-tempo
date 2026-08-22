# Architecture / Product Decisions

## ADR-001 — Campeonato em duplas
Status: definitivo.
32 participantes, 16 duplas.

## ADR-002 — Duplas pré-definidas
Status: definitivo.
A formação é cadastrada pelo operador.

## ADR-003 — Fake shuffle somente na formação
Status: definitivo.
A animação é cenográfica e nunca decide parceiros.

## ADR-004 — Confrontos podem ser sorteados realmente
Status: definitivo.
Após revelar as duplas, o bracket draw pode usar aleatoriedade real.

## ADR-005 — Regra das rodadas
Status: definitivo.
R1: um de cada dupla.
R2: obrigatoriamente os dois que não jogaram R1.
R3: somente 1x1, escolha livre de representante.

## ADR-006 — Timer Capture como periférico
Status: proposto para implementação.
Python/OpenCV local, sem autoridade de domínio.

## ADR-007 — Fallback manual
Status: obrigatório.

## ADR-008 — Local-first
Status: definitivo.
Sem servidor externo obrigatório.

## ADR-009 — Identidade visual
Status: definitivo.
Marca Esperança + linguagem arcade/fighting game 90s, sem copiar IP de jogos.

## ADR-010 — Versionamento no GitHub
Status: definitivo, autorizado pelo organizador.
Especificações e código gerado vivem no mesmo repositório. GitHub versiona o projeto; não é servidor de negócio nem requisito de runtime.

## ADR-011 — Status check por iteração do agente
Status: definitivo, autorizado pelo organizador.
Cada iteração atualiza `docs/STATUS.md`, incrementa `docs/ITERATION_LOG.md`, commita e envia ao GitHub, salvo pedido contrário.
