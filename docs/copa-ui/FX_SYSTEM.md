# FX System

## Assets
- `assets/fx/impact_fx_sheet.png`
- `assets/environment/cold_mist_sheet.png`
- `assets/environment/coldroom_environment_fx_sheet.png`
- `assets/sprites/crowd_sheet.png`

## Impacto
O efeito de impacto fica entre os dois fighters, exatamente no frame de contato. Deve acompanhar quem atacou; não é decoração fixa.

Sugestão de intensidade:
- round comum: light/medium impact;
- golpe que encerra confronto: heavy/KO impact + shake maior;
- champion: confetti/celebration FX, não KO FX repetido.

## Ambiente cold-room
Pode combinar:
- mist em loop;
- condensação/frost;
- flicker de fluorescente;
- cortina plástica em movimento suave;
- puddle/splash discreto.

Não ativar tudo em máxima intensidade ao mesmo tempo. Ambiente não pode competir com fighters/HUD.

## Crowd
**Battle (coldroom, Crowd Feature v2):** crowd is **baked into** the animated full-stage BG (`/assets/runtime/coldroom/background_swap/coldroom_bg_anim_f0*.png` via `ColdroomAnimatedBackground`). Do **not** mount `CrowdLayer` / `ground_group_*.png` overlays — those pixel clusters on the stairs and near the chair fought the photoreal mezanino. Cheer SFX still fires from battle timelines; there is no separate crowd sprite mood layer on battle.

**Legacy (retired):** railing-free `runtime/crowd/ground_group_*.png` groups were used on the floor strip before the full-BG pack; kept on disk only.

**CelebrationCrowd (Qualified/Champion):** Usa os assets de crowd de alta fidelidade em camadas do intro pack (`/assets/runtime/intro/crowd/layered/30_intro_crowd_foreground_frame_01.png` e `..._frame_02.png`), celebrantes **de costas** (waist-up), plantados no rodapé em foreground (z-index: 8, acima dos fighters, abaixo do HUD em z-index 10). Loop de animação sutil em 2 frames (~3.125 FPS / 320ms). Centro desobstruído para legibilidade de placar e troféus da praça.

## Celebration FX
Qualified/Champion: `CelebrationConfetti` blita `/assets/runtime/fx/confetti.png` (pré-extraído) com black-key, opacidade moderada e drift suave — fora da faixa do título/nameplate.

## Camera shake
Implementar como transformação temporária do container da cena; HUD pode ficar menos afetado para legibilidade.
