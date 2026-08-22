# ASSET INSTALLATION (canonical)

**Runtime SoT:** `app/public/assets/` — Vite serves `/assets/...` offline.  
Do not treat root `assets/` or pack folders as the runtime authority.

## Verify

From `app/`:

```bash
npm run assets:verify
```

## Optional merge from an archive

Non-destructive merge into public (only when importing leftovers):

```bash
npm run assets:install -- --source ../CAMINHO_DO_ARQUIVO
```

Without `--source`, install prints policy and exits (public is already SoT).

## Do not

- Serve from `Copa_Esperanca_Cursor_Pack/` or `audio_addon/` at runtime.
- Reintroduce a second runtime tree under root `assets/`.
- Hand-edit pack folders as live SoT.

## New assets

See `docs/ASSET_INTAKE.md` — paste/drop files into `app/public/assets/...`.
