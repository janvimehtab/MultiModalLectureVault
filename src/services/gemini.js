// gemini.js — Isolated Gemini API handlers + offline fallback engine.
// Two strictly separated pipelines:
//   A) Grounded RAG bot   (temperature 0.0, zero-hallucination, cites JSON context)
//   B) Sidekick Tutor bot (temperature 0.7, general knowledge, glowing badge)
// If every network call fails (or no keys are set) we fall back to a local
// keyword search over sample_data.json and flag it as Offline Mode.

const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.6-flash'
const RAG_KEY = import.meta.env.VITE_GEMINI_RAG_KEY || ''
const RAG_KEY_BACKUP = import.meta.env.VITE_GEMINI_RAG_KEY_BACKUP || ''
const SIDEKICK_KEY = import.meta.env.VITE_GEMINI_SIDEKICK_KEY || ''

const ENDPOINT = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

const RAG_SYSTEM_PROMPT = (ctx) =>
  `You are an academic retrieval engine. Answer the user's question using ONLY the provided JSON context.

The context is split into three modalities. Search ALL of them EQUALLY and weight them the same:
- "transcript"  (spoken lecture + on-screen slide/diagram text, each has an MM:SS timestamp)
- "audio_notes" (the student's recorded voice notes)
- "text_notes"  (the student's written summary notes)

CRITICAL GROUNDING & CITATION RULES:
1. Do NOT cite a timestamp/frame that only contains a title, question heading or topic intro (e.g., "What is Reflection?").
2. ALWAYS cite the exact place where the ACTUAL DEFINITION, FORMULA, or DIAGRAM EXPLANATION appears.
3. Explicitly label the SOURCE of every piece of evidence you use, inline, using these exact formats:
   - Transcript / slide: [Video Transcript @ MM:SS]  (always include the MM:SS timestamp)
   - Audio voice notes:  [Audio Notes]
   - Written summary notes: [Summary Notes]
4. If an explanation spans multiple moments, cite the primary one with the clearest definition or diagram.
5. Blend evidence from transcript, audio_notes AND text_notes when they each add something — do not rely on transcript alone.
6. STRICT: If the information is missing from ALL three sources, output EXACTLY: 'OUT_OF_SCOPE'. Never hallucinate, never blend in irrelevant notes to fake an answer.
7. Reply in plain prose only — do NOT wrap your answer in markdown code fences or JSON.

Context Data: ${JSON.stringify({
    transcript: ctx?.transcript || [],
    audio_notes: ctx?.audio_notes || [],
    text_notes: ctx?.text_notes || [],
  })}`

const SIDEKICK_SYSTEM_PROMPT = `You are a friendly, concise study tutor. The student's question was NOT found in their lecture material, so answer from your own general knowledge. Keep it short (2-4 sentences), accurate and encouraging. Do NOT invent lecture timestamps or citations.`

// Fetch timeout (ms) for every online request.
const FETCH_TIMEOUT = 10000

// Safely group the flat lecture DB into {transcript, audio_notes, text_notes},
// always returning arrays even if the input is missing/malformed.
function assembleContext(sampleData) {
  const data = Array.isArray(sampleData) ? sampleData : []
  return {
    transcript:
      data.filter((d) => d?.modality === 'video_transcript' || d?.modality === 'video_frame_ocr') || [],
    audio_notes: data.filter((d) => d?.modality === 'audio_notes') || [],
    text_notes: data.filter((d) => d?.modality === 'text_notes') || [],
  }
}

// Build the RAG system prompt from safe context; if nothing matched, tell the
// model there is no direct context so it cleanly returns OUT_OF_SCOPE.
function buildRagPrompt(sampleData) {
  const ctx = assembleContext(sampleData)
  const empty =
    (ctx.transcript || []).length === 0 &&
    (ctx.audio_notes || []).length === 0 &&
    (ctx.text_notes || []).length === 0
  const notice = empty
    ? '\n\nNOTE: No direct context match found. If you cannot answer strictly from the context above, output EXACTLY: OUT_OF_SCOPE.'
    : ''
  return RAG_SYSTEM_PROMPT(ctx) + notice
}

// Robustly turn any model output into clean plain text. Strips markdown code
// fences and, if the model returned JSON, pulls out a sensible text field.
// Never throws — falls back to the raw string.
function sanitizeText(raw) {
  if (raw == null) return ''
  let text = String(raw).trim()
  try {
    text = text
      .replace(/^```[a-zA-Z]*\s*/, '')
      .replace(/```$/, '')
      .trim()
    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
      try {
        const parsed = JSON.parse(text)
        const cand =
          parsed?.answer ?? parsed?.text ?? parsed?.response ?? parsed?.output ?? parsed?.content ?? null
        if (typeof cand === 'string' && cand.trim()) text = cand.trim()
      } catch {
        /* not valid JSON — keep the stripped text */
      }
    }
  } catch {
    return String(raw)
  }
  return text
}

