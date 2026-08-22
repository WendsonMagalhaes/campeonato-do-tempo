# AUDIO ADD-ON HANDOFF — LEIA ANTES DE IMPLEMENTAR

Este documento complementa o handoff do pacote v2.

## 1. Não substituir o sistema visual

Este ZIP é somente um overlay/add-on.

Não remova:
- backgrounds;
- fighter sprites;
- FX visuais;
- UI canônica;
- lógica do torneio;
- BattleScene existente.

Integre a camada sonora à arquitetura já definida no v2.

## 2. Fonte de verdade do áudio

`docs/audio_manifest.json`

Em caso de conflito entre implementação existente e este add-on,
o manifest e esta documentação vencem **somente para comportamento sonoro**.

## 3. Eventos nunca devem ser disparados por render

Não tocar áudio em re-render de componente React.

Sons devem partir de eventos/estado da scene:

- `ROUND_INTRO`
- `FIGHT`
- `ATTACK_CONTACT`
- `FIGHTER_HURT`
- `FIGHTER_GROUND_CONTACT`
- `MATCH_KO`
- `MATCH_PERFECT`
- `WINNER_POSE`
- `BRACKET_ADVANCE`

Isso evita sons duplicados.

## 4. Sequência obrigatória de resultado

### Round vencido, confronto continua

`mediumHit + hurt -> fall -> knockdownImpact -> crowd.roundWin`

Não tocar `K.O.`.
Não tocar `PERFECT`.

### Golpe que encerra confronto

`heavyHit + hurt -> fall -> knockdownImpact -> K.O.`

Se placar final = 2x0:

`K.O. -> PERFECT -> crowd.matchWin`

Se placar final = 2x1:

`K.O. -> crowd.matchWin`

## 5. Round intros

- Round 1: `ROUND ONE! -> pausa -> FIGHT!`
- Round 2: `ROUND TWO! -> pausa -> FIGHT!`
- Round 3: `FINAL ROUND! -> pausa -> FIGHT!`

O controller visual e o áudio devem compartilhar a mesma timeline.

## 6. Music bus / ducking

Voice tem prioridade máxima.

Quando announcer falar:
- abaixar MUSIC BUS em 7 dB;
- attack 70 ms;
- release 450 ms.

Impacto pesado pode reduzir música brevemente em ~2.5 dB.

Nunca reduzir announcer para abrir espaço para a BGM.

## 7. BGM map

- abertura cinematográfica → `music.introCinematic`
- PRESS START → `music.introPressStart`
- fake shuffle / formação → `music.teamSelect`
- Round 1 / 2 → `music.battleMain`
- seleção representante R3 → `music.round3Select`
- Round 3 / momento decisivo → `music.battleFinalRound`
- campeã reveal → `music.championReveal`
- premiação longa → `music.championCelebration`

## 8. Ambience

`ambience.coldRoom` é exclusivo do stage da câmara fria/doca Esperança.

A versão `coldRoomWideAlt` está preservada, mas **não é default**
por risco de cancelamento em reprodução mono/PA.

## 9. Cursor

Há seis `cursor_move` curtos.

Usar randomização **sem repetição imediata**.

## 10. Autoplay/browser

Antes do primeiro evento com áudio, desbloquear AudioContext a partir
de gesto explícito do operador/usuário.

Após desbloqueio, telão pode responder aos eventos normalmente.

## 11. Aceitação mínima

A integração não está pronta se:

- áudio duplica por re-render;
- K.O. toca ao fim de qualquer round;
- PERFECT toca em 2x1;
- BGM cobre announcer;
- cursor usa o WAV longo original em vez dos recortes;
- cold-room wide alternate vira default;
- música reinicia desnecessariamente entre R1 e R2;
- sons não estão sincronizados com frames de impacto/queda.
