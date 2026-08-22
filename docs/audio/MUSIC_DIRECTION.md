# Copa Esperança — Music Direction / Runtime Map

## Decisão das 4 novas versões

Nenhuma foi descartada.

### `music.introCinematic`
Fonte: `Copa_Esperana ... (1)`

A versão tem uma construção inicial muito mais lenta e funciona como **abertura cinematográfica**, não como loop de menu.

Fluxo sugerido:
1. tela preta / CRT boot;
2. primeiros elementos do stage aparecem;
3. logo Copa Esperança entra;
4. título/evento fica estabelecido;
5. ao terminar ou ao avançar, crossfade para `music.introPressStart`.

Toca apenas uma vez por abertura do evento.

### `music.introPressStart`
Fonte: `Copa_Esperana` sem `(1)`.

É a versão mais apropriada para **PRESS START / attract mode**:
- entrada mais imediata;
- pode permanecer enquanto o telão espera;
- loop com crossfade em runtime.

### `music.championReveal`
Fonte: `Championship Soul`.

É a música curta e concentrada da **revelação da dupla campeã**:
- entra depois do último K.O./PERFECT;
- winner pose;
- confete;
- nome da dupla;
- troféu.

Se a tela permanecer por mais de ~45 s, iniciar crossfade para `music.championCelebration`.

### `music.championCelebration`
Fonte: `Final Victory`.

É a faixa longa para:
- premiação;
- fotos;
- troféu;
- permanência no telão;
- encerramento do evento.

Não deve substituir o impacto imediato de `championReveal`.

---

## Mapa musical completo

| Estado/Tela | Música |
|---|---|
| Boot / abertura | `music.introCinematic` |
| PRESS START / attract | `music.introPressStart` |
| Formação fake das 16 duplas | `music.teamSelect` |
| VS | manter próxima BGM em pre-roll baixo ou usar somente stinger |
| Round 1 | `music.battleMain` |
| Round 2 | `music.battleMain` |
| Escolha representante R3 | `music.round3Select` |
| Round 3 | `music.battleFinalRound` |
| Grande Final R1/R2 | `music.battleMain` |
| Grande Final R3/decisivo | `music.battleFinalRound` |
| Campeã — reveal | `music.championReveal` |
| Premiação/celebração longa | `music.championCelebration` |

## Announcer sobre música

A voz é prioridade máxima.

Exemplo Round 3:

```text
round3_select fade out
        ↓
battle_final_round pre-roll -18 dB
        ↓
"FINAL ROUND!"          → music duck -7 dB
        ↓
pequena pausa
        ↓
"FIGHT!"                → mantém duck
        ↓
battle_final_round sobe para seu defaultGainDb
```

## Final do confronto

```text
heavy_hit
hurt
knockdown
body impact
music duck
"K.O.!"
if 2x0:
    "PERFECT!"
winner pose
```

No último confronto do campeonato:

```text
K.O. / PERFECT
battle music fade out
~350 ms de respiro
championReveal start
winner pose + confetti + champion UI
```

## Formato

BGMs são distribuídas como MP3 192 kbps / 48 kHz para o runtime web.

Motivo:
- WAV das músicas adicionaria mais de 150 MB;
- voz e SFX continuam WAV para latência/impacto;
- música não precisa do custo de PCM não comprimido no browser.

Os WAVs originais continuam sendo os masters de origem e podem ser reexportados no futuro.
