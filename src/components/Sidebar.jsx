import React, { useState } from 'react'
import { Plus, MessageSquare, Trash2, GraduationCap, Library, ChevronDown, Check } from 'lucide-react'

// Recent chat history manager + Multi-Lecture Vault switcher.
export default function Sidebar({
  chats,
  activeId,
  lectures,
  activeLectureId,
  onSelectLecture,
  onNew,
  onSelect,
  onDelete,
}) {
  const [open, setOpen] = useState(false)
  const active = lectures.find((l) => l.id === activeLectureId) || lectures[0]

  return (
    <aside
      data-testid="sidebar"
      className="flex h-full w-full flex-col border-r border-slate-800/80 bg-slate-900/40 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <GraduationCap size={18} className="text-blue-400" />
        <span className="text-[13px] font-semibold text-slate-200">Lecture Vault</span>
      </div>

      {/* Lecture switcher */}
      <div className="relative px-3">
        <button
          data-testid="lecture-switcher"
          onClick={() => setOpen((s) => !s)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-left transition-colors hover:border-slate-600"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: active.accent + '22' }}>
            <Library size={15} style={{ color: active.accent }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-slate-100">{active.title}</span>
            <span className="block truncate text-[11px] text-slate-500">{active.subject} · {active.duration}</span>
          </span>
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            data-testid="lecture-menu"
            className="absolute left-3 right-3 z-30 mt-1.5 animate-fadeup rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl"
          >
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Switch lecture
            </p>
            {lectures.map((l) => {
              const isActive = l.id === activeLectureId
              return (
                <button
                  key={l.id}
                  data-testid={`lecture-option-${l.id}`}
                  onClick={() => {
                    onSelectLecture(l.id)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    isActive ? 'bg-slate-800' : 'hover:bg-slate-800/70'
                  }`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.accent }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-slate-100">{l.title}</span>
                    <span className="block truncate text-[11px] text-slate-500">{l.subject}</span>
                  </span>
                  {isActive && <Check size={15} className="shrink-0 text-blue-400" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-3 px-3">
        <button
          data-testid="new-chat-btn"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40"
        >
          <Plus size={16} /> New Chat
        </button>
      </div>

      <div className="px-4 pb-2 pt-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Recent Chats</span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {chats.length === 0 && (
          <p data-testid="sidebar-empty" className="px-2 py-4 text-[12px] leading-relaxed text-slate-600">
            No conversations yet. Start a new chat to explore your lecture.
          </p>
        )}
        {chats.map((c) => {
          const isActive = c.id === activeId
          const lec = lectures.find((l) => l.id === c.lectureId)
          return (
            <div
              key={c.id}
              data-testid={`chat-item-${c.id}`}
              onClick={() => onSelect(c.id)}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                isActive ? 'bg-blue-500/15 text-blue-100 ring-1 ring-blue-500/30' : 'text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: lec?.accent || '#64748b' }}
                title={lec?.title}
              />
              <MessageSquare size={13} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
              <span className="flex-1 truncate">{c.title}</span>
              <button
                data-testid={`chat-delete-${c.id}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(c.id)
                }}
                className="opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                title="Delete chat"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="border-t border-slate-800/80 px-4 py-3 text-[10px] leading-relaxed text-slate-600">
        History is saved locally in your browser.
      </div>
    </aside>
  )
}
