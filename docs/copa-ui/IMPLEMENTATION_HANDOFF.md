# Implementation Handoff — Copa Esperança v2

## Se o agente já começou usando o v1
Leia **primeiro** `AGENT_STOP_AND_REPLAN.md`. Não continue feature work às cegas e não descarte código válido antes do diff.

## Ordem obrigatória de leitura
1. `AGENT_STOP_AND_REPLAN.md` (quando aplicável)
2. `SDD_DECISIONS.md`
3. `BATTLE_SCENE_SPEC.md`
4. `SPRITE_SYSTEM.md`
5. `COMBAT_ANIMATION_STATE_MACHINE.md`
6. `FX_SYSTEM.md`
7. `AUDIO_SYSTEM.md`
8. `BATTLE_TIMELINE.md`
9. `SPRITE_MANIFEST.json`
10. `FX_MANIFEST.json`
11. `AUDIO_MANIFEST.json`
12. `UI_MANIFEST.json`
13. `SCREEN_LAYOUTS.json`
14. `CANONICAL_UI_PLAN.md`
15. `FONT_METRICS_V4.json` (substitui `FONT_METADATA.json`, revogado)
16. `ACCEPTANCE_TESTS_UI.md`
17. `PACKAGE_STATUS.md`

## Regra de precedência
`SDD_DECISIONS.md` e os documentos v2 acima prevalecem sobre especificações antigas e mockups anteriores em caso de conflito.

## Arquitetura visual
Telas públicas são composições de layers. `assets/screens/*` é **referência**, não implementação pronta.

```text
stage/background
  └─ environment FX
      └─ fighters / participant art
          └─ combat FX
              └─ canonical UI PNG components
                  └─ dynamic bitmap text
                      └─ runtime states / transitions
                          └─ synchronized audio cues
```

## Bloqueio específico da BattleScreen
Não considerar a batalha concluída se ela for apenas BG + HUD. Ela deve obrigatoriamente usar:
- dois fighters ativos (BLUE left / RED right);
- variante male/female explícita do participante;
- estados de sprite;
- `impact_fx_sheet.png` no contato;
- environment FX quando o stage os tiver;
- HUD canônico;
- integração com `AudioDirector`/timeline, mesmo enquanto os WAVs finais estiverem pendentes.

## Helpers de referência
- `src/ui/*` — UI canônica/bracket/bitmap font.
- `src/battle/battle-assets.ts`
- `src/battle/battle-state-machine.ts`
- `src/battle/battle-timeline.ts`
- `src/battle/AudioDirector.contract.ts`

## Antes de codificar após migrar do v1
Entregar um plano curto contendo: trabalho reaproveitável, conflitos, refatorações necessárias e ordem de execução.
