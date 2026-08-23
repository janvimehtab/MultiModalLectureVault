import React, { useEffect, useRef, useState } from 'react'
import { MonitorPlay, Quote, Clock, Sparkles, VideoOff } from 'lucide-react'

// Convert "MM:SS" -> seconds, safely defaulting to 0 for invalid/empty input.
function toSeconds(stamp) {
  if (!stamp || typeof stamp !== 'string') return 0
  const m = stamp.match(/(\d{1,2}):(\d{2})/)
  if (!m) return 0
  const mins = parseInt(m[1], 10)
  const secs = parseInt(m[2], 10)
  if (Number.isNaN(mins) || Number.isNaN(secs)) return 0
  return mins * 60 + secs
}

// Right panel: "Lecture Sync" — HTML5 video that seeks to the cited timestamp,
// plus the transcript quote + speaker and a compact dual-bot status.
export default function EvidenceViewer({ evidence, keyStatus, videoSrc = '/lecture.mp4' }) {
  const videoRef = useRef(null)
  const [videoError, setVideoError] = useState(false)

  // Reset the error state whenever the source lecture video changes.
  useEffect(() => {
    setVideoError(false)
  }, [videoSrc])

  // On a new citation, seek the video to the exact mark and play.
  useEffect(() => {
    const v = videoRef.current
    if (!v || !evidence) return
    const target = toSeconds(evidence.timestamp)
    const seekAndPlay = () => {
      try {
        v.currentTime = target || 0
        const p = v.play()
        if (p && typeof p.catch === 'function') p.catch(() => {})
      } catch {
        /* seeking before metadata is fine; ignore */
      }
    }
    if (v.readyState >= 1) seekAndPlay()
    else v.addEventListener('loadedmetadata', seekAndPlay, { once: true })
  }, [evidence])

  return (
    <aside
      data-testid="evidence-viewer"
      className="flex h-full flex-col gap-5 overflow-y-auto border-l border-[#2d2e30] bg-[#131314] p-5"
    >
      <div className="flex items-center gap-2">
        <MonitorPlay size={16} className="text-[#a8c7fa]" />
        <h2 data-testid="lecture-sync-title" className="text-[12px] font-medium uppercase tracking-wider text-[#9aa0a6]">
          Lecture Sync
        </h2>
      </div>

      {/* Video player (always mounted so seeks are instant) */}
      <div className="relative overflow-hidden rounded-xl border border-[#2d2e30] bg-black">
        <div className="relative aspect-video w-full">
          {!videoError ? (
            <video
              key={videoSrc}
              ref={videoRef}
              data-testid="lecture-video"
              src={videoSrc}
              controls
              playsInline
              preload="metadata"
              onError={() => setVideoError(true)}
              className="h-full w-full bg-black object-contain"
            />
          ) : (
            <div
              data-testid="video-placeholder"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#1e1f20] to-[#131314] text-[#9aa0a6]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#a8c7fa]/10">
                <VideoOff size={22} className="text-[#a8c7fa]" />
              </div>
              <span className="text-[13px] font-medium text-[#e3e3e3]">Lecture Video Ready</span>
              <span className="text-[11px] text-[#5f6368]">Cited moments will sync here</span>
            </div>
          )}
          {evidence && (
            <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 font-mono text-[11px] text-[#a8c7fa] backdrop-blur">
              <Clock size={11} /> {evidence.timestamp}
            </div>
          )}
        </div>
      </div>

      {evidence ? (
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
      ) : (
        <div
          data-testid="evidence-empty"
          className="rounded-xl border border-dashed border-[#2d2e30] bg-[#1e1f20]/40 p-5 text-center"
        >
          <p className="text-[13px] font-medium text-[#9aa0a6]">No moment selected</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#5f6368]">
            Tap a <span className="font-mono text-[#a8c7fa]">◷ timestamp</span> in any answer to jump the video there.
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
