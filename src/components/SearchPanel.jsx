import React, { useEffect, useRef, useState } from 'react'
import { Plus, Mic, Send, Image as ImageIcon, X, MicOff, FileText } from 'lucide-react'

// Floating input bar: text + voice + mock attach.
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
        setValue((v) => (v ? v : 'Summarize the audio notes'))
      }
      recog.onend = () => {
        setListening(false)
        clearTimeout(fallbackTimer)
      }
      recogRef.current = recog
      recog.start()
      setListening(true)
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

  return (
    <div className="relative mx-auto w-full max-w-3xl px-4 pb-5 pt-1">
      {attachment && (
        <div className="mb-2 flex items-center gap-2">
          <span
            data-testid="attachment-chip"
            className="flex items-center gap-2 rounded-lg border border-[#a8c7fa]/40 bg-[#a8c7fa]/10 px-2.5 py-1 text-[12px] text-[#a8c7fa]"
          >
            <ImageIcon size={13} />
            {attachment.name}
            <button onClick={() => setAttachment(null)} className="hover:text-white">
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      <div className="flex items-end gap-2 rounded-[28px] border border-[#2d2e30] bg-[#1e1f20] p-2 transition-colors focus-within:border-[#a8c7fa]/40">
        <div className="relative">
          <button
            data-testid="attach-btn"
            onClick={() => setAttachMenu((s) => !s)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#9aa0a6] transition-colors hover:bg-white/5 hover:text-[#a8c7fa]"
            title="Attach"
          >
            <Plus size={19} className={attachMenu ? 'rotate-45 transition-transform' : 'transition-transform'} />
          </button>
          {attachMenu && (
            <div
              data-testid="attach-menu"
              className="absolute bottom-12 left-0 w-44 animate-fadeup rounded-xl border border-[#2d2e30] bg-[#1e1f20] p-1.5 shadow-xl"
            >
              <button
                data-testid="attach-image"
                onClick={() => { setAttachment({ type: 'image', name: 'ray_diagram_query.png' }); setAttachMenu(false) }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-[#e3e3e3] hover:bg-white/5"
              >
                <ImageIcon size={15} className="text-[#a8c7fa]" /> Image query
              </button>
              <button
                data-testid="attach-file"
                onClick={() => { setAttachment({ type: 'file', name: 'lecture_notes.txt' }); setAttachMenu(false) }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-[#e3e3e3] hover:bg-white/5"
              >
                <FileText size={15} className="text-[#a8c7fa]" /> Notes file
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
          placeholder="Ask about the lecture…"
          className="max-h-40 flex-1 resize-none bg-transparent px-1 py-2 text-[14px] leading-relaxed text-[#e3e3e3] placeholder:text-[#5f6368] focus:outline-none"
        />

        <button
          data-testid="mic-btn"
          onClick={toggleMic}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            listening ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/40' : 'text-[#9aa0a6] hover:bg-white/5 hover:text-[#a8c7fa]'
          }`}
          title={listening ? 'Stop listening' : 'Voice input'}
        >
          {listening ? <MicOff size={18} className="animate-blink" /> : <Mic size={18} />}
        </button>

        <button
          data-testid="send-btn"
          onClick={submit}
          disabled={!canSend}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
            canSend ? 'bg-[#a8c7fa] text-[#0b0b0c] hover:scale-105' : 'cursor-not-allowed bg-[#2d2e30] text-[#5f6368]'
          }`}
          title="Send"
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  )
}
