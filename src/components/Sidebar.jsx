import React, { useState } from 'react'
import {
  Plus,
  MessageSquare,
  Trash2,
  Library,
  ChevronDown,
  Check,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react'

// Multi-Lecture Vault switcher + recent chats, with collapse/expand.
export default function Sidebar({
  chats,
  activeId,
  lectures,
  activeLectureId,
  onSelectLecture,
  onNew,
  onSelect,
  onDelete,
  collapsed,
  onToggle,
}) {
  const [open, setOpen] = useState(false)
  const active = lectures.find((l) => l.id === activeLectureId) || lectures[0]

  // ---- Collapsed icon rail ----
  if (collapsed) {
    return (
      <aside
        data-testid="sidebar"
        className="flex h-full w-full flex-col items-center gap-2 border-r border-[#2d2e30] bg-[#1e1f20] py-3"
      >
        <button
          data-testid="sidebar-toggle"
          onClick={onToggle}
          title="Expand sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#9aa0a6] transition-colors hover:bg-white/5 hover:text-[#e3e3e3]"
        >
          <PanelLeft size={18} />
        </button>
        <button
          data-testid="new-chat-btn"
          onClick={onNew}
          title="New chat"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#a8c7fa] text-[#0b0b0c] transition-transform hover:scale-105"
        >
          <Plus size={18} />
        </button>
        <button
          data-testid="lecture-switcher"
          onClick={onToggle}
          title={active.title}
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
          style={{ backgroundColor: active.accent + '22' }}
        >
          <Library size={16} style={{ color: active.accent }} />
        </button>
        <div className="mt-1 h-px w-6 bg-[#2d2e30]" />
        <div className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto pt-1">
          {chats.slice(0, 12).map((c) => {
            const lec = lectures.find((l) => l.id === c.lectureId)
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                title={c.title}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  c.id === activeId ? 'bg-[#a8c7fa]/15' : 'hover:bg-white/5'
                }`}
              >
                <MessageSquare size={14} style={{ color: c.id === activeId ? '#a8c7fa' : lec?.accent || '#9aa0a6' }} />
              </button>
            )
          })}
        </div>
      </aside>
    )
  }

  // ---- Expanded panel ----
  return (
    <aside
      data-testid="sidebar"
      className="flex h-full w-full flex-col border-r border-[#2d2e30] bg-[#1e1f20]"
    >
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="pl-1 text-[13px] font-semibold text-[#e3e3e3]">Lecture Vault</span>
        <button
          data-testid="sidebar-toggle"
          onClick={onToggle}
          title="Collapse sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9aa0a6] transition-colors hover:bg-white/5 hover:text-[#e3e3e3]"
        >
          <PanelLeftClose size={17} />
        </button>
      </div>

      {/* Lecture switcher */}
      <div className="relative px-3">
        <button
          data-testid="lecture-switcher"
          onClick={() => setOpen((s) => !s)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-[#2d2e30] bg-[#131314] px-3 py-2.5 text-left transition-colors hover:bg-white/5"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: active.accent + '22' }}>
            <Library size={15} style={{ color: active.accent }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-[#e3e3e3]">{active.title}</span>
            <span className="block truncate text-[11px] text-[#5f6368]">{active.subject}</span>
          </span>
          <ChevronDown size={16} className={`shrink-0 text-[#9aa0a6] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            data-testid="lecture-menu"
            className="absolute left-3 right-3 z-30 mt-1.5 animate-fadeup rounded-xl border border-[#2d2e30] bg-[#1e1f20] p-1.5 shadow-2xl"
          >
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
                    isActive ? 'bg-white/5' : 'hover:bg-white/5'
                  }`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.accent }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-[#e3e3e3]">{l.title}</span>
                    <span className="block truncate text-[11px] text-[#5f6368]">{l.subject}</span>
                  </span>
                  {isActive && <Check size={15} className="shrink-0 text-[#a8c7fa]" />}
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
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#a8c7fa] px-3 py-2.5 text-[13px] font-semibold text-[#0b0b0c] transition-transform hover:scale-[1.02]"
        >
          <Plus size={16} /> New Chat
        </button>
      </div>

      <div className="px-4 pb-1 pt-5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#5f6368]">Recent</span>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {chats.length === 0 && (
          <p data-testid="sidebar-empty" className="px-2 py-4 text-[12px] text-[#5f6368]">
            No conversations yet.
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
                isActive ? 'bg-[#a8c7fa]/15 text-[#e3e3e3]' : 'text-[#c4c7c5] hover:bg-white/5'
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: lec?.accent || '#5f6368' }}
                title={lec?.title}
              />
              <MessageSquare size={13} className={isActive ? 'text-[#a8c7fa]' : 'text-[#5f6368]'} />
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
    </aside>
  )
}
