# Pending Image Assets — próxima sessão

Gerar **somente estes 4 componentes isolados**. Não gerar telas.

## 1. `time_panel_base.png`
- PNG transparente.
- Sem palavras e sem números.
- Grande área central para `00:01:50`, `00:01:56`, etc. (`formatRaceTime` / MM:SS:CS) renderizados em runtime.
- Mesma família do `name_plate_base` e `score_panel_base`: dourado + navy escuro + acento verde.
- Arcade fighting-game 90s / pixel art.
- Não industrializar com canos, gelo ou ventiladores.

## 2. `phase_plate_base.png`
- PNG transparente.
- Uma placa horizontal vazia.
- Serve para OITAVAS, QUARTAS, SEMIFINAL, FINAL, ROUND 1, ROUND 2, ROUND 3.
- Texto nunca baked.
- Deve conversar visualmente com `name_plate_base`.
- Menos decoração, mais área útil.

## 3. `selection_cursor.png`
- PNG transparente.
- Apenas o highlight/cursor do character select.
- Deve caber em torno do portrait mini sem cobrir o rosto.
- Leitura forte em movimento.
- Verde/dourado canônico.
- Sem P1, P2, setas de controle ou texto.
- Animação será CSS: translate, pulse, lock flash.

## 4. `esperanca_retro_logo.png`
- Logo retro oficial da Esperança isolada.
- PNG transparente.
- Sem cenário, sem placa adicional, sem slogan inventado.
- Deve ser exatamente a versão retro aprovada; depois disso ela é congelada.

## Regra
Depois de aprovados, adicionar ao `UI_MANIFEST.json` como `FROZEN`.
A partir daí nenhum desses componentes pode ser regenerado dentro de outra tela.
