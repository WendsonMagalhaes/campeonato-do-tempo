# FIGHTER MASTER — PROMPT CANÔNICO

Use EXATAMENTE estas três referências para UM ÚNICO participante:
1. `source_card.jpeg`: fonte principal de roupa, cabelo, acessórios, proporções e identidade visual.
2. `face_master_360.png`: referência auxiliar do rosto/cabeça.
3. `templates/idle_01.png`: referência RÍGIDA de pose, escala no canvas, baseline e linguagem visual do sprite.

OBJETIVO
Criar somente o `fighter_master.png` desse participante, que também será o frame `idle_01` canônico.

REGRAS ABSOLUTAS
- Um participante por request. Nunca envie referências de duas pessoas no mesmo request.
- Um PNG por request. Nunca peça sprite sheet, collage, grid ou múltiplas opções.
- Manter A MESMA ROUPA observável em `source_card.jpeg`: mesmas cores principais, mesmo tipo de peça, calça/saia/vestido quando visível, calçado quando visível e acessórios relevantes.
- Não uniformizar participantes com polo verde, uniforme genérico ou roupa de outro participante.
- Não inventar armadura, espada, magia, capa, cajado, arma, roupa fantasy ou equipamento inexistente.
- Não adicionar texto, WDX, PLAYER, nome, stats, moldura, card ou fundo.
- Fundo: SOLID FLAT MAGENTA BACKGROUND (#FF00FF). NO SCENERY. NO FLOOR. NO SHADOW ON BACKGROUND. NO GRADIENT. NO TEXTURE. NO OBJECTS. NO FRAME. NO UI. CHARACTER COMPLETELY ISOLATED.
- Canvas final exatamente 576x576 RGBA.
- Reproduzir a POSE, ocupação do canvas, orientação e baseline do `idle_01.png`; não copiar a identidade/roupa do lutador-template.
- Linguagem visual: sprite 32-bit/pixel-art coerente com o template; evitar visual 3D/liso/fotorrealista.
- Preservar características visuais da pessoa da fonte. Não substituir por pessoa genérica.
- Se algum detalhe estiver ambíguo, simplifique sem inventar.

CORPO / BRAÇOS — PADRÃO GLOBAL (DEFAULT PARA TODOS)
- Corpo NORMAL average: nem magro/skinny, nem musculoso/buff/ripped.
- Braços LISOS (smooth): superfície macia, sem definição de bíceps/tríceps/deltoides/antebraço, sem veias, sem cortes musculares.
- FORBIDDEN por padrão: physique de bodybuilder, braços de lutador musculoso, abs definidos, ombros shredados.
- NÃO copiar musculatura do template de pose (Dinarte/template) para o participante.

EXCEÇÃO EXPLÍCITA — DINARTE SOMENTE
- Somente `dinarte` pode ter braços/corpo musculosos como característica especial.
- Para qualquer outro participante, musculatura do pose-ref é IGNORADA.

SAÍDA
Exatamente um PNG transparente: `fighter_master.png`.

FALHA SEGURA
Se a fonte do participante ou o template não estiverem disponíveis no request, NÃO gere uma pessoa aproximada. Marque o job como falha e pare.
