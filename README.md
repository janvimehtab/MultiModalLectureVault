# LectureLens — Multimodal RAG Student Search Engine

A high-performance, fully client-side study engine built with **React + Vite + Tailwind + Lucide**.
It answers questions grounded strictly in a pre-processed lecture (video transcript, keyframes,
audio notes and text notes) and shows the visual evidence for every answer.

## Highlights
- **3-column dark UI** (Slate `#0f172a` / `#1e293b`, Accent Blue `#3b82f6`, Amber `#f59e0b`)
- **Dual-bot pipeline**
  - Pipeline A — *Grounded RAG* (temperature 0.0, zero-hallucination, cites timestamps)
  - Pipeline B — *Sidekick Tutor* (temperature 0.7) for out-of-scope questions, shown in a glowing shimmering badge
- **Clickable timestamp citations** → load the matching keyframe + transcript quote in the evidence viewer
- **Voice input** via Web Speech API with graceful fallback
- **Recent chats** persisted to `localStorage`
- **Offline fallback engine** — local keyword search when the API is unavailable / no keys set

## Run locally
```bash
yarn install
cp .env.example .env   # paste your Gemini keys (optional — works in Offline Mode without them)
yarn dev               # http://localhost:3000
```

## Environment variables (Vite, client-side)
| Variable | Purpose |
| --- | --- |
| `VITE_GEMINI_RAG_KEY` | Pipeline A primary key |
| `VITE_GEMINI_RAG_KEY_BACKUP` | Pipeline A rate-limit fallback |
| `VITE_GEMINI_SIDEKICK_KEY` | Pipeline B key |
| `VITE_GEMINI_MODEL` | Model override (default `gemini-2.0-flash`) |

If no keys are provided the app runs entirely in **Offline Mode** using `src/data/sample_data.json`.

## Data
`src/data/sample_data.json` and `public/frames/*.jpg` are produced by the local ingestion
pipeline in `scripts/build_sample_data.py` (Whisper transcription + OpenCV keyframes).
