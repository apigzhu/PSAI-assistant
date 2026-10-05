import { type ReactNode } from 'react'

interface MemoryIndicatorProps {
  type: 'semantic' | 'insight' | 'personal' | 'connecting'
}

const memoryConfig = {
  semantic: {
    barClass: 'memory-bar-teal',
    label: '知识记忆',
    description: '基于你已学的知识',
  },
  insight: {
    barClass: 'memory-bar-copper',
    label: '新见解',
    description: '建立了新的知识连接',
  },
  personal: {
    barClass: 'memory-bar-violet',
    label: '个性化',
    description: '根据你的学习风格调整',
  },
  connecting: {
    barClass: 'memory-bar-pulse',
    label: '连接中',
    description: '正在关联你的已有知识',
  },
}

/**
 * 记忆深度指示器 —— PIAS 的签名元素
 *
 * 每条 AI 回复左侧的彩色竖条，直观反映系统正在使用的记忆层。
 * - 墨绿 = 基于已学知识回答（语义记忆）
 * - 暖铜 = 产生了新见解
 * - 紫色 = 个性化适配（程序记忆）
 * - 脉冲动画 = 正在关联知识
 */
export default function MemoryIndicator({ type }: MemoryIndicatorProps) {
  const config = memoryConfig[type]

  return (
    <div
      className={`${config.barClass} h-full min-h-[2.5rem] rounded-full`}
      title={`${config.label}: ${config.description}`}
      role="img"
      aria-label={config.description}
    />
  )
}

/**
 * 记忆状态条 —— 页面底部显示的四个记忆层状态
 */
export function MemoryStatusBar({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 sm:px-6 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-[#1e2130]/60 backdrop-blur-sm flex items-center justify-between text-xs text-slate-400 font-mono">
      {children}
    </div>
  )
}

export function MemoryStatusItem({
  label,
  active = false,
}: {
  label: string
  active?: boolean
}) {
  return (
    <span
      className={`flex items-center gap-1.5 transition-all duration-300 ${
        active ? 'text-teal-600 dark:text-teal-400 font-medium' : ''
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
          active ? 'bg-teal-500 shadow-sm shadow-teal-500/30' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      />
      {label}
    </span>
  )
}
