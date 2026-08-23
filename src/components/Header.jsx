import React, { useRef, useState } from 'react'
import { FileVideo, FileAudio, FileText, UploadCloud, X, CheckCircle2 } from 'lucide-react'

// Minimal active-media bar + mock uploader (Gemini-style, decluttered).
export default function Header({ mediaSources, lecture }) {
  const [open, setOpen] = useState(false)
  const [uploaded, setUploaded] = useState(null)
  const fileRef = useRef(null)
  const accent = lecture?.accent || '#a8c7fa'

  const iconFor = (modality) => {
    if (modality.includes('video')) return FileVideo
    if (modality.includes('audio')) return FileAudio
    return FileText
  }

  return (
    <header
      data-testid="app-header"
      className="flex items-center justify-between gap-4 border-b border-[#2d2e30] bg-[#131314] px-4 py-2.5"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#a8c7fa]">
          <span className="text-[15px] font-black text-[#0b0b0c]">L</span>
        </div>
        <h1 className="text-[15px] font-semibold tracking-tight text-[#e3e3e3]">LectureLens</h1>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <span
          data-testid="active-lecture-chip"
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
          style={{ color: accent, backgroundColor: accent + '1a' }}
        >
          <span className="h-1.5 w-1.5 rounded-full animate-blink" style={{ backgroundColor: accent }} />
          {lecture?.title || 'Lecture'}
        </span>
        {mediaSources.slice(0, 3).map((m) => {
          const Icon = iconFor(m.modality)
          return (
            <span
              key={m.source_file}
              data-testid={`media-chip-${m.source_file}`}
              className="hidden items-center gap-1.5 rounded-full border border-[#2d2e30] bg-[#1e1f20] px-2.5 py-1 text-[11px] text-[#9aa0a6] lg:flex"
              title={`${m.count} segments`}
            >
              <Icon size={12} style={{ color: accent }} />
              {m.source_file}
            </span>
          )
        })}
      </div>

      <button
        data-testid="mock-upload-btn"
        onClick={() => setOpen(true)}
        title="Attach lecture media"
        className="flex items-center gap-2 rounded-lg border border-[#2d2e30] bg-[#1e1f20] px-3 py-1.5 text-[12px] font-medium text-[#e3e3e3] transition-colors hover:bg-white/5"
      >
        <UploadCloud size={15} style={{ color: accent }} />
        <span className="hidden sm:inline">Upload</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            data-testid="upload-modal"
            className="w-full max-w-md animate-fadeup rounded-2xl border border-[#2d2e30] bg-[#1e1f20] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#e3e3e3]">Attach lecture media</h3>
              <button
                data-testid="upload-modal-close"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-[#9aa0a6] hover:bg-white/5 hover:text-[#e3e3e3]"
              >
                <X size={16} />
              </button>
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-[#3c3d3f] bg-[#131314] px-4 py-8 text-center transition-colors hover:border-[#a8c7fa]/50 hover:bg-white/5"
            >
              <UploadCloud size={28} style={{ color: accent }} />
              <span className="text-sm font-medium text-[#e3e3e3]">Drop video, audio or notes</span>
              <span className="text-[11px] text-[#5f6368]">Demo only — ingestion is pre-processed</span>
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setUploaded(e.target.files?.[0]?.name)} data-testid="mock-file-input" />

            {uploaded && (
              <div
                data-testid="mock-upload-success"
                className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-300"
              >
                <CheckCircle2 size={14} />
                Queued <span className="font-medium">{uploaded}</span> (mock)
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
