# AGENTS.md

## Commands

| Task                        | Command            |
| --------------------------- | --------------------|
| Dev server (LAN, port 5173) | `npm run dev`      |
| Build (typecheck + bundle)  | `npm run build`    |
| Preview production build    | `npm run preview`  |
| Type-check only             | `npx tsc --noEmit` |
| Lint check (Biome)          | `npm run lint`     |
| Format codebase (Biome)     | `npm run format`   |

## Rules
- Do not run `npm run build` or `npm run dev` unless asked.
- Keep behavior parity with the pre-migration (vanilla JS) app when refactoring.
- Mistral model is locked to `mistral-medium-2508`.

## Testing & Validation
No test runner configured — validate changes manually via `npm run dev` and visual check in browser.

## Structure
- **Standalone Vite single-page app** — entry point: `index.html` + `src/main.ts`.
- Source modules under `src/`: `types.ts`, `state.ts`, `csv.ts`, `crypto.ts`, `mistral.ts`, `game.ts`.
- Material Web and PapaParse are npm dependencies bundled by Vite (no CDN).

## Architecture
- **CSV import**: PapaParse-based preview + full parse into `state.rawRows/headerRow/dataRows`.
- **Game board**: drag & drop pointer events; cards map to `{rowId, colIndex}`; groups are correct when all slots share one row in the selected column order.
- **BYOK Mistral**: key stored in `localStorage` as `mistral_api_key` (plain) or `mistral_encrypted_key` (PBKDF2 + AES-GCM with user PIN/passphrase).
