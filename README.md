# ArchLens

ArchLens is an AI-native architecture thinking environment for software engineers.
You hold an architecture conversation with Claude, and the app continuously extracts
options, decisions, constraints, open questions, and references into a live design canvas.

## Current MVP Coverage

This repo now implements all planned MVP phases at functional baseline level:

1. Phase 1: resizable split layout, JSON export/import, delete-space confirmation.
2. Phase 2: streaming Claude responses, retry/regenerate, token window and cost tracking.
3. Phase 3: stronger extraction dedupe heuristics and extraction failure telemetry.
4. Phase 4: editable canvas (add/edit/delete/reorder), paste modal, references panel, jump links.
5. Phase 5: crystallize flow (design doc + tasks), copy and save actions.
6. Phase 6: onboarding sample space, accessibility-focused controls, unit/e2e tests.
7. Phase 7: OSS files, CI workflow, and Vercel deployment config.

## Tech Stack

- React + TypeScript + Vite
- Zustand state management
- Tailwind CSS
- Anthropic Messages API (BYOK)
- Vitest + Playwright

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Running Checks

```bash
npm run lint
npm run build
npm run test
npm run test:e2e
```

## Connect to Claude

1. Enter your Anthropic API key in the top bar (`sk-ant-...`).
2. Pick a model (`claude-3-7-sonnet-latest` by default).
3. Start chatting in the Conversation panel.

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import project into Vercel.
3. Configure environment variables:
   - `VITE_USE_PROXY=true` (recommended for production)
   - `VITE_ANTHROPIC_PROXY_URL=/api/anthropic`
4. Vercel uses `vercel.json` (`npm run build`, output `dist`) and the included `/api/anthropic` edge proxy.
5. Deploy `main` to production and PR branches to preview environments.

## Project Docs

- `/Users/rohithputha/Desktop/incubation/AgLens/ARCHLENS_MVP_IMPLEMENTATION_PLAN.md`
- `/Users/rohithputha/Desktop/incubation/AgLens/ARCHLENS_PHASE_TASKS.md`
- `/Users/rohithputha/Desktop/incubation/AgLens/CONTRIBUTING.md`
- `/Users/rohithputha/Desktop/incubation/AgLens/SECURITY.md`
# AgLens
