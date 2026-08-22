# Acceptance Tests — Canonical UI

## Canonical assets
- [ ] Todas as telas usam `portrait_frame_base.png` para portraits.
- [ ] Mini portrait é a mesma moldura escalada; não existe uma segunda moldura artística.
- [ ] Todas as ocorrências de VS usam `vs_emblem.png`.
- [ ] Placar usa `score_panel_base.png`.
- [ ] Labels/nomes usam `name_plate_base.png` quando houver placa gráfica (Opening/Qualified/Champion). Versus / Round 3 / battle HUD: BitmapText sem name_plate.
- [ ] Nenhuma tela contém logos paralelos ou marcas inventadas.

## Dynamic content
- [ ] Nome de participante é texto/runtime.
- [ ] Foto é runtime.
- [ ] Tempo-alvo é runtime.
- [ ] Tempo observado é oculto até a ação de revelar.
- [ ] Placar é runtime.
- [ ] Fase/rodada é runtime.

## Team formation
- [ ] Grid contém 33 células visuais.
- [ ] 32 células são de participantes.
- [ ] `?` está exatamente em linha 2, coluna 6.
- [ ] Cursor pode percorrer os 32 participantes.
- [ ] Cursor não termina num participante diferente da dupla pré-definida.
- [ ] Telão não informa que a formação é pré-definida.

## Bracket
- [ ] 16 entradas aparecem uma única vez.
- [ ] 8 entradas por lado.
- [ ] 4 R16 matches por lado.
- [ ] 2 QF matches por lado.
- [ ] 1 SF match por lado.
- [ ] 1 finalista por lado.
- [ ] Final recebe exatamente os 2 finalistas.
- [ ] Sem placar dentro dos cards da chave.
- [ ] Card contém número + 2 mini portraits + uma linha de nomes.

## Round 3
- [ ] Só pode abrir quando placar do confronto for 1x1.
- [ ] Mostra os 2 candidatos de cada dupla.
- [ ] Permite exatamente 1 representante por dupla.
- [ ] Representante pode ser alguém que jogou R1 ou R2.

## Visual identity
- [ ] Stage pode mudar sem trocar a família de UI.
- [ ] Industrial é um stage, não o tema obrigatório de todas as telas.
- [ ] Não usar estética de futebol/Copa do Mundo.


## Battle scene — bloqueadores
- [ ] BattleScreen renderiza stage.
- [ ] BattleScreen renderiza exatamente dois fighters ativos.
- [ ] Existem paths válidos para male/female BLUE e male/female RED.
- [ ] BLUE está à esquerda olhando para a direita; RED à direita olhando para a esquerda.
- [ ] Fighters mudam entre idle/attack/hurt/fall-or-KO/victory conforme estado do domínio.
- [ ] Impact FX aparece no frame/ponto de contato.
- [ ] Resultado capturado/OCR não dispara animação sem confirmação do operador.
- [ ] Fim 2x0 executa K.O. e marca cue PERFECT; fim 2x1 não marca PERFECT.
- [ ] R3 anuncia FINAL ROUND e depois FIGHT (quando os WAVs finais existirem).
- [ ] Áudio é dirigido por eventos/AudioDirector, não espalhado nos componentes.
- [ ] Pack de áudio procedural rejeitado não está presente.
- [ ] Selection screen usa `selection_cursor_sheet.png` ou equivalente explicitamente aprovado, não um cursor inventado.
