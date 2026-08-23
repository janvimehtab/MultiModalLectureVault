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

const RAG_SYSTEM_PROMPT = (sampleData) =>
  `You are an academic retrieval engine. Answer the user's question using ONLY the provided JSON context.

The context contains multiple modalities. Search ALL of them EQUALLY and weight them the same:
- "video_transcript" (spoken lecture, has an MM:SS timestamp)
- "video_frame_ocr" (on-screen slide/diagram text, has an MM:SS timestamp)
- "audio_notes" (the student's recorded voice notes)
- "text_notes" (the student's written summary notes)

CRITICAL GROUNDING & CITATION RULES:
1. Do NOT cite a timestamp/frame that only contains a title, question heading or topic intro (e.g., "What is Reflection?").
2. ALWAYS cite the exact place where the ACTUAL DEFINITION, FORMULA, or DIAGRAM EXPLANATION appears.
3. Explicitly label the SOURCE of every piece of evidence you use, inline, using these exact formats:
   - Video transcript / slide: [Video Transcript @ MM:SS]  (always include the MM:SS timestamp)
   - Audio voice notes:        [Audio Notes]
   - Written summary notes:    [Summary Notes]
4. If an explanation spans multiple moments, cite the primary one with the clearest definition or diagram.
5. Blend evidence from transcript, audio_notes AND text_notes when they each add something — do not rely on transcript alone.
6. STRICT: If the information is missing from ALL sources (transcript, audio_notes AND text_notes), output EXACTLY: 'OUT_OF_SCOPE'. Never hallucinate, never blend in irrelevant notes to fake an answer.

Context Data: ${JSON.stringify(sampleData)}`

const SIDEKICK_SYSTEM_PROMPT = `You are a friendly, concise study tutor. The student's question was NOT found in their lecture material, so answer from your own general knowledge. Keep it short (2-4 sentences), accurate and encouraging. Do NOT invent lecture timestamps or citations.`

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
  const timer = setTimeout(() => controller.abort(), 25000)
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
  const text = parts
    .filter((p) => p && p.thought !== true && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')
    .trim()
  if (!text) throw new Error('Empty Gemini response')
  return text
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
  const qTokens = tokenize(query)
  const wordRe = (t) => new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')

  // Corpus-wide coverage: which distinct query words appear ANYWHERE in the
  // lecture (whole-word, so 'won' never matches 'wondered'). This keeps genuine
  // lecture questions in-scope even when the key definition and its supporting
  // detail live in separate segments.
  const matchedGlobal = new Set()
  sampleData.forEach((item) => {
    const text = item.content.toLowerCase()
    qTokens.forEach((t) => {
      if (wordRe(t).test(text)) matchedGlobal.add(t)
    })
  })

  // Rank the best matching segments for the citations.
  const scored = sampleData
    .map((item) => {
      const text = item.content.toLowerCase()
      const hits = qTokens.filter((t) => wordRe(t).test(text))
      let score = hits.length
      if (item.modality === 'video_frame_ocr') score -= 0.5
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
// Public API — orchestrates A -> B -> offline.
// ---------------------------------------------------------------------------
export async function askQuestion(question, history, sampleData, onStatus) {
  // No keys configured at all -> straight to offline mode.
  if (!RAG_KEY && !SIDEKICK_KEY) {
    onStatus?.('offline')
    return handleOffline(question, history, sampleData)
  }

  const contents = toContents(history, question)

  // ---- Pipeline A: grounded RAG ----
  let ragText
  try {
    onStatus?.('grounded')
    ragText = await runRag({
      systemPrompt: RAG_SYSTEM_PROMPT(sampleData),
      contents,
    })
  } catch (e) {
    console.warn('[LectureLens] RAG pipeline failed, using offline engine:', e.message)
    onStatus?.('offline')
    return handleOffline(question, history, sampleData)
  }

  // Robust out-of-scope detection (spacing/case tolerant).
  const isOutOfScope = String(ragText).toUpperCase().includes('OUT_OF_SCOPE')

  if (!isOutOfScope) {
    return { role: 'model', source: 'grounded', text: ragText }
  }

  // ---- Pipeline B: sidekick tutor (resilient across keys) ----
  // The query is out of scope: always return either a Sidekick answer or a
  // clean OOS message — never lecture bullets.
  onStatus?.('sidekick')
  return sidekickOrCleanOOS(question, history)
}

export const keyStatus = {
  rag: Boolean(RAG_KEY),
  ragBackup: Boolean(RAG_KEY_BACKUP),
  sidekick: Boolean(SIDEKICK_KEY),
  model: MODEL,
}
