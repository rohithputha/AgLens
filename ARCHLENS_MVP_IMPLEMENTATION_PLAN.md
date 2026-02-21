# ArchLens MVP Implementation Plan (OSS + Vercel)

## 1. Delivery Model

1. Use 8 phases over about 8 weeks.
2. Keep risk-first ordering: de-risk CORS, extraction reliability, and token economics before deeper UI polish.
3. Track each phase as a GitHub Milestone with a clear Definition of Done.
4. Ship weekly to Vercel Preview; release to production from `main` only.

## 2. Phase-wise Plan

### Phase 0 (Feb 23-27, 2026): Repo + Technical Spikes

**Goal:** De-risk unknowns before full feature development.

**Work:**

1. Initialize Vite + React + TypeScript + Tailwind + Zustand.
2. Add baseline quality stack: ESLint, Prettier, Vitest, Playwright.
3. Spike A: Anthropic direct browser call CORS validation.
4. Spike B: `<design_extract>` JSON reliability across 30+ prompt scenarios.
5. Spike C: token and cost simulation for 50-message design sessions.

**Deliverables:**

1. `README.md` with setup and architecture notes.
2. `docs/spikes.md` with findings and decisions.
3. `docs/adr/` with architecture decision records for unresolved tradeoffs.

**Done when:**

1. CORS path is decided: direct browser call vs minimal proxy.
2. Extraction parse-success target is defined (example: >=95% parseable responses).
3. Context summarization threshold is documented.

### Phase 1 (Mar 2-6, 2026): App Shell + Data Model

**Goal:** Build the working two-panel shell with persisted design spaces.

**Work:**

1. Implement `DesignSpace` model and Zustand slices.
2. Build 55/45 split layout and draggable divider.
3. Add space controls: create/list/switch/delete.
4. Persist design spaces and API key in localStorage.

**Deliverables:**

1. Usable shell with persistent design spaces.
2. Base JSON export/import plumbing.

**Done when:**

1. A user can create, switch, persist, export, and import spaces without a backend.

### Phase 2 (Mar 9-13, 2026): Conversation Engine

**Goal:** Reliable Claude chat with complete conversation context.

**Work:**

1. Build chat UI: stream/list/input/send/error/retry.
2. Implement Anthropic service abstraction.
3. Inject system prompt + conversation + design canvas context.
4. Add token estimation and context-window warning banner.

**Deliverables:**

1. End-to-end BYOK chat experience in browser.
2. Error handling for invalid key, rate limiting, and malformed responses.

**Done when:**

1. A 20-turn conversation works with save/reload continuity.

### Phase 3 (Mar 16-20, 2026): Auto-extraction Pipeline

**Goal:** Update the design canvas in real time from hidden extraction output.

**Work:**

1. Parse `<design_extract>` safely and remove it from visible assistant output.
2. Implement extraction merge logic with dedupe and source message linking.
3. Add fallback handling for malformed extraction blocks.
4. Add per-message contribution badges (decision/constraint/question).

**Deliverables:**

1. Automatic population of Problem Statement, Options, Decisions, Constraints, and Open Questions.

**Done when:**

1. Canvas updates are stable and parse failures recover gracefully.

### Phase 4 (Mar 23-27, 2026): Interactive Canvas + References

**Goal:** Make the canvas fully editable and operational for real workflows.

**Work:**

1. Inline edit/add/delete/reorder across all canvas sections.
2. Option status controls and decision reopen flow.
3. Paste modal for code snippets, URLs, and notes with labels.
4. Click-to-conversation linking from canvas items to source messages.

**Deliverables:**

1. Full interaction loop: explore, decide, revise.
2. Reference panel with expandable stored content.

**Done when:**

1. Users can complete multi-turn design sessions without losing context fidelity.

### Phase 5 (Mar 30-Apr 3, 2026): Crystallize

**Goal:** Generate design doc and implementation tasks from a complete design space.

**Work:**

1. Add Crystallize action, enablement rules, and confirmation.
2. Implement crystallization prompt and response schema.
3. Build output panel with tabs: Design Doc and Tasks.
4. Add copy-all markdown, copy single task, and save `.md`.

**Deliverables:**

1. Complete artifact pipeline from conversation to agent-ready tasks.

**Done when:**

1. Users can crystallize, review, and export from one flow.

### Phase 6 (Apr 6-10, 2026): Hardening + UX Polish

**Goal:** Raise MVP to production quality.

**Work:**

1. Add onboarding with sample design space.
2. Improve performance for large spaces and long chats.
3. Run accessibility pass: keyboard nav, focus management, ARIA labels.
4. Expand test coverage for parsing edge cases and core workflows.

**Deliverables:**

1. Stability and usability baseline ready for OSS users.

**Done when:**

1. Core flows pass CI and E2E checks on preview deployments.

### Phase 7 (Apr 13-17, 2026): OSS + Vercel Launch

**Goal:** Public launch with strong OSS hygiene and deployability.

**Work:**

1. Add OSS governance docs:
   - `LICENSE` (MIT recommended for MVP traction)
   - `CONTRIBUTING.md`
   - `CODE_OF_CONDUCT.md`
   - `SECURITY.md`
2. Add issue templates, PR template, and repository labels.
3. Configure Vercel project with preview and production workflows.
4. Publish launch-ready `README.md` with demo GIF and architecture overview.

**Done when:**

1. New contributors can clone, run, and deploy using documented steps.

## 3. Vercel Deployment Blueprint

1. Deploy as static Vite app on Vercel by default.
2. If Anthropic browser CORS fails, add a minimal Vercel Edge proxy that only forwards requests and stores no prompt data.
3. Environment variables:
   - `VITE_APP_NAME`
   - `VITE_DEFAULT_MODEL`
   - `VITE_USE_PROXY` (`true` or `false`)
   - `ANTHROPIC_PROXY_BASE_URL` (only when proxy mode is enabled)
4. CI gates before production:
   - Typecheck
   - Lint
   - Unit tests
   - Playwright smoke test
5. Branch strategy:
   - `main` -> production
   - feature branches -> Vercel previews

## 4. OSS Execution Structure (GitHub)

1. Milestones:
   - `P0-Spikes`
   - `P1-Shell`
   - `P2-Chat`
   - `P3-Extraction`
   - `P4-Canvas`
   - `P5-Crystallize`
   - `P6-Hardening`
   - `P7-Launch`
2. Labels:
   - `area:chat`
   - `area:canvas`
   - `area:crystallize`
   - `area:infra`
   - `type:bug`
   - `type:feature`
   - `good-first-issue`
   - `help-wanted`
3. Weekly tags from alpha to release:
   - `v0.1.0-alpha.1` ... `v0.1.0`
4. PR checklist requirements:
   - Tests updated
   - Docs updated
   - No secrets committed
   - Accessibility reviewed for UI changes

## 5. Immediate Next Actions

1. Create GitHub milestones and seed issues from this phase plan.
2. Run Phase 0 spikes first and lock decisions on CORS and extraction fallback.
3. Start Phase 1 only after ADRs capture spike outcomes.
