import React, { useEffect, useRef, useState } from 'react'
import { Plus, Mic, Send, Image as ImageIcon, X, MicOff } from 'lucide-react'

// Text + Voice + Image query input bar (Gemini-style floating bottom bar).
export default function SearchPanel({ onSend, busy }) {
  const [value, setValue] = useState('')
  const [listening, setListening] = useState(false)
  const [attachMenu, setAttachMenu] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const recogRef = useRef(null)
  const taRef = useRef(null)

  const canSend = value.trim().length > 0 && !busy

  const autosize = () => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }
  useEffect(autosize, [value])

  const submit = () => {
    if (!canSend) return
    onSend(value.trim(), attachment)
    setValue('')
    setAttachment(null)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  // Mic — Web Speech API with graceful fallback to a simulated prompt.
  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setValue((v) => (v ? v + ' ' : '') + 'What is the reflection of light?')
      return
    }
    if (listening) {
      recogRef.current?.stop()
      return
    }
    try {
      const recog = new SR()
      recog.lang = 'en-US'
      recog.interimResults = false
      recog.maxAlternatives = 1
      let gotResult = false
      let fallbackTimer = null
      recog.onresult = (e) => {
        gotResult = true
        const t = e.results?.[0]?.[0]?.transcript
        if (t) setValue((v) => (v ? v + ' ' : '') + t)
      }
      recog.onerror = () => {
        setListening(false)
        // permission denied / no speech -> simulated prompt fallback
        setValue((v) => (v ? v : 'Summarize the audio notes'))
      }
      recog.onend = () => {
        setListening(false)
        clearTimeout(fallbackTimer)
      }
      recogRef.current = recog
      recog.start()
      setListening(true)
      // Guard: some environments expose the API but never deliver audio/results
      // (e.g. no microphone / headless). Fall back to a simulated prompt.
      fallbackTimer = setTimeout(() => {
        if (!gotResult) {
          try { recog.stop() } catch {}
          setValue((v) => (v ? v : 'What is the reflection of light?'))
        }
      }, 6000)
    } catch {
      setListening(false)
      setValue((v) => (v ? v : 'What is the reflection of light?'))
    }
  }

  const pickImage = () => {
    setAttachment({ type: 'image', name: 'ray_diagram_query.png' })
    setAttachMenu(false)
  }
  const pickFile = () => {
    setAttachment({ type: 'file', name: 'lecture_notes.txt' })
    setAttachMenu(false)
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl px-4 pb-4">
      {attachment && (
        <div className="mb-2 flex items-center gap-2">
          <span
            data-testid="attachment-chip"
            className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-[12px] text-blue-200"
          >
            <ImageIcon size={13} />
            {attachment.name}
            <button onClick={() => setAttachment(null)} className="text-blue-300 hover:text-white">
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl focus-within:border-blue-500/60">
        {/* + attachment */}
        <div className="relative">
          <button
            data-testid="attach-btn"
            onClick={() => setAttachMenu((s) => !s)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-blue-400"
            title="Attach"
          >
            <Plus size={19} className={attachMenu ? 'rotate-45 transition-transform' : 'transition-transform'} />
          </button>
          {attachMenu && (
            <div
              data-testid="attach-menu"
              className="absolute bottom-12 left-0 w-44 animate-fadeup rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl"
            >
              <button
                data-testid="attach-image"
                onClick={pickImage}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-200 hover:bg-slate-800"
              >
                <ImageIcon size={15} className="text-blue-400" /> Image query
              </button>
              <button
                data-testid="attach-file"
                onClick={pickFile}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-200 hover:bg-slate-800"
              >
                <ImageIcon size={15} className="text-gold" /> Notes file
              </button>
            </div>
          )}
        </div>

        <textarea
          ref={taRef}
          data-testid="search-input"
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything about the lecture…"
          className="max-h-40 flex-1 resize-none bg-transparent px-1 py-2 text-[14px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />

        {/* Mic */}
        <button
          data-testid="mic-btn"
          onClick={toggleMic}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
            listening
              ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/40'
              : 'text-slate-400 hover:bg-slate-800 hover:text-blue-400'
          }`}
          title={listening ? 'Stop listening' : 'Voice input'}
        >
          {listening ? <MicOff size={18} className="animate-blink" /> : <Mic size={18} />}
        </button>

        {/* Send */}
        <button
          data-testid="send-btn"
          onClick={submit}
          disabled={!canSend}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
            canSend
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500'
              : 'cursor-not-allowed bg-slate-800 text-slate-600'
          }`}
          title="Send"
        >
          <Send size={17} />
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-slate-600">
        LectureLens grounds answers in your lecture media · press Enter to send
      </p>
    </div>
  )
}
