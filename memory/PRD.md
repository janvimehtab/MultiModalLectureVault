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
- 3-column responsive dark UI (spec theme) with glow/shimmer animations
- Dual-bot pipeline A (RAG, temp 0.0, backup-key retry) + B (Sidekick, temp 0.7, glowing badge)
- Robust OUT_OF_SCOPE detection (`.toUpperCase().includes`)
- Offline keyword-search fallback with "Offline Mode" badge
- Clickable timestamp citations → keyframe + quote in evidence viewer, broken-image fallback
- Voice input with unsupported/denied fallback; empty-send guard
- localStorage chat history, auto-title from first query, New Chat, delete, quick-start chips

## Backlog / Next
- P1: Image-query pipeline (currently mock attachment chip only)
- P2: Multi-lecture library / switching
- P2: Export chat as study notes
