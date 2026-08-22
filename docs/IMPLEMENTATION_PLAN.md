# Implementation Plan

## Fase 1 — Core sem câmera
1. Foundation.
2. Domain.
3. Persistência.
4. Cadastro/fotos.
5. Fake shuffle.
6. Sorteio real da chave.
7. Operador.
8. Telão.
9. Visual/áudio.
10. Testes.

O campeonato deve estar 100% operável manualmente antes da visão computacional.

## Fase 2 — Timer Capture
1. spike com webcam real;
2. ROI;
3. leitura do display;
4. estabilização;
5. serviço localhost;
6. adapter React;
7. fila/atribuição;
8. calibração;
9. fallback;
10. testes no local.

## Estimativa revisada — pleno + IA
Core visual/funcional: ~35–45h.
Timer Capture: adicionar ~8–20h, dependendo principalmente da qualidade do display, câmera, iluminação e facilidade de reconhecimento.

Faixa total prática: ~43–65h.

A visão computacional deve ser tratada como spike técnico: testar cedo com o cronômetro real antes de prometer automação perfeita.

## Ordem de risco
1. provar leitura do Race Timer;
2. fechar domínio;
3. fechar operação manual;
4. fazer apresentação;
5. polimento visual.

## Entrega
Mesmo se o Timer Capture não atingir confiabilidade adequada, o sistema deve estar pronto para o evento via entrada manual.
