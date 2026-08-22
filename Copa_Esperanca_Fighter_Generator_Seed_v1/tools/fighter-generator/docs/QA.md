# QA / critérios de aceite

## Verificações automáticas obrigatórias
- exatamente 576x576;
- PNG RGBA com canal alpha;
- nome de arquivo esperado;
- um único output por job;
- sem sobrescrever asset `approved` sem flag explícita;
- sha256 do output salvo no status/log.

## Revisão humana — fighter master
Antes de liberar os 7 frames derivados, criar uma contact sheet dos masters e revisar:
- roupa continua sendo a da fonte;
- cabelo/acessórios coerentes;
- não apareceu fantasia/arma/uniformização genérica;
- personagem cabe no canvas e baseline é consistente;
- estilo é coerente com os 8 templates.

## Regra de promoção
`fighterMaster: pending -> generated -> approved | rejected`.
Somente `approved` libera geração dos frames derivados.

## Não fazer
Não usar reconhecimento de nome/identidade por rosto para decidir arquivo. A associação participante↔arquivo vem exclusivamente do `participants.json` e do caminho da fonte.
