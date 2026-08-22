# Domain Rules — Fonte de verdade das regras do campeonato

## 1. Estrutura
32 participantes formam 16 duplas. A competição começa nas oitavas com 8 confrontos:
- oitavas: 16 duplas / 8 confrontos;
- quartas: 8 duplas / 4 confrontos;
- semifinais: 4 duplas / 2 confrontos;
- final: 2 duplas / 1 confronto;
- campeã: 1 dupla.

## 2. Formação das duplas
As duplas são cadastradas previamente pelo operador. Não existe sorteio real para sua formação.

A apresentação pública pode simular shuffle/sorteio. Esse mecanismo é cenográfico e deve terminar sempre na dupla previamente cadastrada.

## 3. Sorteio dos confrontos
Depois da revelação das 16 duplas, os confrontos da primeira fase podem ser sorteados realmente.

O sorteio real deve:
- usar exatamente as 16 duplas cadastradas;
- colocar cada dupla uma única vez;
- produzir 8 confrontos;
- persistir o resultado;
- permitir confirmação antes de iniciar o campeonato;
- não ser reexecutado acidentalmente depois de confirmado.

## 4. Melhor de 3
Cada confronto é decidido por até 3 rodadas. Primeiro a 2 vitórias vence.

### Rodada 1
O operador define/seleciona um integrante de cada dupla para jogar.

### Rodada 2
O sistema deve selecionar obrigatoriamente os dois integrantes que NÃO jogaram a rodada 1.

Exemplo:
- Dupla A: Ícaro + João
- Dupla B: Lívia + Maria
- R1: Ícaro x Lívia
- R2 obrigatória: João x Maria

O sistema deve rejeitar qualquer tentativa de repetir Ícaro ou Lívia na R2.

### Rodada 3
Somente existe se o placar após R2 for 1x1.
Cada dupla escolhe livremente qual de seus dois integrantes será seu representante.
Pode repetir participante usado em R1 ou R2.

### 2x0
Se uma dupla vencer as duas primeiras rodadas, o confronto termina imediatamente. R3 deve ser impossível.

## 5. Tempo-alvo
O apresentador anuncia o tempo-alvo. O operador registra o valor antes da apuração.
Apresentação canônica de tempos (telão, HUD, console): `MM:SS:CS` via `formatRaceTime` (domínio armazena ms; o 3º grupo são centésimos).

## 6. Resultado
Para cada participante:
`difference = abs(observedTime - targetTime)`

Vence quem tiver menor diferença.

Comparar antes de arredondar para exibição.

## 7. Empate
Se as diferenças forem exatamente iguais:
- placar não muda;
- rodada não é concluída;
- iniciar desempate;
- registrar nova tentativa conforme orientação operacional;
- somente um resultado não empatado pode gerar ponto.

## 8. Confirmação
Tempo detectado não é resultado confirmado.
Tempo atribuído também não é resultado confirmado.
O fluxo é:
DETECTAR → ATRIBUIR → CONFERIR → CALCULAR → REVELAR → CONFIRMAR → PONTUAR.

## 9. Premiação
Manter os valores originais até decisão explícita diferente:
- participação/eliminada nas oitavas: R$100 por dupla / R$50 por integrante;
- quartas: R$135 / R$67,50;
- semifinal: R$180 / R$90;
- final/vice: R$285 / R$142,50;
- campeã: R$500 / R$250.

Prêmio é garantido/acumulado: ao avançar, atualiza para o novo valor.

Orçamento original:
16×100 + 8×35 + 4×45 + 2×105 + 230 = R$2.500.
