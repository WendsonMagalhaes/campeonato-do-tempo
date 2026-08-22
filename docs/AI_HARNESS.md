# AI Harness / Loop Development

## Objetivo
Permitir desenvolvimento agressivamente assistido por IA sem deixar o agente reinterpretar regras.

## Pipeline
PLAN → SPEC → TEST → IMPLEMENT → VERIFY → REVIEW → DOCUMENT → STATUS → VERSION

## Checks
- format
- lint
- typecheck
- unit
- integration
- domain invariant tests
- build
- offline smoke
- E2E crítico

## Testes obrigatórios de domínio
- R1 válida.
- R2 força jogadores restantes.
- R2 rejeita repetição.
- 2x0 termina.
- 1x1 abre R3.
- R3 aceita qualquer integrante.
- empate não pontua.
- fake shuffle termina na dupla cadastrada.
- bracket draw usa todas as duplas exatamente uma vez.
- timer candidate não altera score.
- atribuição não calcula automaticamente.
- cálculo bloqueado sem dois tempos.
- manual fallback funciona.

## Adapters
Implementar interfaces:
- TimerCapturePort
- PersistencePort
- AudioPort
- PublicDisplayPort

Criar MockTimerCapture para desenvolvimento/testes.

## Prompt template
1. Leia AGENTS.md.
2. Leia `docs/STATUS.md` e documentos relevantes.
3. Declare regra afetada.
4. Declare arquivos.
5. Escreva/atualize testes.
6. Implemente menor mudança.
7. Rode checks.
8. Reporte resultado.
9. Atualize docs.
10. Atualize `docs/STATUS.md` e acrescente linha em `docs/ITERATION_LOG.md`.
11. Commitar specs + código + status.
12. Enviar ao GitHub, salvo pedido contrário.

## Anti-patterns
- regra no JSX;
- cálculo duplicado;
- timer alterando domínio diretamente;
- RNG decidindo fake shuffle;
- esconder erro;
- remover teste;
- usar internet como requisito de runtime do campeonato.
- encerrar iteração sem STATUS.md / ITERATION_LOG.md.
- deixar alteração só na máquina local quando o remoto GitHub existir.
