import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, Menu, X, Download } from 'lucide-react'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import SearchPanel from './components/SearchPanel.jsx'
import AnswerCard from './components/AnswerCard.jsx'
import EvidenceViewer from './components/EvidenceViewer.jsx'
import { LECTURES, getLecture } from './data/lectures.js'
import { askQuestion, keyStatus } from './services/gemini.js'
import { exportChatToPrint } from './services/exportNotes.js'

const STORAGE_KEY = 'lecturelens_chats_v1'
const LECTURE_KEY = 'lecturelens_active_lecture'

const uid = () => Math.random().toString(36).slice(2, 10)
const loadChats = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export default function App() {
  const [chats, setChats] = useState(loadChats)
  const [activeId, setActiveId] = useState(null)
  const [activeLectureId, setActiveLectureId] = useState(
    () => localStorage.getItem(LECTURE_KEY) || LECTURES[0].id,
  )
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const [evidence, setEvidence] = useState(null)
  const [mobileNav, setMobileNav] = useState(false)
  const scrollRef = useRef(null)
  const didInit = useRef(false)

  const lecture = getLecture(activeLectureId)
  const sampleData = lecture.data

  // Build a frame path + transcript quote for a MM:SS timestamp within the active lecture.
  const resolveEvidence = useCallback(
    (stamp) => {
      const frame = `${lecture.frameBase}/frame_${stamp.replace(':', '')}.jpg`
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
        source_file: best?.source_file || lecture.title,
      }
    },
    [lecture, sampleData],
  )

  const mediaSources = useMemo(() => {
    const map = {}
    sampleData.forEach((d) => {
      map[d.source_file] = map[d.source_file] || { source_file: d.source_file, modality: d.modality, count: 0 }
      map[d.source_file].count += 1
    })
    return Object.values(map)
  }, [sampleData])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  }, [chats])
  useEffect(() => {
    localStorage.setItem(LECTURE_KEY, activeLectureId)
  }, [activeLectureId])

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    if (chats.length) {
      setActiveId(chats[0].id)
      setActiveLectureId(chats[0].lectureId || LECTURES[0].id)
    } else {
      createChat(activeLectureId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeChat = chats.find((c) => c.id === activeId)
  const messages = activeChat?.messages || []

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, busy])

  function createChat(lectureId = activeLectureId) {
    const untitledCount = chats.filter((c) => c.title.startsWith('Untitled Chat')).length
    const chat = {
      id: uid(),
      title: `Untitled Chat ${untitledCount + 1}`,
      auto: true,
      lectureId,
      messages: [],
      createdAt: Date.now(),
    }
    setChats((prev) => [chat, ...prev])
    setActiveId(chat.id)
    setEvidence(null)
    return chat.id
  }

  const handleNew = () => {
    createChat(activeLectureId)
    setMobileNav(false)
  }

  const handleSelect = (id) => {
    setActiveId(id)
    const c = chats.find((x) => x.id === id)
    if (c?.lectureId) setActiveLectureId(c.lectureId)
    setEvidence(null)
    setMobileNav(false)
  }

  const handleSelectLecture = (id) => {
    setActiveLectureId(id)
    setEvidence(null)
    // Start a fresh thread bound to the newly selected lecture.
    createChat(id)
    setMobileNav(false)
  }

  const handleDelete = (id) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id)
      if (id === activeId) {
        setActiveId(next[0]?.id || null)
        if (next[0]?.lectureId) setActiveLectureId(next[0].lectureId)
      }
      return next
    })
  }

  const handleCite = (stamp) => setEvidence(resolveEvidence(stamp))

  const handleExport = () => {
    if (activeChat && messages.length) exportChatToPrint(activeChat, lecture, resolveEvidence)
  }

  const handleSend = useCallback(
    async (text) => {
      if (!text || busy) return
      const chatId = activeId || createChat(activeLectureId)
      const userMsg = { id: uid(), role: 'user', text }

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

      const firstStamp = String(reply.text).match(/(\d{2}:\d{2})/)
      if (firstStamp && reply.source !== 'sidekick') setEvidence(resolveEvidence(firstStamp[1]))

      setBusy(false)
      setStatus(null)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId, busy, chats, sampleData, activeLectureId, resolveEvidence],
  )

  const statusLabel = {
    grounded: 'Searching lecture media…',
    sidekick: 'Consulting AI Sidekick…',
    offline: 'Running offline keyword search…',
  }[status]

  return (
    <div className="app-backdrop flex h-screen flex-col overflow-hidden text-slate-200">
      <Header mediaSources={mediaSources} lecture={lecture} />

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[268px_1fr] xl:grid-cols-[268px_1fr_340px]">
        <div className="hidden md:block">
          <Sidebar
            chats={chats}
            activeId={activeId}
            lectures={LECTURES}
            activeLectureId={activeLectureId}
            onSelectLecture={handleSelectLecture}
            onNew={handleNew}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        </div>

        {mobileNav && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="w-72">
              <Sidebar
                chats={chats}
                activeId={activeId}
                lectures={LECTURES}
                activeLectureId={activeLectureId}
                onSelectLecture={handleSelectLecture}
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

        <main className="flex min-h-0 flex-col">
          {/* Canvas top bar: lecture + export */}
          <div className="flex items-center gap-2 border-b border-slate-800/60 px-4 py-2.5">
            <button
              data-testid="mobile-nav-btn"
              onClick={() => setMobileNav(true)}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 md:hidden"
            >
              <Menu size={16} />
            </button>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: lecture.accent }} />
            <span className="truncate text-[13px] font-medium text-slate-300">
              {activeChat?.title || lecture.title}
            </span>
            <span className="ml-auto flex items-center gap-3">
              <span className="hidden text-[11px] text-slate-500 sm:inline">{lecture.subject}</span>
              <button
                data-testid="export-btn"
                onClick={handleExport}
                disabled={!messages.length}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  messages.length
                    ? 'border-slate-700 bg-slate-800/70 text-slate-200 hover:border-gold/60 hover:text-gold'
                    : 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-600'
                }`}
                title="Export as printable revision notes"
              >
                <Download size={14} /> Export Notes
              </button>
            </span>
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
                  Grounded answers from <span style={{ color: lecture.accent }}>{lecture.title}</span> — video, audio &amp; notes.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {lecture.prompts.map((p, i) => (
                    <button
                      key={p}
                      data-testid={`quick-prompt-${i}`}
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

        <div className="hidden xl:block">
          <EvidenceViewer evidence={evidence} keyStatus={keyStatus} fallbackFrame={`${lecture.frameBase}/frame_0000.jpg`} />
        </div>
      </div>
    </div>
  )
}
