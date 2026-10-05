import { useState, useRef, useEffect, useCallback } from 'react'
import ChatMessage from '../components/ChatMessage'
import ChatInput from '../components/ChatInput'
import { MemoryStatusBar, MemoryStatusItem } from '../components/MemoryIndicator'
import TutorSelector from '../components/TutorSelector'
import LearningPathPage from '../pages/LearningPathPage'
import KnowledgeGraphPage from '../pages/KnowledgeGraphPage'
import ProfilePage from '../pages/ProfilePage'
import QuizPanel from '../components/QuizPanel'
import WrongAnswersPage from '../pages/WrongAnswersPage'
import { createSession, listSessions, getSessionMessages, sendMessageStream, getMemoryUsage, setSessionTutor, deleteSession } from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { isDemo } from '../demo/demoApi'
import type { Message, Session, MemoryUsage, Tutor, ViewType } from '../types'

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1a7 7 0 017 7c0 1.5-.5 2.9-1.3 4l.8 2.5-2.5-.8A7 7 0 118 1z" />
    </svg>
  )
}

function PathIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14l4-12 4 12M4 10h6" />
    </svg>
  )
}

function GraphIcon({ dot }: { dot?: boolean }) {
  return (
    <span className="relative inline-flex">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="4" r="2" />
        <circle cx="4" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M8 6l-3 5M8 6l3 5M5 11l6 2" />
      </svg>
      {dot && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#1e2130]" />
      )}
    </span>
  )
}

function QuizIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" transform="scale(0.65) translate(2, 2)" />
      <path d="M2 1h12a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z" />
      <path d="M4 5h8M4 8h5" />
    </svg>
  )
}

function WrongAnswersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4v4l2.5 1.5" />
    </svg>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { username, logout } = useAuthStore()

  // ===== 导航标签状态 =====
  const [currentView, setCurrentView] = useState<ViewType>('chat')
  const [showTutorSelector, setShowTutorSelector] = useState(false)
  const [activeTutor, setActiveTutor] = useState<Tutor | null>(null)

  // 知识图谱更新通知 — 聊天后自动提取知识时点亮徽章
  const [knowledgeUpdated, setKnowledgeUpdated] = useState(false)

  // 加载会话列表
  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch(() => {})
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 轮询工作记忆状态（仅在 chat 视图下轮询，避免后台页面浪费资源）
  useEffect(() => {
    if (!currentSessionId || currentView !== 'chat') return
    const interval = setInterval(async () => {
      try {
        const usage = await getMemoryUsage(currentSessionId)
        setMemoryUsage(usage)
      } catch {
        // ignore
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [currentSessionId, currentView])

  // 立即切换视图（子页面自带 view-enter 入场动画）
  const handleViewChange = (view: ViewType) => {
    if (view === currentView) return
    // 切换到知识图谱时清除更新通知
    if (view === 'knowledge') {
      setKnowledgeUpdated(false)
    }
    setCurrentView(view)
  }

  const handleSend = useCallback(
    async (content: string) => {
      let sessionId = currentSessionId

      if (!sessionId) {
        try {
          const session = await createSession('新对话')
          sessionId = session.id
          setCurrentSessionId(session.id)
          setSessions((prev) => [session, ...prev])
        } catch {
          return
        }
      }

      const userMessage: Message = { role: 'user', content }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', memoryType: 'semantic' },
      ])

      try {
        let fullContent = ''
        let hasError = false

        for await (const chunk of sendMessageStream(sessionId, content)) {
          if (chunk.type === 'error') {
            hasError = true
            setMessages((prev) => {
              const updated = [...prev]
              const errMsg = chunk.content || '服务暂时不可用，请稍后重试。'
              if (updated.length > 0) {
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: `😕 ${errMsg}`,
                  memoryType: 'semantic',
                }
              }
              return updated
            })
            break
          }
          if (chunk.type === 'chunk' && chunk.content) {
            fullContent += chunk.content
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                role: 'assistant',
                content: fullContent,
                memoryType: 'connecting',
              }
              return updated
            })
          }
        }

        if (!hasError) {
          setKnowledgeUpdated(true)
          setMessages((prev) => {
            const updated = [...prev]
            if (updated.length > 0) {
              const last = updated[updated.length - 1]
              // 如果流结束了但内容为空，显示提示
              updated[updated.length - 1] = {
                ...last,
                content: last.content || '抱歉，AI 暂时无法回复，请稍后再试。',
                memoryType: 'semantic' as const,
              }
            }
            return updated
          })
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant' as const,
            content: '抱歉，我遇到了网络问题，请稍后重试。',
            memoryType: 'semantic' as const,
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [currentSessionId]
  )

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId)
    setMessages([])
    setCurrentView('chat')
    setActiveTutor(null)
    try {
      const [msgs, usage] = await Promise.all([
        getSessionMessages(sessionId),
        getMemoryUsage(sessionId).catch(() => null),
      ])
      setMessages(msgs)
      setMemoryUsage(usage)
    } catch {
      setMemoryUsage(null)
    }
  }

  // 演示模式：自动打开最近的一个会话，让访客一进来就看到对话内容
  useEffect(() => {
    if (isDemo && sessions.length > 0 && !currentSessionId) {
      handleSelectSession(sessions[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions])

  const handleNewSession = () => {
    setCurrentSessionId(null)
    setMessages([])
    setMemoryUsage(null)
    setActiveTutor(null)
  }

  const handleLogout = () => {
    logout()
  }

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    try {
      await deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
        setMessages([])
        setMemoryUsage(null)
        setActiveTutor(null)
      }
    } catch {
      // ignore
    }
  }

  const handleTutorSet = (tutor: Tutor) => {
    setActiveTutor(tutor)
  }

  // ===== 根据当前视图渲染主内容 =====
  const renderContent = () => {
    if (currentView === 'learning') return <LearningPathPage />
    if (currentView === 'knowledge') return <KnowledgeGraphPage />
    if (currentView === 'profile') return <ProfilePage />
    if (currentView === 'quiz') return <QuizPanel />
    if (currentView === 'wrong_answers') return <WrongAnswersPage />

    // Chat 视图
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* ===== 聊天顶栏 ===== */}
        <div className="h-12 flex items-center px-4 border-b border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-[#1e2130]/60 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            aria-label={showSidebar ? '收起侧边栏' : '展开侧边栏'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {showSidebar ? (
                <>
                  <path d="M4 3v10" />
                  <path d="M6 3h7a1 1 0 011 1v8a1 1 0 01-1 1H6M2 3h2v10H2a1 1 0 01-1-1V4a1 1 0 011-1z" />
                </>
              ) : (
                <path d="M3 3h10a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zM6 3v10" />
              )}
            </svg>
          </button>

          {/* 当前视图标题 */}
          <span className="ml-3 text-sm font-medium text-ink hidden sm:block">
            {currentSessionId ? (
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                对话中
              </span>
            ) : (
              <span className="text-slate-400">准备就绪</span>
            )}
          </span>

          <div className="flex-1" />

          {/* 导师选择器按钮 */}
          {currentSessionId && (
            <button
              onClick={() => setShowTutorSelector(true)}
              className="mr-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500
                hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50/50 dark:hover:bg-teal-900/20
                transition-all duration-200 flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="6" cy="4" r="2" />
                <path d="M2 10c0-2.2 1.8-4 4-4s4 1.8 4 4" />
              </svg>
              {activeTutor ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  {activeTutor.title}
                </span>
              ) : (
                '选择导师'
              )}
            </button>
          )}
        </div>

        {/* ===== 消息列表 ===== */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full select-none">
              <div className="text-center max-w-md">
                {/* 装饰图标 */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/10 via-teal-400/5 to-copper-500/10 mx-auto mb-6 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/5 to-transparent" />
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3A7B7D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>

                <h2 className="font-display text-2xl font-bold text-ink mb-2">
                  你好，<span className="text-gradient-teal">{username}</span>
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  我是你的智慧学习助理。我能帮你解答学习问题、
                  <br />
                  整理知识脉络、规划学习路径。
                </p>
                <p className="text-slate-400 text-xs mt-3">
                  试试问我一个学习问题吧
                </p>

                {/* 快捷问题 */}
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  {[
                    '什么是矩阵乘法？',
                    '帮我解释微积分基本定理',
                    '推荐Python学习路径',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="px-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700
                        text-slate-500 hover:border-teal-300 hover:text-teal-600
                        hover:bg-teal-50/50 dark:hover:bg-teal-900/20
                        transition-all duration-200 active:scale-95"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="max-w-3xl mx-auto">
                {messages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} />
                ))}

                {/* 打字指示器 */}
                {isLoading && messages[messages.length - 1]?.content !== '' && (
                  <div className="flex justify-start mb-4 message-enter">
                    <div className="max-w-[78%] md:max-w-[65%] flex items-end gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-copper-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" />
                          <path d="M2 17l10 5 10-5" />
                          <path d="M2 12l10 5 10-5" />
                        </svg>
                      </div>
                      <div className="bg-white dark:bg-[#1e2130] border border-slate-100 dark:border-slate-800 rounded-2xl rounded-bl-md px-5 py-3.5 shadow-sm">
                        <div className="flex gap-1.5">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ===== 输入区 ===== */}
        <div className="max-w-3xl mx-auto w-full">
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>

        {/* ===== 记忆状态栏 ===== */}
        <MemoryStatusBar>
          <MemoryStatusItem label="工作记忆" active={!!currentSessionId} />
          <MemoryStatusItem label="情景记忆" active={!!memoryUsage && memoryUsage.entry_count > 0} />
          <MemoryStatusItem label="语义记忆" />
          <MemoryStatusItem label="程序记忆" />
          {memoryUsage && (
            <span className="hidden sm:inline text-slate-400">
              <span className="text-teal-600 font-medium">{memoryUsage.entry_count}</span> 条 ·
              <span className="text-teal-600 font-medium"> {Math.round(memoryUsage.usage_ratio * 100)}%</span>
            </span>
          )}
        </MemoryStatusBar>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-paper overflow-hidden">
      {/* ===== 侧边栏 ===== */}
      {showSidebar && (
        <div className="glass-sidebar w-64 flex flex-col flex-shrink-0 z-10 animate-fade-in">
          {/* ===== 侧边栏头部 ===== */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white text-sm font-bold flex items-center justify-center shadow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <span className="font-display text-base font-bold text-ink block leading-tight">PIAS</span>
                <span className="text-[10px] text-slate-400 font-mono">智慧学习助理</span>
              </div>
            </div>
          </div>

          {/* ===== 导航标签 ===== */}
          <div className="px-2.5 pt-2.5 pb-1 space-y-0.5">
            {([
              { key: 'chat' as const, label: '对话', icon: <ChatIcon /> },
              { key: 'learning' as const, label: '学习路径', icon: <PathIcon /> },
              { key: 'knowledge' as const, label: '知识图谱', icon: <GraphIcon dot={knowledgeUpdated} /> },
              { key: 'quiz' as const, label: '试题练习', icon: <QuizIcon /> },
              { key: 'wrong_answers' as const, label: '错题集', icon: <WrongAnswersIcon /> },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleViewChange(tab.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 group
                  ${currentView === tab.key
                    ? 'bg-gradient-to-r from-teal-50/80 to-teal-50/40 dark:from-teal-900/30 dark:to-teal-900/10 text-teal-700 dark:text-teal-300 font-medium shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                <span className={currentView === tab.key ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 group-hover:text-slate-500'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {knowledgeUpdated && tab.key === 'knowledge' && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                    更新
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ===== 分割线 ===== */}
          <div className="divider-gradient mx-3 my-2" />

          {/* ===== 对话列表区域（仅 chat 视图） ===== */}
          {currentView === 'chat' && (
            <>
              {/* 新对话按钮 */}
              <div className="px-3 pt-1 pb-2">
                <button
                  onClick={handleNewSession}
                  className="w-full py-2 px-3 bg-gradient-to-r from-teal-600 to-teal-500
                    hover:from-teal-700 hover:to-teal-600 text-white rounded-xl text-sm
                    font-medium transition-all duration-200 active:scale-[0.97] shadow-sm
                    hover:shadow-md flex items-center justify-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M7 1v12M1 7h12" />
                  </svg>
                  新对话
                </button>
              </div>

              {/* 会话列表 */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
                {sessions.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-8">
                    <svg className="mx-auto mb-2 w-8 h-8 text-slate-200 dark:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    还没有对话记录
                    <br />
                    <span className="text-[10px]">点击上方按钮开始新对话</span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className={`group relative rounded-xl transition-all duration-200
                          ${currentSessionId === s.id
                            ? 'bg-gradient-to-r from-teal-50/80 to-teal-50/40 dark:from-teal-900/30 dark:to-teal-900/10 shadow-sm'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                      >
                        <button
                          onClick={() => handleSelectSession(s.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 border-l-[3px]
                            ${currentSessionId === s.id
                              ? 'border-teal-500 text-ink dark:text-slate-200'
                              : 'border-transparent text-slate-600 dark:text-slate-400'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                            </svg>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{s.title}</div>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 ml-[22px]">
                            {new Date(s.created_at).toLocaleDateString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </button>
                        {/* 删除按钮 — hover 时显示 */}
                        <button
                          onClick={(e) => handleDeleteSession(e, s.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                            opacity-0 group-hover:opacity-100 transition-all duration-200
                            text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="删除对话"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M12.5 4v9a1 1 0 01-1 1h-7a1 1 0 01-1-1V4" />
                            <path d="M6 7v4M10 7v4" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 非 chat 视图时的撑开 */}
          {currentView !== 'chat' && <div className="flex-1" />}

          {/* ===== 底部按钮区域 ===== */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <button
              onClick={() => setCurrentView(currentView === 'profile' ? 'chat' : 'profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200
                ${currentView === 'profile'
                  ? 'bg-teal-50 text-teal-700 font-medium'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="5" r="3" />
                <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              </svg>
              <span>个人中心</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" />
              </svg>
              <span>退出登录</span>
            </button>
          </div>
        </div>
      )}

      {/* ===== 主内容区 ===== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {renderContent()}
      </div>

      {/* ===== 导师选择器弹窗 ===== */}
      {showTutorSelector && (
        <TutorSelector
          sessionId={currentSessionId}
          onClose={() => setShowTutorSelector(false)}
          onTutorSet={handleTutorSet}
        />
      )}
    </div>
  )
}
