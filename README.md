# AgLens 🔍
*An AI-native architecture thinking environment for software engineers.*

[![Tech Stack](https://img.shields.io/badge/Tech-React_|_TypeScript_|_Vite-blue.svg)](#)
[![State management](https://img.shields.io/badge/State-Zustand-yellow.svg)](#)
[![LLM](https://img.shields.io/badge/AI-Anthropic_Claude_3.7-purple.svg)](#)

Software engineers often use Large Language Models to brainstorm, design, and architect complex systems. However, in standard chat interfaces, crucial decisions, unverified constraints, and unexplored options get buried in massive chat histories. Turning a 50-message loose discussion into a structured Design Document is tedious and prone to missing context.

**AgLens solves this.** It pairs a conversational interface with an intelligent, auto-updating **Design Canvas**. As you discuss architecture with Claude, AgLens seamlessly extracts Problem Statements, Options, Decisions, and Constraints from the conversation in real-time, structuring them visually alongside your chat.

---

## 🌟 Key Features

- **Split-Pane Architecture Environment**: Chat on the left, watch your architectural state evolve on the right.
- **Real-Time Auto-Extraction**: Claude's outputs are parsed on-the-fly to automatically populate the Live Canvas—no manual copy-pasting required.
- **Interactive Canvas**: Add, edit, delete, or reorder any extracted element. Paste code snippets, diagram URLs, or reference notes directly into the canvas.
- **Traceability**: Click any canvas item to jump directly to the source message where the decision or option was discussed.
- **Crystallize to Markdown**: Done brainstorming? Click "Crystallize" to instantly auto-generate a polished High-Level Design (HLD) Document and a list of actionable implementation tasks.
- **BYOK (Bring Your Own Key)**: Privacy-first. Your interactions happen directly between your browser and Anthropic. All workspace data is persisted locally.

---

## 🛠️ Real-World Example: Designing a Rate Limiter

Imagine you need to design a distributed Rate Limiting service for a public API hitting 10k requests per second. 

1. **The Kickoff**: You prompt Claude, *"I need to design a distributed rate limiter for our API (10k RPS) using Redis and Node.js."*
2. **Auto-updating Canvas**: As Claude replies, AgLens instantly populates the Canvas for you:
   - **Problem Statement**: Design distributed rate limiter (10k RPS) to prevent API abuse.
   - **Constraints**: Must use Redis and Node.js.
   - **Options**: Token Bucket, Leaky Bucket, Fixed Window, Sliding Window Log.
3. **Making Decisions**: You reply, *"Let's go with Token Bucket for its flexibility, and we'll use Lua scripts in Redis to ensure atomicity. What about failover?"*
4. **Canvas Evolves**: The Canvas updates automatically without breaking your flow:
   - **Decisions**: Strategy = Token Bucket. Atomicity = Redis Lua scripts.
5. **Crystallizing**: After 20 messages of deep-dive architectural trade-offs, you click **Crystallize**. AgLens hands you a complete, formatted `DesignDoc.md` and a list of Jira-ready engineering tasks based exclusively on the settled canvas state.

---

## 🚀 Getting Started

AgLens is built as a fast, client-side web application. 

### Prerequisites
- Node.js (v18+)
- An [Anthropic API Key](https://console.anthropic.com/)

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Run the Development Server:**
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

3. **Connect to Claude:**
   - Enter your Anthropic API key (`sk-ant-...`) in the top navigation bar.
   - The default model is `claude-3-7-sonnet-latest`. 
   - Start chatting in the Conversation panel!

### Running Checks

To ensure code quality before submitting a PR:
```bash
npm run lint         # Run ESLint
npm run build        # Typecheck and build
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright end-to-end tests
```

---

## 🏗️ Technical Architecture

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **AI Integration**: Anthropic Messages API
- **Testing**: Vitest (Unit) + Playwright (E2E)

---

## ☁️ Deployment (Vercel)

AgLens is optimized for Vercel deployment out of the box. 

1. Push this repository to GitHub.
2. Import the project into Vercel.
3. Configure the following environment variables:
   - `VITE_USE_PROXY=true` *(Recommended to avoid browser CORS issues with Anthropic API)*
   - `VITE_ANTHROPIC_PROXY_URL=/api/anthropic`
4. Deploy! Vercel handles the build (`npm run build`, output to `dist`) and hosts the included `/api/anthropic` Edge Proxy to securely route LLM requests without exposing secrets.

---

## 📚 Project Documentation

Dive deeper into the planning and architecture of AgLens itself:
- [MVP Implementation Plan](./ARCHLENS_MVP_IMPLEMENTATION_PLAN.md)
- [Phase Tasks](./ARCHLENS_PHASE_TASKS.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)

---
*Built for engineers who love to architect.*
