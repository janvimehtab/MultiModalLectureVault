import React from 'react'
import { Plus, MessageSquare, Trash2, GraduationCap } from 'lucide-react'

// Recent chat history manager (persisted to localStorage by App).
export default function Sidebar({ chats, activeId, onNew, onSelect, onDelete }) {
  return (
    <aside
      data-testid="sidebar"
      className="flex h-full w-full flex-col border-r border-slate-800/80 bg-slate-900/40 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <GraduationCap size={18} className="text-blue-400" />
        <span className="text-[13px] font-semibold text-slate-200">Study Threads</span>
      </div>

      <div className="px-3">
        <button
          data-testid="new-chat-btn"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-500/40"
        >
          <Plus size={16} /> New Chat
        </button>
      </div>

      <div className="px-4 pb-2 pt-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Recent Chats
        </span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {chats.length === 0 && (
          <p data-testid="sidebar-empty" className="px-2 py-4 text-[12px] leading-relaxed text-slate-600">
            No conversations yet. Start a new chat to explore your lecture.
          </p>
        )}
        {chats.map((c) => {
          const active = c.id === activeId
          return (
            <div
              key={c.id}
              data-testid={`chat-item-${c.id}`}
              onClick={() => onSelect(c.id)}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                active
                  ? 'bg-blue-500/15 text-blue-100 ring-1 ring-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              <MessageSquare size={14} className={active ? 'text-blue-400' : 'text-slate-500'} />
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