// Convert chat history into Gemini "contents" format.
function toContents(history, question) {
  const contents = (history || [])
    .filter((m) => m.role === 'user' || m.role === 'model')
    .map((m) => ({ role: m.role, parts: [{ text: m.text }] }))
  contents.push({ role: 'user', parts: [{ text: question }] })
  return contents
}

async function callGemini({ key, systemPrompt, contents, temperature }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  let res
  try {
    res = await fetch(ENDPOINT(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature },
      }),
      signal: controller.signal,
    })
  } catch (e) {
    // Normalise abort/network errors so callers can detect timeouts.
    const err = new Error(e?.name === 'AbortError' ? 'Request timed out' : e?.message || 'Network error')
    err.name = e?.name === 'AbortError' ? 'AbortError' : 'NetworkError'
    err.isTimeout = e?.name === 'AbortError'
    throw err
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const err = new Error(`Gemini HTTP ${res.status}`)
    err.status = res.status
    throw err
  }

  const data = await res.json()
  const parts = data?.candidates?.[0]?.content?.parts || []
  const rawText = parts
    .filter((p) => p && p.thought !== true && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim()
  if (!rawText) throw new Error('Empty Gemini response')
  return sanitizeText(rawText)
}

// Pipeline A with automatic backup-key retry on rate limits.
async function runRag({ systemPrompt, contents }) {
  try {
    return await callGemini({ key: RAG_KEY, systemPrompt, contents, temperature: 0.0 })
  } catch (e) {
    if ((e.status === 429 || e.status === 403 || e.status === 500) && RAG_KEY_BACKUP) {
      return await callGemini({ key: RAG_KEY_BACKUP, systemPrompt, contents, temperature: 0.0 })
    }
    throw e
  }
}

// Pipeline B — tries the dedicated Sidekick key first, then gracefully falls
// back to the RAG keys so the tutor still answers if the Sidekick key is
// restricted/unauthorized (e.g. returns 403).
async function runSidekick({ contents }) {
  const keys = [...new Set([SIDEKICK_KEY, RAG_KEY, RAG_KEY_BACKUP].filter(Boolean))]
  let lastErr = new Error('No usable key for Sidekick')
  for (const key of keys) {
    try {
      return await callGemini({ key, systemPrompt: SIDEKICK_SYSTEM_PROMPT, contents, temperature: 0.7 })
    } catch (e) {
      lastErr = e
      console.warn(`[LectureLens] Sidekick key failed (HTTP ${e.status || '?'}), trying next…`)
    }
  }
  throw lastErr
}

// ---------------------------------------------------------------------------
// Offline fallback engine — local keyword search over the JSON database.
// ---------------------------------------------------------------------------
const STOP = new Set([
  'the', 'a', 'an', 'is', 'are', 'of', 'to', 'in', 'on', 'and', 'or', 'what',
  'how', 'why', 'when', 'does', 'do', 'it', 'this', 'that', 'for', 'with',
  'you', 'your', 'about', 'explain', 'show', 'me', 'tell', 'can', 'from',
])

function tokenize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

