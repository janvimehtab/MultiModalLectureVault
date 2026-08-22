import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, Menu, X } from 'lucide-react'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import SearchPanel from './components/SearchPanel.jsx'
import AnswerCard from './components/AnswerCard.jsx'
import EvidenceViewer from './components/EvidenceViewer.jsx'
import sampleData from './data/sample_data.json'
import { askQuestion, keyStatus } from './services/gemini.js'

const STORAGE_KEY = 'lecturelens_chats_v1'
const QUICK_PROMPTS = [
  'What is reflection of light?',
  'Summarize audio notes',
  'Show ray diagram',
]

const uid = () => Math.random().toString(36).slice(2, 10)
const loadChats = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

// Build a frame path + transcript quote for a given MM:SS timestamp.
function resolveEvidence(stamp) {
  const frame = `/frames/frame_${stamp.replace(':', '')}.jpg`
  const toSec = (t) => {
    const [m, s] = t.split(':').map(Number)
    return m * 60 + s
  }
  const target = toSec(stamp)
  const transcripts = sampleData.filter(
    (d) => /^\d{2}:\d{2}$/.test(d.timestamp) && d.modality !== 'video_frame_ocr',
  )
  let best = null
  let bestDiff = Infinity
  transcripts.forEach((d) => {
    const diff = Math.abs(toSec(d.timestamp) - target)
    if (diff < bestDiff) {
      bestDiff = diff
      best = d
    }
  })
  return {
    frame,
    timestamp: stamp,
    quote: best?.content || 'Transcript segment for this frame.',
    speaker: best?.speaker || 'Lecturer',
    source_file: best?.source_file || 'lecture.mp4',
  }
}

export default function App() {
  const [chats, setChats] = useState(loadChats)
  const [activeId, setActiveId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // 'grounded' | 'sidekick' | 'offline'
  const [evidence, setEvidence] = useState(null)
  const [mobileNav, setMobileNav] = useState(false)
  const scrollRef = useRef(null)
  const didInit = useRef(false)

  // Media source summary for the header status bar.
  const mediaSources = useMemo(() => {
    const map = {}
    sampleData.forEach((d) => {
      map[d.source_file] = map[d.source_file] || { source_file: d.source_file, modality: d.modality, count: 0 }
      map[d.source_file].count += 1
    })
    return Object.values(map)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  }, [chats])

  // Ensure there is always an active thread (guarded against StrictMode double-mount).
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (chats.length) setActiveId(chats[0].id)
    else createChat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeChat = chats.find((c) => c.id === activeId)
  const messages = activeChat?.messages || []

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, busy])

  function createChat() {
    const untitledCount = chats.filter((c) => c.title.startsWith('Untitled Chat')).length
    const chat = {
      id: uid(),
      title: `Untitled Chat ${untitledCount + 1}`,
      auto: true,
      messages: [],
      createdAt: Date.now(),
    }
    setChats((prev) => [chat, ...prev])
    setActiveId(chat.id)
    setEvidence(null)
    return chat.id
  }

  const handleNew = () => {
    createChat()
    setMobileNav(false)
  }

  const handleSelect = (id) => {
    setActiveId(id)
    setEvidence(null)
    setMobileNav(false)
  }

  const handleDelete = (id) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id)
      if (id === activeId) setActiveId(next[0]?.id || null)
      return next
    })
  }

  const handleCite = (stamp) => setEvidence(resolveEvidence(stamp))

  const handleSend = useCallback(
    async (text, attachment) => {
      if (!text || busy) return
      const chatId = activeId || createChat()
      const userMsg = { id: uid(), role: 'user', text, attachment }

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c
          const isFirst = c.messages.length === 0
          return {
            ...c,
            title: isFirst && c.auto ? text.slice(0, 40) : c.title,
            auto: isFirst ? false : c.auto,
            messages: [...c.messages, userMsg],
          }
        }),
      )

      setBusy(true)
      setStatus('grounded')
      const history = (chats.find((c) => c.id === chatId)?.messages || []).map((m) => ({
        role: m.role,
        text: m.text,
      }))

      const reply = await askQuestion(text, history, sampleData, setStatus)
      const modelMsg = { id: uid(), ...reply }

      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, modelMsg] } : c)),
      )

      // Auto-load the first cited frame into the evidence viewer.
      const firstStamp = String(reply.text).match(/(\d{2}:\d{2})/)
      if (firstStamp && reply.source !== 'sidekick') setEvidence(resolveEvidence(firstStamp[1]))

      setBusy(false)
      setStatus(null)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId, busy, chats],
  )

  const statusLabel = {
    grounded: 'Searching lecture media…',
    sidekick: 'Consulting AI Sidekick…',
    offline: 'Running offline keyword search…',
  }[status]

  return (
    <div className="app-backdrop flex h-screen flex-col overflow-hidden text-slate-200">
      <Header mediaSources={mediaSources} />

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_340px]">
        {/* Left sidebar (desktop) */}
        <div className="hidden md:block">
          <Sidebar
            chats={chats}
            activeId={activeId}
            onNew={handleNew}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        </div>

        {/* Mobile sidebar drawer */}
        {mobileNav && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="w-72">
              <Sidebar
                chats={chats}
                activeId={activeId}
                onNew={handleNew}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            </div>
            <div className="flex-1 bg-slate-950/60" onClick={() => setMobileNav(false)}>
              <button className="m-3 rounded-lg bg-slate-800 p-2 text-slate-200">
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Center chat canvas */}
        <main className="flex min-h-0 flex-col">
          <div className="flex items-center gap-2 px-4 pt-3 md:hidden">
            <button
              data-testid="mobile-nav-btn"
              onClick={() => setMobileNav(true)}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200"
            >
              <Menu size={16} />
            </button>
            <span className="text-[13px] text-slate-400">{activeChat?.title}</span>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6" data-testid="chat-canvas">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-500/30">
                  <Sparkles size={26} className="text-white" />
                </div>
                <h2 className="max-w-md text-2xl font-bold tracking-tight text-slate-100 md:text-3xl">
                  What would you like to learn today?
                </h2>
                <p className="mt-2 text-[13px] text-slate-500">
                  Grounded answers from your lecture video, audio notes &amp; text notes.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      data-testid={`quick-prompt-${p.split(' ')[0].toLowerCase()}`}
                      onClick={() => handleSend(p)}
                      className="rounded-full border border-slate-700 bg-slate-800/60 px-4 py-2 text-[13px] text-slate-200 transition-colors hover:border-blue-500/60 hover:bg-slate-800 hover:text-blue-200"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {messages.map((m) => (
                  <AnswerCard key={m.id} message={m} onCite={handleCite} />
                ))}
                {busy && (
                  <div data-testid="typing-indicator" className="flex items-center gap-2 pl-1 text-slate-400">
                    <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2">
                      <span className="dot animate-blink" style={{ animationDelay: '0ms' }} />
                      <span className="dot animate-blink" style={{ animationDelay: '200ms' }} />
                      <span className="dot animate-blink" style={{ animationDelay: '400ms' }} />
                    </div>
                    <span className="text-[12px]">{statusLabel}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <SearchPanel onSend={handleSend} busy={busy} />
        </main>

        {/* Right evidence panel (desktop / large) */}
        <div className="hidden xl:block">
          <EvidenceViewer evidence={evidence} keyStatus={keyStatus} />
        </div>
      </div>
    </div>
  )
}
