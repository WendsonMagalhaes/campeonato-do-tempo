# Spec index — canonical documentation map

**Docs SoT:** repo-root `docs/`.  
**Runtime media SoT:** `app/public/assets/` (Vite `/assets/...`).

Pack folders `Copa_Esperanca_Cursor_Pack/` and `audio_addon/` are **archives only**
(see their README pointers). Do not treat them as live authority.

## Authority order (game rules)

Per `AGENTS.md`:

1. `docs/DOMAIN_RULES.md`
2. `docs/PRODUCT_SPEC.md`
3. `docs/SDD.md`
4. `docs/SECURITY_GUARDRAILS.md`
5. Everything else in `docs/`

If two documents conflict on **championship rules**, stop and ask a human.
Do not invent rules.

## Document map

| Area | Canonical location | Notes |
| --- | --- | --- |
| Domain / product / SDD / security | `docs/*.md` (root of docs) | Highest authority for rules |
| Status / iteration log | `docs/STATUS.md`, `docs/ITERATION_LOG.md` | Required every iteration |
| Copa UI geometry, sprites, FX, battle timeline | `docs/copa-ui/` | Migrated from Cursor Pack |
| Bitmap font (única) | `docs/copa-ui/FONT_METRICS_V4.json` + `docs/copa-ui/BITMAP_RENDERER.md` | v4 TRUE TRANSPARENT; `docs/copa-ui/superseded/` está revogado |
| Audio production (music/SFX locks, timelines) | `docs/audio/` | Migrated from `audio_addon/` |
| Visual/audio product narrative | `docs/VISUAL_AUDIO_SPEC.md` | Complements `docs/audio/` + `docs/copa-ui/` |
| Asset intake policy | `docs/ASSET_INTAKE.md` | New chat files → `app/public/assets/` |
| Asset inventory (human) | `docs/ASSET_MANIFEST.md` | High-level paths |

## Superseded / moved

| Former path | Now |
| --- | --- |
| `Copa_Esperanca_Cursor_Pack/docs/*` | `docs/copa-ui/*` |
| `docs/copa-ui-runtime/*` | `docs/copa-ui/*` (folder is a redirect stub) |
| `audio_addon/docs/*` | `docs/audio/*` |
| Pack / addon media trees | `app/public/assets/` |
| Pack `runtime-assets/*` | `app/public/assets/runtime/` |
| Treating root `assets/` as runtime SoT | **Reverted** — root `assets/` is brand/participants/video only |
| Temporary `app/media/assets` + `publicDir: 'media'` | Workaround while `app/public` is Windows-locked (EPERM); restore to `public/assets` ASAP |

## Known non-conflicts (UI hybrid rule — human)

- **Team Formation** = structural screen PNG (`app/public/assets/screens/team_formation_variant_03.png`).
- **Opening / Versus / Round3 / Qualified / Champion / Bracket** = canonical **layers**.
- Screens under `screens/` are **reference / TF structural** only unless a human reopens that rule.

## Audio manifest note

- Prefer `docs/audio/audio_manifest.json` + `docs/audio/AUDIO_ASSET_LOCK.json` for curated music/SFX.
- `docs/copa-ui/AUDIO_MANIFEST.json` / `AUDIO_SYSTEM.md` are pack-era companions; if paths conflict with `docs/audio/`, **`docs/audio/` wins** for audio files. Domain rules still outrank both.