export function offlineSearch(query, sampleData) {
  const data = Array.isArray(sampleData) ? sampleData : []
  const qTokens = tokenize(query)
  const wordRe = (t) => new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')

  // Corpus-wide coverage: which distinct query words appear ANYWHERE in the
  // lecture (whole-word, so 'won' never matches 'wondered'). This keeps genuine
  // lecture questions in-scope even when the key definition and its supporting
  // detail live in separate segments.
  const matchedGlobal = new Set()
  data.forEach((item) => {
    const text = (item?.content || '').toLowerCase()
    qTokens.forEach((t) => {
      if (wordRe(t).test(text)) matchedGlobal.add(t)
    })
  })

  // Rank the best matching segments for the citations.
  const scored = data
    .map((item) => {
      const text = (item?.content || '').toLowerCase()
      const hits = qTokens.filter((t) => wordRe(t).test(text))
      let score = hits.length
      if (item?.modality === 'video_frame_ocr') score -= 0.5
      return { item, score, distinct: hits.length }
    })
    .filter((s) => s.distinct > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  // Out-of-scope only when almost nothing matches the lecture. Short queries
  // need at least 1 matching term; longer queries need at least 2 distinct
  // terms present in the material (guards "Who won the World Cup?").
  const need = qTokens.length <= 2 ? 1 : 2
  const outOfScope = qTokens.length === 0 || scored.length === 0 || matchedGlobal.size < need

  if (outOfScope) {
    return { role: 'model', source: 'offline', outOfScope: true, text: 'OUT_OF_SCOPE' }
  }

  const bullets = scored
    .map(({ item }) => {
      const stamp = /^\d{2}:\d{2}$/.test(item.timestamp) ? ` [${item.timestamp}]` : ''
      return `• "${item.content}" — ${item.speaker}${stamp}`
    })
    .join('\n')

  return {
    role: 'model',
    source: 'offline',
    outOfScope: false,
    text: `Here is the grounded evidence I found in the lecture material:\n\n${bullets}`,
  }
}

// Offline handler: grounded evidence, or route low-confidence queries to the
// Sidekick (Pipeline B) when reachable, else a clean out-of-scope message.
async function handleOffline(question, history, sampleData) {
  const res = offlineSearch(question, sampleData)
  if (!res.outOfScope) return res
  return sidekickOrCleanOOS(question, history)
}

// Try Pipeline B; if every key fails, return a clean out-of-scope message
// (never leak lecture bullets when the query was judged out of scope).
async function sidekickOrCleanOOS(question, history) {
  try {
    const sideText = await runSidekick({ contents: toContents(history, question) })
    return { role: 'model', source: 'sidekick', text: sideText }
  } catch (e) {
    console.warn('[LectureLens] Sidekick unavailable, returning clean OOS:', e.message)
    return {
      role: 'model',
      source: 'offline',
      text: "That topic isn't covered in this lecture's material. Try asking about the concepts, definitions or diagrams from the lecture.",
    }
  }
}

// ---------------------------------------------------------------------------
// Public API — orchestrates A -> B, with PER-REQUEST recovery.
// IMPORTANT: there is NO sticky global offline flag. Every call re-attempts the
// online pipelines fresh; any failure is handled for THAT response only.
// ---------------------------------------------------------------------------
export async function askQuestion(question, history, sampleData, onStatus) {
  const safeData = Array.isArray(sampleData) ? sampleData : []
  const contents = toContents(history, question)

  // No keys configured at all -> local engine (still evaluated per-request).
  if (!RAG_KEY && !RAG_KEY_BACKUP && !SIDEKICK_KEY) {
    onStatus?.('offline')
    return handleOffline(question, history, safeData)
  }

  // ---- Pipeline A: grounded RAG (fresh attempt on every request) ----
  try {
    onStatus?.('grounded')
    const ragText = await runRag({ systemPrompt: buildRagPrompt(safeData), contents })

    if (String(ragText).toUpperCase().includes('OUT_OF_SCOPE')) {
      // ---- Pipeline B: sidekick tutor (safe, never throws to the UI) ----
      onStatus?.('sidekick')
      return sidekickOrCleanOOS(question, history)
    }
    return { role: 'model', source: 'grounded', text: ragText }
  } catch (e) {
    console.warn('[LectureLens] Online RAG failed for THIS query only:', e.message)
    return recoverThisQuery(question, history, safeData, e, onStatus)
  }
}

// Recover a single failed online request WITHOUT locking the app offline.
async function recoverThisQuery(question, history, sampleData, err, onStatus) {
  const isTimeout = err?.isTimeout || err?.name === 'AbortError' || /timed out|timeout|abort/i.test(err?.message || '')

  // 1) Serve local grounded evidence so the student still gets a real,
  //    citation-rich answer for in-scope questions.
  const offline = offlineSearch(question, sampleData)
  if (!offline.outOfScope) {
    onStatus?.('offline')
    return offline
  }

  // 2) Out-of-scope locally -> try the Sidekick online (fresh, safe).
  try {
    onStatus?.('sidekick')
    const sideText = await runSidekick({ contents: toContents(history, question) })
    return { role: 'model', source: 'sidekick', text: sideText }
  } catch (e2) {
    // 3) Everything failed for THIS query -> friendly inline notice.
    //    (Next query will attempt online again — no sticky offline lock.)
    console.warn('[LectureLens] Full recovery failed for this query:', e2.message)
    onStatus?.(null)
    return {
      role: 'model',
      source: 'error',
      text: isTimeout
        ? 'Request timed out — please try again.'
        : 'Network error reaching the AI — please try again.',
    }
  }
}

export const keyStatus = {
  rag: Boolean(RAG_KEY),
  ragBackup: Boolean(RAG_KEY_BACKUP),
  sidekick: Boolean(SIDEKICK_KEY),
  model: MODEL,
}
