# Combat Animation State Machine

## Estados da cena
```text
PRE_ROUND
  ↓
ROUND_ANNOUNCE
  ↓
IDLE_WAITING_RESULT
  ↓ operador confirma resultado
ATTACK
  ↓
IMPACT
  ↓
HURT
  ├─ round continua → SCORE_REVEAL → RESET_TO_IDLE
  └─ match terminou → FALL → LYING_KO → KO_ANNOUNCE
                                  ├─ 2x0 → PERFECT_ANNOUNCE
                                  └─ 2x1 → sem PERFECT
                              → WIN_POSE → QUALIFIED
```

## Regras
- Não deixar o resultado do OCR/captura disparar animação sozinho.
- A animação só começa após `confirmedRoundResult`.
- `PERFECT` é resultado do **confronto 2x0**, não precisão perfeita no cronômetro.
- Em 1x1, antes de R3 usar seleção de representante; depois `FINAL ROUND!` → `FIGHT!`.
- A atualização permanente do bracket só acontece após `confirmedMatchWinner`.

## Redução de movimento
Quando `prefers-reduced-motion` estiver ativo, reduzir shake/zoom e manter apenas mudança de estado + áudio/texto essenciais.
