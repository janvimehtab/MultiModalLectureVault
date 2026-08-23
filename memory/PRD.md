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
- **Lecture Sync** right panel: HTML5 `<video src=/lecture.mp4>` that seeks to the cited
  timestamp and plays; invalid stamp → 0s; missing file → onError "Lecture Video Ready" placeholder.
  `public/lecture.mp4` (12MB) serves the default lecture; other lectures show the placeholder.
- **Continuous mic**: webkitSpeechRecognition continuous+interimResults, restarts through
  pauses until user toggles off, try/catch + graceful onerror (no freeze)
- **Multi-modal RAG prompt**: weights transcript/audio_notes/text_notes equally, source-labeled
  citations ([Video Transcript @ MM:SS] / [Audio Notes] / [Summary Notes]), OUT_OF_SCOPE if missing from all
- Dual-bot A (RAG) + B (Sidekick, glowing badge); Sidekick key 403 → falls back to RAG key
- Offline engine: whole-word (\b) + corpus-wide coverage classifier — legit lecture questions
  return grounded citations even when RAG is rate-limited (429); off-topic → OUT_OF_SCOPE (no leak)
- Clickable citations → seek video + quote/speaker; voice input; empty-send guard
- localStorage chats, auto-title, New Chat, delete, quick chips
- Multi-Lecture Vault (3 lectures) + Study Export (printable notes with cited frames)
- Tested iteration_1..5 (latest 6/7; remaining = headless H.264 codec limit + transient API 429, both env/quota, now gracefully handled)

## Known limits / Backlog
- User's VITE_GEMINI_SIDEKICK_KEY returns 403 (dead) — masked by RAG-key fallback; replace it
- RAG key hits intermittent 429 (quota) — handled via backup key + grounded-offline fallback
- P1: Image-query pipeline (currently mock attachment chip only)
