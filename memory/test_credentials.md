# Test Credentials

LectureLens has **no authentication** — it is a fully client-side app.

- No login, no user accounts, no backend/database.
- Gemini API keys are optional (`.env`). With keys empty, the app runs in **Offline Mode**
  (local keyword search over `src/data/sample_data.json`) and is fully testable end-to-end.
- App URL (preview): served on port 3000 via `REACT_APP_BACKEND_URL` host.
