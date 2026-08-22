# Canonical UI Plan

## Objetivo
Eliminar divergência visual causada por regeneração de telas completas.

A aplicação do Cursor deve tratar cada arte aprovada como um **componente gráfico reutilizável**.

## Componentes fechados
| Componente | Arquivo | Estado |
|---|---|---|
| Moldura de portrait | `assets/ui/portrait_frame_base.png` | FROZEN |
| VS | `assets/ui/vs_emblem.png` | FROZEN |
| Placar | `assets/ui/score_panel_base.png` | FROZEN |
| Placa de nome/texto | `assets/ui/name_plate_base.png` | FROZEN |
| Fonte small | `assets/fonts/glyphs/small/uXXXX.png` (v4) | FROZEN |
| Fonte medium | `assets/fonts/glyphs/medium/uXXXX.png` (v4) | FROZEN |
| Fonte large | `assets/fonts/glyphs/large/uXXXX.png` (v4) | FROZEN |

## Pendentes para a próxima sessão de imagem
1. `assets/ui/time_panel_base.png`
2. `assets/ui/phase_plate_base.png`
3. `assets/ui/selection_cursor.png`
4. `assets/ui/esperanca_retro_logo.png`

## Regra de implementação
Não importar uma imagem `battle_screen.png` como interface pronta.

Exemplo correto:
```tsx
<Stage background={stage} />
<Portrait photo={player.photo} frame="canonical" state="blue" />
<VSEmblem />
<NamePlate><BitmapText value={player.name} /></NamePlate>
<ScorePanel left={scoreA} right={scoreB} />
```

## Portrait
A foto fica abaixo da moldura.

```text
portrait-card
├── photo
├── optional-character-art / crop
├── canonical-frame
├── selection/winner glow (CSS)
└── dynamic name
```

A moldura nunca contém P1/P2, nome, foto, pontuação ou cor definitiva de equipe.

## Estados CSS
Estados não criam novos PNGs:
- neutral
- blue
- red
- selected
- locked
- winner
- eliminated
- disabled

## Bracket
Bracket é uma projeção do domínio e não um background.
As linhas SVG devem ser calculadas entre anchors dos cards.

Nunca:
- desenhar linhas à mão em PNG;
- criar slot sem oponente;
- conectar 3 times em um nó.

## Fontes
A fonte é sprite, não webfont.
Componente único `BitmapText` baseado em `FONT_METRICS_V4.json`.
Usar `image-rendering: pixelated`.


## BattleScene não é apenas UI canônica
Os componentes canônicos formam o HUD, mas a cena também deve usar sprites/FX definidos em `BATTLE_SCENE_SPEC.md`. Não reduzir a BattleScreen a composição de plates e portraits.
