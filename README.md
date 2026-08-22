# Campeonato do Tempo 2026 — Specification Pack v3

Fonte de verdade consolidada após correções do organizador.

## Regras fundamentais
- 32 participantes.
- 16 duplas, com 2 integrantes cada.
- As duplas são pré-definidas pelo operador.
- A apresentação da formação das duplas simula um shuffle/sorteio, mas NÃO altera as duplas cadastradas.
- Após revelar as 16 duplas, os confrontos da primeira fase podem ser sorteados de verdade.
- 8 confrontos nas oitavas, depois quartas, semifinais e final.
- Cada confronto é melhor de 3.
- Rodada 1: um integrante de cada dupla.
- Rodada 2: obrigatoriamente os dois integrantes que NÃO jogaram a primeira.
- Rodada 3, apenas se 1x1: cada dupla escolhe livremente qual dos seus dois integrantes irá representá-la.
- 2x0 encerra imediatamente.
- Webcam + serviço local de visão computacional podem ler o display físico do Race Timer.
- O operador é quem atribui cada tempo detectado ao participante.
- O cálculo só pode ser disparado após os dois tempos da rodada estarem atribuídos.
- Entrada manual é fallback obrigatório.
- Fotos individuais dos participantes.
- Estética arcade/fighting game dos anos 90, com identidade visual da Distribuidora de Frios Esperança.
- Áudio local, preferencialmente WAV para efeitos curtos.
- Sistema local-first/offline.

## Documentos
- `AGENTS.md`
- `docs/STATUS.md`
- `docs/ITERATION_LOG.md`
- `docs/PRODUCT_SPEC.md`
- `docs/SDD.md`
- `docs/DOMAIN_RULES.md`
- `docs/PAIR_REVEAL_AND_BRACKET_DRAW.md`
- `docs/TIMER_CAPTURE_SPEC.md`
- `docs/VISUAL_AUDIO_SPEC.md`
- `docs/SECURITY_GUARDRAILS.md`
- `docs/AI_HARNESS.md`
- `docs/ACCEPTANCE_TESTS.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/ASSET_MANIFEST.md`
- `docs/DECISIONS.md`

Specs e código gerado são versionados no mesmo repositório GitHub. O app permanece local-first: GitHub não é requisito de runtime.

## App
- `app/` — operador + telão (Vite/React/TypeScript)
- `timer-capture/` — periférico Python/OpenCV em localhost

```bash
cd app && npm install && npm run dev
```

Operador: `/`  ·  Telão somente leitura: `/telao`

Os wireframes em `wireframes/` são de composição/fluxo, não arte final.
