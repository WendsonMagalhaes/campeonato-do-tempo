# Para agente que já começou com o pacote v1

**Pare a implementação de novas features antes de continuar. Não apague trabalho válido.**

O pacote v1 subespecificava a cena de batalha e omitia os sprites RED. Este v2 corrige isso.

## Procedimento
1. Faça `git status` e preserve alterações atuais.
2. Leia este arquivo e depois, nesta ordem:
   - `SDD_DECISIONS.md`
   - `BATTLE_SCENE_SPEC.md`
   - `SPRITE_SYSTEM.md`
   - `COMBAT_ANIMATION_STATE_MACHINE.md`
   - `FX_SYSTEM.md`
   - `AUDIO_SYSTEM.md`
   - `BATTLE_TIMELINE.md`
   - `SPRITE_MANIFEST.json`
   - `FX_MANIFEST.json`
   - `AUDIO_MANIFEST.json`
   - `SCREEN_LAYOUTS.json`
   - `UI_MANIFEST.json`
3. Compare o código já feito com o v2.
4. Reaproveite o que estiver compatível.
5. Antes de continuar implementando, reporte:
   - código aproveitável;
   - código que conflita com v2;
   - arquivos/telas que precisam ser refeitos;
   - plano de migração em ordem.

## Bloqueio de aprovação
Não considerar `BattleScreen` pronta se ela não renderizar stage + 2 fighters + estados de animação + FX + HUD e não possuir pontos de integração para a timeline de áudio.
