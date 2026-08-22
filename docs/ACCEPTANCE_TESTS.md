# Acceptance Tests

## Setup
- [ ] cadastrar 32 participantes;
- [ ] foto individual;
- [ ] formar exatamente 16 duplas;
- [ ] editar dupla antes do evento;
- [ ] persistir configuração.

## Fake shuffle
- [ ] parece embaralhamento;
- [ ] sempre termina no parceiro cadastrado;
- [ ] não altera domínio;
- [ ] funciona com foto ausente;
- [ ] áudio opcional.

## Sorteio real
- [ ] usa 16 duplas;
- [ ] nenhuma duplicada;
- [ ] nenhuma ausente;
- [ ] gera 8 confrontos;
- [ ] confirmação;
- [ ] persistência.

## Confronto
- [ ] R1 permite 1 jogador de cada dupla;
- [ ] R2 usa obrigatoriamente os outros 2;
- [ ] repetição em R2 é bloqueada;
- [ ] 2x0 encerra;
- [ ] 1x1 habilita R3;
- [ ] R3 permite escolher qualquer integrante;
- [ ] melhor de 3 correto.

## Cálculo
- [ ] diferença absoluta;
- [ ] precisão;
- [ ] empate;
- [ ] desempate;
- [ ] placar somente após confirmação.

## Timer Capture
- [ ] selecionar webcam;
- [ ] calibrar ROI;
- [ ] reconhecer display de teste;
- [ ] detectar valor estável;
- [ ] gerar candidato;
- [ ] candidato não pontua;
- [ ] operador atribui;
- [ ] descartar candidato;
- [ ] corrigir manualmente;
- [ ] fallback sem câmera.

## Telão
- [ ] abertura;
- [ ] fake shuffle;
- [ ] chave;
- [ ] VS;
- [ ] fotos;
- [ ] participantes ativos destacados;
- [ ] alvo;
- [ ] tempos ocultos;
- [ ] revelação;
- [ ] vitória;
- [ ] R3;
- [ ] classificação;
- [ ] prêmio;
- [ ] campeã.

## Resiliência
- [ ] offline;
- [ ] reload;
- [ ] restore;
- [ ] backup;
- [ ] áudio quebrado;
- [ ] foto quebrada;
- [ ] câmera desconectada;
- [ ] serviço Python parado;
- [ ] telão fechado;
- [ ] fluxo manual continua.

## Ensaio
- [ ] simular campeonato completo do zero à campeã.
