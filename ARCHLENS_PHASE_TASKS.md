# ArchLens Phase Tasks

Derived from `/Users/rohithputha/Desktop/incubation/AgLens/ARCHLENS_MVP_IMPLEMENTATION_PLAN.md`.

## Phase 1: App Shell + Data Model

- [x] DesignSpace and canvas domain types
- [x] Two-panel 55/45 baseline layout
- [x] Draggable divider
- [x] localStorage persistence
- [x] API key storage (BYOK)
- [x] New/list/switch design space controls
- [x] JSON export/import
- [x] Delete-space flow + confirmation

## Phase 2: Conversation Engine

- [x] Chat UI with message list + composer
- [x] Anthropic Messages API integration
- [x] System prompt + current canvas context
- [x] Message history persistence
- [x] Streaming assistant response rendering
- [x] Retry/regenerate controls
- [x] Token estimate + context warning UI
- [x] Usage/cost tracking in UI

## Phase 3: Auto-extraction Pipeline

- [x] Parse and hide `<design_extract>`
- [x] Update canvas from extraction payload
- [x] Link extracted elements to source message IDs
- [x] Dedupe with near-duplicate heuristics
- [x] Parse failure telemetry and failure log
- [x] Message-level extraction badges
- [x] Resolved/open question transitions

## Phase 4: Interactive Canvas + References

- [x] Inline edit for all major canvas sections
- [x] Manual add/delete controls per section
- [x] Reorder controls within sections
- [x] Option status cycle
- [x] Decision reopen flow
- [x] Paste modal (code/url/text) + labels
- [x] Expandable references section
- [x] Jump-to-conversation links from source-backed items

## Phase 5: Crystallize

- [x] Crystallize CTA + enablement checks
- [x] Dedicated crystallization prompt/response flow
- [x] Output modal tabs (Design Doc / Tasks)
- [x] Markdown rendering for design doc
- [x] Copy all markdown
- [x] Copy single task for agent handoff
- [x] Save crystallized output as `.md`

## Phase 6: Hardening + UX

- [x] Onboarding modal with sample space option
- [x] Keyboard-focus and semantic control pass
- [x] Unit tests for parsing and service fallback paths
- [x] Playwright smoke e2e test scaffold
- [x] Improved loading/error states for API actions

## Phase 7: OSS + Vercel Launch

- [x] `LICENSE`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`
- [x] Issue templates and PR template
- [x] CI workflow (lint/build/unit/e2e)
- [x] Vercel config (`vercel.json`)
- [x] Updated README with run/deploy instructions
