import React from 'react'
import { Film, Quote, Clock, Sparkles, ImageOff } from 'lucide-react'

// Right panel: keyframe player + transcript quote + compact dual-bot status.
export default function EvidenceViewer({ evidence, keyStatus, fallbackFrame = '/frames/frame_0000.jpg' }) {
  // Broken/missing frame -> clean fallback image (guarded against loops).
  const handleImgError = (e) => {
    if (e.target.dataset.fb === '1') {
      e.target.style.display = 'none'
      e.target.parentElement?.querySelector('[data-testid="frame-placeholder"]')?.classList.remove('hidden')
      return
    }
    e.target.dataset.fb = '1'
    e.target.src = fallbackFrame
  }

  return (
    <aside
      data-testid="evidence-viewer"
      className="flex h-full flex-col gap-5 overflow-y-auto border-l border-[#2d2e30] bg-[#131314] p-5"
    >
      <div className="flex items-center gap-2">
        <Film size={16} className="text-[#a8c7fa]" />
        <h2 className="text-[12px] font-medium uppercase tracking-wider text-[#9aa0a6]">Visual Evidence</h2>
      </div>

      {evidence ? (
        <>
          <div className="relative overflow-hidden rounded-xl border border-[#2d2e30] bg-black">
            <div className="relative aspect-video w-full">
              <img
                data-testid="evidence-frame"
                src={evidence.frame}
                alt={`Keyframe at ${evidence.timestamp}`}
                onError={handleImgError}
                className="h-full w-full object-cover"
              />
              <div
                data-testid="frame-placeholder"
                className="absolute inset-0 hidden flex-col items-center justify-center gap-2 bg-[#1e1f20] text-[#5f6368]"
              >
                <ImageOff size={28} />
                <span className="text-[12px]">Frame unavailable</span>
              </div>
            </div>
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 font-mono text-[11px] text-[#a8c7fa] backdrop-blur">
              <Clock size={11} /> {evidence.timestamp}
            </div>
          </div>

          <div className="rounded-xl border border-[#2d2e30] bg-[#1e1f20] p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#9aa0a6]">
              <Quote size={12} className="text-gold" /> Transcript quote
            </div>
            <p data-testid="evidence-quote" className="text-[13px] leading-7 text-[#e3e3e3]">
              “{evidence.quote}”
            </p>
            <p data-testid="evidence-speaker" className="mt-2.5 text-[11px] font-medium text-[#a8c7fa]">
              — {evidence.speaker} · {evidence.source_file}
            </p>
          </div>
        </>
      ) : (
        <div
          data-testid="evidence-empty"
          className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#2d2e30] bg-[#1e1f20]/40 p-6 text-center"
        >
          <Film size={30} className="mb-2 text-[#3c3d3f]" />
          <p className="text-[13px] font-medium text-[#9aa0a6]">No frame selected</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#5f6368]">
            Tap a <span className="font-mono text-[#a8c7fa]">◷ timestamp</span> in any answer to load its keyframe.
          </p>
        </div>
      )}

      {/* Compact dual-bot status */}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 rounded-xl border border-[#2d2e30] bg-[#1e1f20] p-3 text-[10px]">
        <Sparkles size={12} className="text-gold" />
        <span
          data-testid="key-status-rag"
          className={`rounded px-1.5 py-0.5 ${keyStatus.rag ? 'bg-emerald-500/15 text-emerald-300' : 'bg-[#2d2e30] text-[#9aa0a6]'}`}
        >
          RAG {keyStatus.rag ? 'live' : 'offline'}
        </span>
        <span
          data-testid="key-status-sidekick"
          className={`rounded px-1.5 py-0.5 ${keyStatus.sidekick ? 'bg-amber-500/15 text-amber-300' : 'bg-[#2d2e30] text-[#9aa0a6]'}`}
        >
          Sidekick {keyStatus.sidekick ? 'live' : 'offline'}
        </span>
        <span className="rounded bg-[#2d2e30] px-1.5 py-0.5 font-mono text-[#9aa0a6]">{keyStatus.model}</span>
      </div>
    </aside>
  )
}
