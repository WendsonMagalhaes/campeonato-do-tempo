# Asset Manifest

**Runtime SoT:** `app/public/assets/` (URLs `/assets/...`).  
**Docs SoT:** `docs/`. Policy: `docs/ASSET_INTAKE.md`. Index: `docs/SPEC_INDEX.md`.

Root `assets/` holds only non-runtime project extras (brand reference, participant upload staging, video notes) — **not** the Vite media tree.

## Brand
- Root reference: `assets/brand/esperanca-logo-reference.jpeg`
- Runtime chrome: `app/public/assets/ui/esperanca_retro_logo.png`

## Participants
- uploads staging: `assets/participants/uploads/` (gitignored);
- runtime portraits served from app storage / public as configured by the app.

## Audio
Curated music/SFX under `app/public/assets/audio/`. Specs/locks: `docs/audio/`.

Legacy synthetic stubs from `app/scripts/generate-wavs.mjs` may still exist for
operator chrome; do not overwrite curated Copa files without human approval.
No proprietary franchise samples (`AGENTS.md`).

## Video
- `assets/video/` — optional local notes/clips (not required for Vite runtime)

## Backgrounds / screens / UI / sprites / runtime
All under `app/public/assets/`:
- `backgrounds/`, `screens/`, `ui/`, `sprites/`, `runtime/`, `fonts/`, `fx/`, `environment/`, `reference/`

## Hybrid UI
- Team Formation: structural `screens/team_formation_variant_03.png`
- Other telão scenes: layered composition

Assets must be owned/licensed and local (offline).
