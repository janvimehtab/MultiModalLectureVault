import React from 'react'
import { Sparkles, BookOpenCheck, WifiOff, User } from 'lucide-react'

const CITATION_RE = /\[?\(?\s*(?:[\w.\- ]+@\s*)?(\d{2}:\d{2})\s*\)?\]?/g

function renderWithCitations(text, onCite) {
  const parts = []
  let last = 0
  let m
  let k = 0
  CITATION_RE.lastIndex = 0
  while ((m = CITATION_RE.exec(text)) !== null) {
    const matched = m[0]
    if (!/[[\](@)]/.test(matched)) continue
    if (m.index > last) parts.push(<span key={`t${k++}`}>{text.slice(last, m.index)}</span>)
    const stamp = m[1]
    parts.push(
      <button
        key={`c${k++}`}
        data-testid={`citation-${stamp.replace(':', '')}`}
        onClick={() => onCite(stamp)}
        className="citation-pill mx-0.5 inline-flex items-center gap-1 rounded-md border border-[#a8c7fa]/40 bg-[#a8c7fa]/15 px-1.5 py-0.5 align-middle font-mono text-[11px] font-medium text-[#a8c7fa] hover:bg-[#a8c7fa]/25"
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

  if (role === 'user') {
    return (
      <div data-testid="user-message" className="flex animate-fadeup justify-end">
        <div className="flex max-w-[80%] items-start gap-2.5">
          <div className="rounded-2xl rounded-tr-md bg-[#a8c7fa] px-4 py-2.5 text-[14px] leading-relaxed text-[#0b0b0c]">
            {text}
          </div>
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2d2e30] text-[#9aa0a6]">
            <User size={14} />
          </div>
        </div>
      </div>
    )
  }

  if (source === 'sidekick') {
    return (
      <div data-testid="sidekick-message" className="flex animate-fadeup justify-start">
        <div className="sidekick-glow max-w-[85%] animate-glowpulse rounded-2xl rounded-tl-md p-[1px]">
          <div className="rounded-2xl rounded-tl-md bg-[#1e1f20] px-4 py-3.5">
            <div
              data-testid="sidekick-badge"
              className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gradient-to-r from-amber-500/10 to-purple-500/10 px-2.5 py-1 text-[11px] font-semibold"
            >
              <Sparkles size={13} className="text-gold animate-blink" />
              <span className="shimmer-text animate-shimmer">✨ Suggested by AI (Outside Lecture Scope)</span>
            </div>
            <p className="whitespace-pre-wrap text-[14px] leading-7 text-[#e3e3e3]">{text}</p>
          </div>
        </div>
      </div>
    )
  }

  const isOffline = source === 'offline'
  return (
    <div data-testid="ai-message" className="flex animate-fadeup justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-[#2d2e30] bg-[#1e1f20] px-4 py-3.5">
        <div
          className={`mb-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            isOffline ? 'border border-gold/40 bg-gold/10 text-gold' : 'border border-[#a8c7fa]/30 bg-[#a8c7fa]/10 text-[#a8c7fa]'
          }`}
          data-testid={isOffline ? 'offline-badge' : 'grounded-badge'}
        >
          {isOffline ? <WifiOff size={12} /> : <BookOpenCheck size={12} />}
          {isOffline ? 'Retrieved grounded evidence (Offline Mode)' : 'Grounded in lecture'}
        </div>
        <p className="whitespace-pre-wrap text-[14px] leading-7 text-[#e3e3e3]">
          {renderWithCitations(text, onCite)}
        </p>
      </div>
    </div>
  )
}
