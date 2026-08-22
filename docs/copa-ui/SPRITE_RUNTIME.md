# SPRITE RUNTIME — DECISÃO V3

O runtime NÃO recorta mais os fighter sheets.

Este patch contém frames pré-extraídos e normalizados em canvas transparente
de 576×576, com anchor bottom-center.

Exemplos:

```text
/assets/runtime/fighters/male_blue/idle_01.png
/assets/runtime/fighters/male_red/attack.png
/assets/runtime/fighters/female_blue/lying.png
/assets/runtime/fighters/female_red/hurt_02.png
```

A escala relativa foi preservada a partir do sheet original.

## Por que
- elimina cálculo de crop no Cursor;
- elimina `background-position`;
- elimina diferença de proporção entre estados;
- mantém pés/ground contact alinhados pelo mesmo bottom anchor.

`SPRITE_ATLAS_COORDS.json` existe somente para rastreabilidade.

A implementação deve usar `FIGHTER_RUNTIME_MANIFEST.json` e
`FighterSprite.tsx`.

## Facing (hurt frames normalized right)

Most frames are authored facing **right**. Sheet hurt rows are authored
left-baked (fist enters from the LEFT); runtime hurt PNGs are flipped **once**
at extraction so ALL variants are right-baked (fist from the RIGHT, victim
recoils LEFT):

- `female_blue/hurt.png` — re-cropped + normalized (also removed ghost hand),
  `scripts/_normalize_female_blue_hurt.py`;
- `male_blue/hurt.png`, `male_red/hurt.png`, `female_red/hurt_01.png`,
  `female_red/hurt_02.png` — flipped 2026-08-15 via
  `scripts/_fix_battle_frames_and_crowd.py`.

With right-baked art the side mirror alone gives correct knockback on both
sides (blue victim unmirrored recoils left/away from red; red victim mirrored
recoils right/away from blue) and mirror stays constant across
hurt→fall→lying (no flicker). `shouldMirrorFighter(side, variant, anim)` still
compares desired vs baked facing so future left-baked rows can be registered.

Red always mirrors (art faces right → on-screen left).

## Placeholders corrigidos (2026-08-15)

`female_red/idle_02.png`, `female_red/hurt_02.png` e `female_red/lying.png`
eram placeholders no disco (cópias de idle_01/hurt_01 e do lying AZUL).
Re-extraídos do sheet vermelho via `scripts/_fix_battle_frames_and_crowd.py`
usando `SPRITE_ATLAS_COORDS.json`. Todos os quatro variantes usam idle de
2 frames (`idle_01`/`idle_02`, 3 fps).

