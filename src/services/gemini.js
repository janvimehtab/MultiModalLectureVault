// gemini.js — Isolated Gemini API handlers + offline fallback engine.
// Two strictly separated pipelines:
//   A) Grounded RAG bot   (temperature 0.0, zero-hallucination, cites JSON context)
//   B) Sidekick Tutor bot (temperature 0.7, general knowledge, glowing badge)
// If every network call fails (or no keys are set) we fall back to a local
// keyword search over sample_data.json and flag it as Offline Mode.

const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash'
const RAG_KEY = import.meta.env.VITE_GEMINI_RAG_KEY || ''
const RAG_KEY_BACKUP = import.meta.env.VITE_GEMINI_RAG_KEY_BACKUP || ''
const SIDEKICK_KEY = import.meta.env.VITE_GEMINI_SIDEKICK_KEY || ''

const ENDPOINT = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

const RAG_SYSTEM_PROMPT = (sampleData) =>
  `You are an academic retrieval engine. Answer the user's question using ONLY the provided JSON context.

CRITICAL GROUNDING RULES FOR CITATIONS:
1. Do NOT cite a timestamp or frame if it only contains the title, question heading, or topic intro (e.g., "What is Reflection?").
2. ALWAYS cite the exact timestamp/frame where the ACTUAL DEFINITION, FORMULA, or DIAGRAM EXPLANATION is presented.
3. If an explanation spans multiple frames, cite the primary frame containing the clearest visual diagram or definition.
4. If the query is not in the context, output EXACTLY: 'OUT_OF_SCOPE'.

Always include the supporting timestamps inline in [MM:SS] format so the student can jump to the exact evidence.

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
  const res = await fetch(ENDPOINT(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature },
    }),
  })

  if (!res.ok) {
    const err = new Error(`Gemini HTTP ${res.status}`)
    err.status = res.status
    throw err
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
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
  const scored = sampleData
    .map((item) => {
      const text = item.content.toLowerCase()
      let score = 0
      qTokens.forEach((t) => {
        if (text.includes(t)) score += 1
      })
      // prefer real explanatory transcript / notes over bare frame captions
      if (item.modality === 'video_frame_ocr') score -= 0.5
      return { item, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (scored.length === 0) {
    return {
      role: 'model',
      source: 'offline',
      text: `I couldn't find anything about that in the lecture material. Try asking about reflection, refraction, Snell's Law, or why windows look wavy.`,
    }
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
    text: `Here is the grounded evidence I found in the lecture material:\n\n${bullets}`,
  }
}

// ---------------------------------------------------------------------------
// Public API — orchestrates A -> B -> offline.
// ---------------------------------------------------------------------------
export async function askQuestion(question, history, sampleData, onStatus) {
  // No keys configured at all -> straight to offline mode.
  if (!RAG_KEY && !SIDEKICK_KEY) {
    onStatus?.('offline')
    return offlineSearch(question, sampleData)
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
    return offlineSearch(question, sampleData)
  }

  // Robust out-of-scope detection (spacing/case tolerant).
  const isOutOfScope = String(ragText).toUpperCase().includes('OUT_OF_SCOPE')

  if (!isOutOfScope) {
    return { role: 'model', source: 'grounded', text: ragText }
  }

  // ---- Pipeline B: sidekick tutor ----
  if (!SIDEKICK_KEY) {
    // No sidekick key: honestly report out of scope offline-style.
    onStatus?.('offline')
    return {
      role: 'model',
      source: 'offline',
      text: `That topic isn't covered in this lecture's material. (Add a Sidekick API key to get general-knowledge help.)`,
    }
  }

  try {
    onStatus?.('sidekick')
    const sideText = await callGemini({
      key: SIDEKICK_KEY,
      systemPrompt: SIDEKICK_SYSTEM_PROMPT,
      contents: toContents(history, question),
      temperature: 0.7,
    })
    return { role: 'model', source: 'sidekick', text: sideText }
  } catch (e) {
    console.warn('[LectureLens] Sidekick pipeline failed:', e.message)
    onStatus?.('offline')
    return offlineSearch(question, sampleData)
  }
}

export const keyStatus = {
  rag: Boolean(RAG_KEY),
  ragBackup: Boolean(RAG_KEY_BACKUP),
  sidekick: Boolean(SIDEKICK_KEY),
  model: MODEL,
}
