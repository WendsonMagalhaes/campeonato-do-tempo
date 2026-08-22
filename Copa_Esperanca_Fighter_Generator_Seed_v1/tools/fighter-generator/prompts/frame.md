# FIGHTER FRAME — PROMPT CANÔNICO

Use EXATAMENTE estas quatro referências de UM ÚNICO participante:
1. `fighter_master.png`: FONTE CANÔNICA de aparência do lutador.
2. `source_card.jpeg`: conferência de roupa/acessórios; não deve substituir o fighter master.
3. `face_master_360.png`: conferência auxiliar do rosto.
4. `templates/{FRAME}.png`: referência RÍGIDA apenas para a nova pose/movimento, escala, baseline e enquadramento.

OBJETIVO
Gerar somente `{FRAME}.png` como o MESMO personagem do `fighter_master.png`, mudando apenas o necessário para executar a pose do template `{FRAME}`.

REGRAS ABSOLUTAS
- Um participante por request e um frame por request.
- NÃO mudar roupa entre frames. Cores, tipo de roupa, acessórios, cabelo, barba/óculos e calçado devem permanecer coerentes com o master.
- NÃO reimaginar a pessoa nem criar uma nova versão estética a cada frame.
- NÃO copiar rosto/roupa do template. Do template, copiar apenas pose, movimento, footprint, baseline e escala.
- NÃO criar sprite sheet, collage, grid, variantes ou personagens extras.
- Fundo transparente; sem texto, moldura, HUD ou efeitos de fundo.
- Canvas exatamente 576x576 RGBA.
- Mesmo estilo 32-bit/pixel-art e mesma densidade visual do fighter master.
- Para `lying`, manter o mesmo personagem/roupa/cabelo deitado/KO; não transformar em outro personagem; cabelo EXATO do master.
- Para `hurt`, apenas reação de impacto; não adicionar ferimentos gráficos.
- Escala: mesmo footprint/altura do `fighter_master` / idle_01 em todos os frames.

CORPO / BRAÇOS — PADRÃO GLOBAL (DEFAULT PARA TODOS)
- Corpo NORMAL average: nem magro/skinny, nem musculoso/buff/ripped.
- Braços LISOS (smooth): superfície macia, sem definição de bíceps/tríceps/deltoides/antebraço, sem veias, sem cortes musculares.
- FORBIDDEN por padrão: physique de bodybuilder, braços de lutador musculoso, abs definidos.
- NÃO copiar musculatura do pose-ref (Dinarte/template) para o participante.

EXCEÇÃO EXPLÍCITA — DINARTE SOMENTE
- Somente `dinarte` pode manter braços/corpo musculosos.
- Para qualquer outro participante, ignore a musculatura do pose-ref.

CUSTOM INSTRUCTIONS FOR JAILSON:
For walk_01 frame: Enforce exact standard size/scale and bounding box as idle_01, do not shrink or enlarge. NO WATCH.
For attack and victory frames: Bare hands, NO GLOVES, bare skin on hands, visible fingers. NO WATCH.
PANTS HARD LOCK (all frames, especially victory): DARK blue denim matching idle_01 EXACTLY — NOT light-wash, NOT light blue, NOT faded sky-blue. Same dark medium/navy denim as idle_01.

SAÍDA
Exatamente um PNG transparente chamado `{FRAME}.png`.

FALHA SEGURA
Se `fighter_master.png` ainda não estiver APROVADO, não gere frames derivados.
