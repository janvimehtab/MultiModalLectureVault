# LectureLens — PRD & Progress

## Problem Statement
Build a high-performance Multimodal RAG Student Search Engine named **LectureLens** using
React, Vite, Tailwind CSS and Lucide Icons, built into the existing repo
`janvimehtab/MultiModalLectureVault` (pure client-side, no Express/Node server).

## Architecture
- **Vite + React 18** SPA at repo root (`/app`), served on port 3000.
- Preview note: `/app/frontend` is a gitignored self-symlink to `/app` so the supervisor
  `yarn start` (cwd `/app/frontend`) runs the root Vite app. Vite watcher ignores it (ELOOP guard).
- **State**: React state + `localStorage` (`lecturelens_chats_v1`). No backend, no DB.
- **Data**: `src/data/sample_data.json` (transcript / frames / audio / notes), `public/frames/*.jpg`.
- **Gemini**: direct client REST calls in `src/services/gemini.js`. Two isolated pipelines + offline engine.

## Components
- `Header.jsx` — active media status bar + mock uploader modal
- `Sidebar.jsx` — New Chat + localStorage recent chats
- `SearchPanel.jsx` — floating input bar (text / mic Web Speech / mock attach), send disabled when empty
- `AnswerCard.jsx` — user/AI/sidekick bubbles, regex citation pills `(\d{2}:\d{2})`
- `EvidenceViewer.jsx` — keyframe player w/ onError fallback to frame_0000.jpg + transcript quote
- `App.jsx` — orchestrator (chats, send flow, evidence resolution)

## Implemented (2026-06)
- Gemini-minimalist dark theme (black #131314 / card #1e1f20 / accent #a8c7fa), decluttered
- Collapsible left sidebar (272px ⇄ 72px icon rail) via PanelLeft toggle
- LIVE Gemini via user keys, model `gemini-3.6-flash` (thinking-part-safe extraction, 25s timeout)
- Dual-bot pipeline A (RAG, temp 0.0) + B (Sidekick, temp 0.7, glowing badge)
  - NOTE: user's dedicated SIDEKICK key returns HTTP 403 (unauthorized); Pipeline B
    gracefully falls back to the working RAG key(s) so the tutor still answers
- Strict out-of-scope: Pipeline A OUT_OF_SCOPE → Sidekick or clean OOS message (never leaks lecture text)
- Offline engine uses whole-word (\b) matching + ≥2 distinct hits to avoid false positives
- Clickable citations → keyframe + quote; broken-image onError fallback to lecture frame_0000.jpg
- Voice input (Web Speech + timeout fallback); empty-send guard
- localStorage chats, auto-title, New Chat, delete, quick-start chips
- Multi-Lecture Vault (`src/data/lectures.js`): 3 lectures with own data/frames/prompts/accent
- Study Export (`src/services/exportNotes.js`): printable revision notes with cited frames
- Tested: iteration_1..4 (latest 5/5 live-Gemini OOS retest 100%)

## Backlog / Next
- Replace the dead VITE_GEMINI_SIDEKICK_KEY (403) with a valid key; reflect real key status
- P1: Image-query pipeline (currently mock attachment chip only)
- P2: Nearest-available-frame matching for lectures with sparse frames
