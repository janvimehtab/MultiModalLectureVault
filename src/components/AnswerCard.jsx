import React from 'react'
import { Sparkles, BookOpenCheck, WifiOff, User } from 'lucide-react'

// Matches [00:30], (00:30), [lecture.mp4 @ 00:30] etc. and captures the MM:SS.
const CITATION_RE = /\[?\(?\s*(?:[\w.\- ]+@\s*)?(\d{2}:\d{2})\s*\)?\]?/g

function renderWithCitations(text, onCite) {
  const parts = []
  let last = 0
  let m
  let k = 0
  CITATION_RE.lastIndex = 0
  while ((m = CITATION_RE.exec(text)) !== null) {
    // Only treat as a citation when a real bracket/paren wraps the stamp,
    // so plain sentence numbers aren't accidentally pilled.
    const matched = m[0]
    const hasWrapper = /[[\](@)]/.test(matched)
    if (!hasWrapper) continue
    if (m.index > last) parts.push(<span key={`t${k++}`}>{text.slice(last, m.index)}</span>)
    const stamp = m[1]
    parts.push(
      <button
        key={`c${k++}`}
        data-testid={`citation-${stamp.replace(':', '')}`}
        onClick={() => onCite(stamp)}
        className="citation-pill mx-0.5 inline-flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-500/15 px-1.5 py-0.5 align-middle font-mono text-[11px] font-medium text-blue-300 hover:bg-blue-500/30"
        title="View keyframe evidence"
      >
        ◷ {stamp}
      </button>,
    )
    last = m.index + matched.length
  }
  if (last < text.length) parts.push(<span key={`t${k++}`}>{text.slice(last)}</span>)
  return parts.length ? parts : [<span key="whole">{text}</span>]
}

export default function AnswerCard({ message, onCite }) {
  const { role, text, source } = message

  // User bubble
  if (role === 'user') {
    return (
      <div data-testid="user-message" className="flex animate-fadeup justify-end">
        <div className="flex max-w-[80%] items-start gap-2">
          <div className="rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-lg shadow-blue-600/20">
            {text}
          </div>
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-300">
            <User size={14} />
          </div>
        </div>
      </div>
    )
  }

  // Sidekick (out-of-scope) — glowing amber/purple badge card.
  if (source === 'sidekick') {
    return (
      <div data-testid="sidekick-message" className="flex animate-fadeup justify-start">
        <div className="sidekick-glow max-w-[85%] animate-glowpulse rounded-2xl rounded-tl-sm p-[1px]">
          <div className="rounded-2xl rounded-tl-sm bg-slate-900/90 px-4 py-3">
            <div
              data-testid="sidekick-badge"
              className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gradient-to-r from-amber-500/10 to-purple-500/10 px-2.5 py-1 text-[11px] font-semibold"
            >
              <Sparkles size={13} className="text-gold animate-blink" />
              <span className="shimmer-text animate-shimmer">
                ✨ Suggested by AI (Outside Lecture Scope)
              </span>
            </div>
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-200">{text}</p>
          </div>
        </div>
      </div>
    )
  }

  // Grounded RAG or Offline answer — dark slate card.
  const isOffline = source === 'offline'
  return (
    <div data-testid="ai-message" className="flex animate-fadeup justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-700/80 bg-slate-800/70 px-4 py-3 shadow-lg shadow-black/20">
        <div
          className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isOffline
              ? 'border border-gold/40 bg-gold/10 text-gold'
              : 'border border-blue-500/30 bg-blue-500/10 text-blue-300'
          }`}
          data-testid={isOffline ? 'offline-badge' : 'grounded-badge'}
        >
          {isOffline ? <WifiOff size={12} /> : <BookOpenCheck size={12} />}
          {isOffline ? 'Retrieved grounded evidence (Offline Mode)' : 'Grounded in lecture media'}
        </div>
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-200">
          {renderWithCitations(text, onCite)}
        </p>
      </div>
    </div>
  )
}
