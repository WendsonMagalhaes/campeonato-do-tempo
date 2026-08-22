# DO NOT INFER LAYOUT — REGRA OBRIGATÓRIA

Este patch existe porque a implementação anterior deixou decisões visuais para o agente.

A partir do v3:

## O agente NÃO pode
- estimar coordenadas;
- escolher margens visualmente;
- usar porcentagens para recortar sprite sheets;
- usar `background-position` em fighter sheets;
- renderizar fighter sheet inteiro;
- alterar proporção de portrait;
- renderizar bitmap por CSS background-position;
- usar logo Esperança como fallback de foto;
- importar assets de dentro da pasta do pacote aninhado;
- criar novos layouts com flex/grid "parecidos";
- substituir coordenadas por valores responsivos.

## O agente DEVE
- renderizar num canvas lógico fixo de **1920×1080**;
- escalar o canvas inteiro para o viewport;
- usar `docs/EXACT_SCREEN_GEOMETRY.json`;
- usar os fighters pré-recortados em `/assets/runtime/fighters/...`;
- usar os cursores pré-recortados em `/assets/runtime/cursors/{p1|p2}/{idle|move|lock|selected}_01..04.png`;
  - (legado triangular `/assets/runtime/ui/p*_*.png` está REJECTED na Formação das Duplas);
- usar FX pré-recortados em `/assets/runtime/fx/...`;
- usar `BitmapTextCanvas.tsx`;
- usar `PlayerPortrait.tsx`;
- instalar os assets reais em `public/assets`.

## Regra simples

**O agente implementa estado e eventos. O patch determina geometria e rendering.**
