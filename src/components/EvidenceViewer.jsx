import React from 'react'
import { Film, Quote, Clock, Sparkles, ImageOff } from 'lucide-react'

// Right panel: keyframe photo player + transcript quote viewer + sidekick info card.
export default function EvidenceViewer({ evidence, keyStatus }) {
  const handleImgError = (e) => {
    // Broken/missing frame -> fall back to frame_0000.jpg (guarded once).
    if (!e.target.dataset.fallback) {
      e.target.dataset.fallback = '1'
      e.target.src = '/frames/frame_0000.jpg'
    } else {
      e.target.dataset.fallback = '2'
      e.target.style.display = 'none'
      e.target.parentElement?.querySelector('[data-testid="frame-placeholder"]')?.classList.remove('hidden')
    }
  }

  return (
    <aside
      data-testid="evidence-viewer"
      className="flex h-full flex-col gap-4 overflow-y-auto border-l border-slate-800/80 bg-slate-900/30 p-4 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2">
        <Film size={16} className="text-blue-400" />
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-300">
          Visual Evidence
        </h2>
      </div>

      {evidence ? (
        <>
          <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
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
                className="absolute inset-0 hidden flex-col items-center justify-center gap-2 bg-slate-900 text-slate-500"
              >
                <ImageOff size={28} />
                <span className="text-[12px]">Frame unavailable</span>
              </div>
            </div>
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 font-mono text-[11px] text-blue-300 backdrop-blur">
              <Clock size={11} /> {evidence.timestamp}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              <Quote size={12} className="text-gold" /> Transcript quote
            </div>
            <p data-testid="evidence-quote" className="text-[13px] leading-relaxed text-slate-200">
              “{evidence.quote}”
            </p>
            <p data-testid="evidence-speaker" className="mt-2 text-[11px] font-medium text-blue-400">
              — {evidence.speaker} · {evidence.source_file}
            </p>
          </div>
        </>
      ) : (
        <div
          data-testid="evidence-empty"
          className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-6 text-center"
        >
          <Film size={30} className="mb-2 text-slate-600" />
          <p className="text-[13px] font-medium text-slate-400">No frame selected</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
            Click any <span className="font-mono text-blue-400">◷ timestamp</span> pill in an answer
            to load the matching keyframe and transcript here.
          </p>
        </div>
      )}

      {/* AI Sidekick info card */}
      <div className="mt-auto rounded-xl border border-gold/25 bg-gradient-to-br from-amber-500/[0.06] to-purple-500/[0.06] p-3">
        <div className="mb-1 flex items-center gap-1.5">
          <Sparkles size={13} className="text-gold" />
          <span className="text-[12px] font-semibold text-slate-200">Dual-Bot Engine</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          <span className="text-blue-300">Grounded RAG</span> answers strictly from your lecture.
          When a question falls outside scope, the glowing{' '}
          <span className="text-gold">Sidekick Tutor</span> steps in with general knowledge.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
          <span
            data-testid="key-status-rag"
            className={`rounded px-1.5 py-0.5 ${keyStatus.rag ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/60 text-slate-400'}`}
          >
            RAG {keyStatus.rag ? 'live' : 'offline'}
          </span>
          <span
            data-testid="key-status-sidekick"
            className={`rounded px-1.5 py-0.5 ${keyStatus.sidekick ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-700/60 text-slate-400'}`}
          >
            Sidekick {keyStatus.sidekick ? 'live' : 'offline'}
          </span>
          <span className="rounded bg-slate-700/60 px-1.5 py-0.5 font-mono text-slate-400">{keyStatus.model}</span>
        </div>
      </div>
    </aside>
  )
}
