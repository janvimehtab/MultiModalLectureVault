import React, { useRef, useState } from 'react'
import { Radio, FileVideo, FileAudio, FileText, UploadCloud, X, CheckCircle2 } from 'lucide-react'

// Active media status bar + mock uploader.
export default function Header({ mediaSources, lecture }) {
  const [open, setOpen] = useState(false)
  const [uploaded, setUploaded] = useState(null)
  const fileRef = useRef(null)

  const handleMockUpload = (e) => {
    const f = e.target.files?.[0]
    if (f) setUploaded(f.name)
  }

  const iconFor = (modality) => {
    if (modality.includes('video')) return FileVideo
    if (modality.includes('audio')) return FileAudio
    return FileText
  }

  return (
    <header
      data-testid="app-header"
      className="flex items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-900/40 px-5 py-3 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
          <span className="text-lg font-black text-white">L</span>
        </div>
        <div className="leading-tight">
          <h1 className="text-[15px] font-bold tracking-tight text-slate-100">
            Lecture<span className="text-blue-400">Lens</span>
          </h1>
          <p className="text-[11px] text-slate-500">Multimodal RAG Study Engine</p>
        </div>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <span
          data-testid="active-lecture-chip"
          className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          style={{ borderColor: (lecture?.accent || '#3b82f6') + '55', color: lecture?.accent || '#3b82f6', backgroundColor: (lecture?.accent || '#3b82f6') + '14' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: lecture?.accent || '#3b82f6' }} />
          {lecture?.title || 'Lecture'}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
          <Radio size={12} className="animate-blink" />
          Media Active
        </span>
        {mediaSources.map((m) => {
          const Icon = iconFor(m.modality)
          return (
            <span
              key={m.source_file}
              data-testid={`media-chip-${m.source_file}`}
              className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-300"
              title={`${m.count} segments`}
            >
              <Icon size={12} className="text-blue-400" />
              {m.source_file}
              <span className="text-slate-500">· {m.count}</span>
            </span>
          )
        })}
      </div>

      <button
        data-testid="mock-upload-btn"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-[12px] font-medium text-slate-200 transition-colors hover:border-blue-500/60 hover:bg-slate-800"
      >
        <UploadCloud size={15} className="text-blue-400" />
        Upload Media
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            data-testid="upload-modal"
            className="w-full max-w-md animate-fadeup rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Attach lecture media</h3>
              <button
                data-testid="upload-modal-close"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-800/40 px-4 py-8 text-center transition-colors hover:border-blue-500/60 hover:bg-slate-800/70"
            >
              <UploadCloud size={28} className="text-blue-400" />
              <span className="text-sm font-medium text-slate-200">Drop video, audio or notes</span>
              <span className="text-[11px] text-slate-500">Demo only — ingestion is pre-processed</span>
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleMockUpload} data-testid="mock-file-input" />

            {uploaded && (
              <div
                data-testid="mock-upload-success"
                className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-300"
              >
                <CheckCircle2 size={14} />
                Queued <span className="font-medium">{uploaded}</span> (mock)
              </div>
            )}

            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
              This engine is pre-loaded with a fully cross-linked lecture database
              (transcript, keyframes, audio notes &amp; text notes). Uploads are simulated.
            </p>
          </div>
        </div>
      )}
    </header>
  )
}
