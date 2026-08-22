# SFX Curation Notes — 2026-08-15

## Cursor move
O WAV gerado não era um único efeito de 6 segundos.
Ele contém **12 golpes curtos separados**, aproximadamente 130–160 ms cada.
Foram extraídas 6 variações espaçadas ao longo da sequência:
`cursor_move_01..06.wav`.

Runtime: randomizar sem repetir imediatamente.

## Selection lock
O arquivo de 5 s tinha o evento útil concentrado no começo e uma longa cauda/silêncio.
O master de runtime foi reduzido para ~1,1 s.

## VS impact
O arquivo de 2 s tinha praticamente toda a energia útil no primeiro segundo.
Foi cortado para ~0,98 s.

## Bracket advance
A variante #4 foi escolhida como primária porque:
- ataque começa imediatamente;
- corpo do efeito é mais concentrado;
- funciona melhor sincronizado ao avanço visual.

A #3 continua como alternativa.

## Crowd — round
As versões de ~3 s foram mantidas como pool de `crowd.roundWin`.
A versão de 0,48 s virou `crowd.reactionMicro`; não será usada como comemoração principal.

## Crowd — match/K.O.
As duas versões de ~5 s são o pool principal de `crowd.matchWin`.
A versão de ~2 s foi preservada como alternativa curta.

## Cold-room ambience
A versão `Industrial_refrigera #1` foi escolhida como padrão.

Motivo técnico importante:
- correlação estéreo aproximada do #1: **0,92**
- correlação do #3: aproximadamente **-0,50**

A #3 é muito mais larga/fora de fase e pode perder elementos quando somada para mono,
algo perigoso em PA corporativo/telão. Ela foi preservada apenas como alternativa.

## Mastering
- WAV PCM16 / 48 kHz para SFX/voice/ambience
- trims de silêncio e tails feitos por categoria
- fades anti-click
- peak normalization conservadora
- loudness final é controlado pelo AudioBus/runtime, não destruído no master
