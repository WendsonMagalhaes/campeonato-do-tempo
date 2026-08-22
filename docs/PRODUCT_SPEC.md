# Product Specification

## Objetivo
Criar uma experiência de competição ao vivo simples de operar e divertida para o público, combinando campeonato eliminatório, telão, fotos, efeitos arcade e captura opcional do cronômetro por webcam.

## Personas
### Operador
Controla cadastro, revelações, sorteio real dos confrontos, rodadas, atribuição de tempos, confirmação, correções e backups.

### Apresentador
Conduz a brincadeira e anuncia o tempo-alvo.

### Público
Vê somente a experiência do telão.

## Setup
Cadastrar:
- evento;
- 32 participantes;
- foto individual;
- 16 duplas pré-definidas;
- ordem de revelação;
- logo;
- assets de áudio/vídeo;
- configuração opcional da webcam.

## Foto
Para cada participante:
- upload JPG/PNG/WebP;
- preview;
- substituir;
- remover;
- enquadramento simples opcional;
- placeholder;
- persistência local.

## Sequência pública
1. abertura;
2. vídeo opcional;
3. fake shuffle + revelação das 16 duplas;
4. sorteio real dos confrontos;
5. revelação da chave;
6. confrontos;
7. avanço de fase;
8. final;
9. campeã;
10. chave final.

## Fake shuffle
O público deve perceber uma sensação de sorteio/formação ao vivo, embora as duplas sejam previamente definidas.
A UI administrativa não deve fingir que é aleatório: o operador deve saber claramente que é uma revelação cenográfica.

### Confronto (telão)
- fase e rodada grandes;
- dupla A e dupla B em nameplates;
- fotos dos 4 integrantes; os 2 ativos em destaque;
- placar grande;
- **tempo-alvo sempre visível e grande, no centro, abaixo do VS**;
- prêmio garantido;
- após revelar: tempo atingido **grande abaixo de cada dupla**.

## Privacidade da brincadeira
O tempo real não deve aparecer no telão antes da ação de revelação.

## Operador
A UI do operador é um **sistema web simples**, não um jogo. Não usa a pele 16/32 bits do telão.

Deve permitir:
- CRUD de participantes (nome, foto, editar, remover) com lista paginada — nunca 32 portraits enormes na mesma vista;
- CRUD de duplas pré-definidas (formar, editar, desfazer) só com integrantes ainda sem dupla;
- ver claramente que a revelação pública é cenográfica;
- participantes elegíveis para R1;
- R2 automática com os integrantes restantes;
- seleção de representantes na R3;
- feed do Timer Capture;
- fila de tempos detectados;
- atribuição;
- entrada manual;
- cálculo;
- confirmação;
- undo;
- status de persistência;
- abrir o telão em outra janela.

Cadastro de dupla acontece numa tabela/formulário, não num scroll de fotos.

## Falhas
Se webcam falhar, continuar manualmente.
Se áudio falhar, continuar silenciosamente.
Se foto falhar, placeholder.
Se telão fechar, operador continua.
