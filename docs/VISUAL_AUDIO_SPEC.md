# Visual & Audio Specification

## Identidade
Combinar:
1. identidade da Distribuidora de Frios Esperança;
2. linguagem de fighting game **2D 16/32 bits** (SNES, Mega Drive, fliperama CPS, sprites de Saturn/PS1).

O telão deve parecer um jogo de luta 2D de fliperama, não Pong, não HUD de vetor mínimo, não dashboard web.

Não usar luta 3D poligonal como idioma principal do telão.

A logo fornecida está em:
`assets/brand/esperanca-logo-reference.jpeg`

Retratos dos participantes são **fotos reais** dentro do chrome 16/32 bits. Não viram sprites.

## Duas peles
- **Telão:** 16/32 bits, tela cheia, tipografia grande, HUD de luta.
- **Operador:** sistema web administrativo simples (CRUD). Sem scanline, sem pixel frame, sem fonte arcade. Legibilidade e fluxo de cadastro vêm primeiro.

## Paleta
Aproximações para prototipação, não manual oficial:
- verde principal: ~ #00A060
- verde escuro: ~ #005030
- branco: #FFFFFF
- fundo do telão: noite urbana quase preta, com neon verde
- lado A: #3EC1FF
- lado B: #FF8A3C
- ouro de prêmio/campeã: #F5C542

Tokens do telão: `app/src/ui/theme/arcade.css`.
Tokens do operador: `app/src/ui/theme/operator.css`.
Fontes do telão (locais, sem CDN): Press Start 2P e VT323.
Fontes do operador: sistema (`ui-sans-serif`).

## Linguagem do telão (anti-Pong)
Não basta um retângulo e um “VS” pequeno no centro. O público deve ver:
- portraits grandes (mínimo ~280px de altura em Full HD);
- nomes em faixas tipo nameplate;
- VS enorme no centro;
- round markers e placar como barras de confronto;
- molduras pixeladas com glow;
- scanlines discretas;
- wipes, flash e screen shake em revelações;
- fundo ilustrado (rua/noite), não campo vazio.

## Propriedade intelectual
Inspirar-se no gênero e na época, sem copiar logos, personagens, sprites, fontes, trilhas, vozes, barras de vida ou frames reconhecíveis de Street Fighter, Mortal Kombat, KOF ou outras franquias.

Áudio de franquia é proibido. Usar SFX royalty-free/CC0 + síntese original. Licenças em `docs/ASSET_MANIFEST.md`.

## Telas do telão
### Abertura — PRESS START
Tela cheia, sem “quadrado vazio”.
Cena original de briga de rua 16/32 bits (silhuetas próprias, paleta Esperança), logo da marca, título CAMPEONATO DO TEMPO 2026, “PRESS START”, 16 DUPLAS / MELHOR DE 3.
Inspirada no espírito de intro de rua de luta 2D, sem copiar a intro da Capcom.

### Fake shuffle
O telão **nunca** diz que é simulação, fake, cenográfico ou pré-cadastrado.
Layout: portrait + nome do integrante já revelado (fixo) à esquerda; à direita, candidatos passando em alta velocidade, desacelerando, até o parceiro cadastrado.
Duração alvo: 4,5–6,5 s, com desaceleração. Depois, dupla formada em impacto.
Só o operador vê que a formação é roteiro.

### Chave
Árvore de eliminatória (oitavas → quartas → semis → final), não grade de cards.
Nomes grandes o suficiente para leitura a 3–4 m de uma TV.

### VS / Rodada
Tela cheia.
Quatro integrantes visíveis; os dois ativos em destaque.
**Tempo-alvo sempre enorme no centro, abaixo do VS.**
Placar e fase grandes.
Tempos reais ocultos até revelar.

### Resultado da rodada
Abaixo de cada dupla, o tempo atingido aparece **grande**.
Diferença pode ser secundária. Vencedor anunciado sem esconder o alvo.

### R3, vitória, campeã
Como a spec de produto: escolha de representante, dupla classificada + prêmio, campeã com fotos e R$500.

## Áudio WAV (locais)
- ui_confirm.wav
- fake_shuffle_tick.wav
- pair_reveal.wav
- bracket_shuffle.wav
- bracket_lock.wav
- vs_impact.wav
- timer_detected.wav
- round_reveal.wav
- round_win.wav
- tie.wav
- match_win.wav
- advance.wav
- champion.wav
- error.wav
- press_start.wav (abertura)

Áudio nunca bloqueia transição. Falha de arquivo = silêncio.
