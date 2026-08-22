# Formação fake das duplas e sorteio real dos confrontos

## A. Pair Reveal — fake shuffle
Entrada: 16 duplas já cadastradas.

Para cada dupla:
1. escolher qual integrante será revelado primeiro conforme roteiro/configuração;
2. mostrar portrait;
3. animar nomes/fotos de candidatos em alta velocidade;
4. desacelerar;
5. terminar obrigatoriamente no parceiro cadastrado;
6. impacto visual + WAV;
7. mostrar dupla formada;
8. aguardar comando do operador.

### Cópia pública
O telão trata a revelação como sorteio ao vivo. Textos proibidos no telão: “fake”, “simulação”, “cenográfico”, “pré-cadastrado”, “destino cadastrado”.

Duração da animação: 4,5–6,5 segundos, com desaceleração. Integrante âncora permanece visível o tempo todo; só o parceiro “gira”.

### Cópia do operador
A UI administrativa não finge aleatoriedade: o operador vê a dupla real e o rótulo de revelação cenográfica.

## B. Bracket Draw — sorteio real
Entrada: 16 duplas reveladas.

Algoritmo:
1. criar cópia dos IDs das 16 duplas;
2. usar shuffle real;
3. agrupar em pares;
4. produzir 8 confrontos;
5. exibir animação;
6. pedir confirmação;
7. persistir chave.

## Segurança
Após confirmar a chave, um novo sorteio exige ação administrativa explícita e confirmação forte, pois invalidaria o campeonato.
