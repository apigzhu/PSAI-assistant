import { useState, useRef, useEffect } from 'react'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({
  onSend,
  disabled,
  placeholder = '输入你的学习问题...',
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus()
    }
  }, [disabled])

  // 自动调整高度
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    }
  }, [input])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
    // 重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 px-4 py-3 bg-white/80 dark:bg-[#1e2130]/80
        border-t border-slate-100 dark:border-slate-800 backdrop-blur-sm"
    >
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-2.5 bg-paper border border-slate-200 dark:border-slate-700
            rounded-2xl text-sm resize-none overflow-hidden
            focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
            transition-all duration-200 placeholder:text-slate-400
            disabled:opacity-50 disabled:cursor-not-allowed
            leading-relaxed"
          style={{ minHeight: '42px', maxHeight: '120px' }}
        />
        {/* 提示文字 */}
        <div className="absolute right-3 bottom-2 text-[10px] text-slate-300 pointer-events-none select-none hidden sm:block">
          ↵ 发送 · ⇧↵ 换行
        </div>
      </div>

      {/* 发送按钮 */}
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="w-10 h-10 flex items-center justify-center rounded-2xl
          bg-gradient-to-br from-teal-600 to-teal-500
          hover:from-teal-700 hover:to-teal-600
          disabled:from-slate-200 disabled:to-slate-200 dark:disabled:from-slate-700 dark:disabled:to-slate-700
          disabled:text-slate-400 dark:disabled:text-slate-500
          text-white transition-all duration-200 active:scale-90
          disabled:cursor-not-allowed flex-shrink-0 shadow-sm hover:shadow-md"
        aria-label="发送"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* 向上的箭头（表示发送） */}
          <path d="M2 8l10-6-3 6 3 6-10-6z" />
        </svg>
      </button>
    </form>
  )
}
