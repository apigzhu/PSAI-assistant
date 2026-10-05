import type { Message } from '../types'
import MemoryIndicator from './MemoryIndicator'

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const memoryType = message.memoryType || 'semantic'

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 message-enter">
        <div className="max-w-[78%] md:max-w-[65%] flex items-end gap-2.5">
          <div className="flex-1">
            <div
              className="bg-gradient-to-br from-teal-600 to-teal-500 text-white px-4 py-3
                rounded-2xl rounded-br-md text-sm leading-relaxed shadow-sm
                relative"
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
          {/* 用户头像 */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-4 message-enter">
      <div className="max-w-[78%] md:max-w-[65%] flex items-end gap-2.5">
        {/* AI 头像 */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-copper-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="flex-1 group">
          {/* 气泡 + 记忆指示条 */}
          <div className="flex gap-2.5">
            <div className="w-[3px] flex-shrink-0 mt-1">
              <MemoryIndicator type={memoryType} />
            </div>
            <div
              className="bg-white dark:bg-[#1e2130] border border-slate-100 dark:border-slate-800
                rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed shadow-sm
                relative flex-1"
            >
              <div className="whitespace-pre-wrap text-ink/90">{message.content}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
