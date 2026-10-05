import { useState, useEffect } from 'react'
import type { LearningPath, MilestoneContent } from '../types'
import { createLearningPath, getLearningPath, toggleMilestone, getMilestoneContent } from '../api/client'

export default function LearningPathPage() {
  const [path, setPath] = useState<LearningPath | null>(null)
  const [loading, setLoading] = useState(true)
  const [goal, setGoal] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [togglingIdx, setTogglingIdx] = useState<number | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [content, setContent] = useState<MilestoneContent | null>(null)

  const fetchPath = async () => {
    setLoading(true)
    try {
      const data = await getLearningPath()
      setPath(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPath()
  }, [])

  const handleCreate = async () => {
    if (!goal.trim()) return
    setCreating(true)
    setError('')
    try {
      const data = await createLearningPath(goal.trim())
      setPath(data)
      setGoal('')
    } catch (e: any) {
      setError(e?.response?.data?.detail || '创建失败，请重试')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleMilestone = async (e: React.MouseEvent, index: number, currentStatus: string | undefined) => {
    e.stopPropagation()
    if (!path || togglingIdx !== null) return
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    setTogglingIdx(index)
    try {
      const result = await toggleMilestone(path.id, index, newStatus)
      setPath({
        ...path,
        milestones: result.milestones,
        progress: result.progress,
      })
    } catch {
      // ignore
    } finally {
      setTogglingIdx(null)
    }
  }

  const handleMilestoneClick = async (index: number) => {
    if (!path || togglingIdx !== null) return

    // 如果点击的是同一个，收起
    if (selectedIdx === index) {
      setSelectedIdx(null)
      setContent(null)
      return
    }

    setSelectedIdx(index)
    setContent(null)
    setContentLoading(true)

    try {
      const data = await getMilestoneContent(path.id, index)
      setContent(data)
    } catch {
      setContent(null)
    } finally {
      setContentLoading(false)
    }
  }

  const completedCount = path?.milestones?.filter((m) => m.status === 'completed').length ?? 0
  const totalCount = path?.milestones?.length ?? 0
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.15s]" />
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.3s]" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col view-enter">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scrollbar-thin">
        <div className="max-w-2xl mx-auto">
          {/* ===== 页面标题 ===== */}
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
              <svg className="w-6 h-6 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 14l4-12 4 12M4 10h6" />
              </svg>
              学习路径
            </h1>
            <p className="text-sm text-slate-400 mt-0.5 ml-9">制定学习目标，跟踪学习进度</p>
          </div>

          {!path ? (
            /* ===== 创建新的学习路径 ===== */
            <div className="max-w-lg mx-auto mt-8">
              <div className="card-elevated p-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-900/10 flex items-center justify-center mb-5">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3A7B7D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h2 className="font-bold text-lg text-ink mb-1">开始你的学习之旅</h2>
                <p className="text-sm text-slate-500 mb-5">告诉我你想学什么，AI 会帮你规划学习路径</p>

                <div className="space-y-3">
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="例如：我想在3个月内学会 Python 数据分析"
                    rows={3}
                    className="w-full px-4 py-3 bg-paper border border-slate-200 dark:border-slate-700 rounded-xl text-sm resize-none
                      focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                      transition-all duration-200 placeholder:text-slate-400"
                  />

                  {error && (
                    <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50/80 px-3 py-2 rounded-lg border border-red-100">
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleCreate}
                    disabled={creating || !goal.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-teal-500
                      hover:from-teal-700 hover:to-teal-600 disabled:from-slate-200 disabled:to-slate-200
                      dark:disabled:from-slate-700 dark:disabled:to-slate-700
                      text-white disabled:text-slate-400 dark:disabled:text-slate-500
                      rounded-xl text-sm font-medium transition-all duration-200
                      active:scale-[0.97] flex items-center justify-center gap-2 shadow-sm"
                  >
                    {creating ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                          <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        生成中...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                        生成学习路径
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ===== 展示学习路径 ===== */
            <div>
              {/* ===== 路径头部卡片 ===== */}
              <div className="card-elevated p-5 mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg text-ink">{path.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">{path.goal}</p>
                  </div>
                  <button
                    onClick={() => { setPath(null); setGoal(''); setSelectedIdx(null); setContent(null) }}
                    className="flex-shrink-0 text-xs text-slate-400 hover:text-teal-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-teal-50/50 dark:hover:bg-teal-900/20 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    重新规划
                  </button>
                </div>

                {/* ===== 进度条 ===== */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">
                      完成进度
                      <span className="text-teal-600 font-semibold ml-1">{progress}%</span>
                    </span>
                    <span className="text-slate-400">
                      <span className="text-teal-600 font-semibold">{completedCount}</span>
                      /{totalCount} 里程碑
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* ===== 里程碑时间线 ===== */}
              <div className="relative">
                <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700 rounded-full" />

                <div className="space-y-2">
                  {path.milestones?.map((ms, i) => {
                    const status = ms.status || 'pending'
                    const isCompleted = status === 'completed'
                    const isCurrent = i === completedCount && !isCompleted
                    const isExpanded = selectedIdx === i
                    return (
                      <div key={i}>
                        {/* 里程碑卡片 */}
                        <div
                          onClick={() => handleMilestoneClick(i)}
                          className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none
                            ${isCompleted
                              ? 'bg-gradient-to-r from-teal-50/60 to-teal-50/20 dark:from-teal-900/20 dark:to-teal-900/5 border-teal-100 dark:border-teal-900/30 hover:bg-teal-50/80'
                              : isCurrent
                                ? 'card-base border-teal-200 dark:border-teal-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                : 'card-base opacity-60 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }
                            ${isExpanded ? 'ring-2 ring-teal-500/30' : ''}
                            ${togglingIdx === i ? 'pointer-events-none opacity-50' : ''}`}
                        >
                          {/* 时间线节点 — 点击切换状态 */}
                          <div
                            onClick={(e) => handleToggleMilestone(e, i, ms.status)}
                            className="relative z-10 flex-shrink-0"
                            title={isCompleted ? '标记为未完成' : '标记为已完成'}
                          >
                            <div
                              className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                                ${isCompleted
                                  ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-sm hover:from-teal-600 hover:to-teal-700'
                                  : isCurrent
                                    ? 'border-2 border-teal-500 bg-white dark:bg-slate-800 text-teal-600 shadow-sm hover:bg-teal-50'
                                    : 'border-2 border-slate-200 dark:border-slate-600 bg-paper-light text-slate-300 dark:text-slate-500 hover:border-slate-400'
                                }`}
                            >
                              {isCompleted ? (
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                i + 1
                              )}
                            </div>
                          </div>

                          {/* 内容 */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-medium text-sm ${isCompleted ? 'text-teal-700 dark:text-teal-300' : isCurrent ? 'text-ink' : 'text-slate-500'}`}>
                                {ms.name}
                              </span>
                              {isCompleted && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 font-medium">
                                  已完成
                                </span>
                              )}
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 font-medium flex items-center gap-0.5">
                                  <span className="w-1 h-1 rounded-full bg-teal-500 animate-pulse" />
                                  当前
                                </span>
                              )}
                              {!isCompleted && !isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                                  待开始
                                </span>
                              )}
                            </div>
                            {ms.description && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                {ms.description}
                              </p>
                            )}
                            {/* 展开提示 */}
                            {!isExpanded && (
                              <p className="text-xs text-teal-500 mt-1.5 flex items-center gap-1">
                                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                </svg>
                                点击开始学习
                              </p>
                            )}
                          </div>

                          {/* 展开指示器 */}
                          <svg
                            className={`w-4 h-4 text-slate-400 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            viewBox="0 0 20 20" fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>

                        {/* ===== 展开的学习内容 ===== */}
                        {isExpanded && (
                          <div className="ml-[50px] mt-2 mb-2 animate-fade-in">
                            {contentLoading ? (
                              <div className="bg-paper-light border border-slate-100 rounded-xl p-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                  <span className="text-sm text-slate-500">AI 正在生成学习内容...</span>
                                </div>
                              </div>
                            ) : content ? (
                              <div className="bg-paper-light border border-slate-100 dark:border-slate-700 rounded-xl p-5 space-y-5 shadow-sm">
                                {/* 核心概念 */}
                                <div>
                                  <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink mb-2">
                                    <svg className="w-4 h-4 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    核心概念
                                  </h4>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {content.explanation}
                                  </p>
                                </div>

                                {/* 要点 */}
                                <div>
                                  <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink mb-2">
                                    <svg className="w-4 h-4 text-copper-500" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10 1a1 1 0 01.993.883L11 2v2h2a1 1 0 01.117 1.993L13 6h-2v2a1 1 0 01-1.993.117L9 8V6H7a1 1 0 01-.117-1.993L7 4h2V2a1 1 0 011-1z" />
                                      <path d="M5 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                                      <path d="M14 12a1 1 0 011 1v.5h.5a1 1 0 110 2H15v.5a1 1 0 11-2 0v-.5h-.5a1 1 0 110-2h.5V13a1 1 0 011-1z" />
                                    </svg>
                                    关键要点
                                  </h4>
                                  <ul className="space-y-1.5">
                                    {content.key_points.map((pt, j) => (
                                      <li key={j} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-copper-400 mt-1.5 flex-shrink-0" />
                                        {pt}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* 示例 */}
                                {content.examples.length > 0 && (
                                  <div>
                                    <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink mb-2">
                                      <svg className="w-4 h-4 text-violet-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                      </svg>
                                      示例
                                    </h4>
                                    {content.examples.map((ex, j) => (
                                      <div key={j} className="mb-2 last:mb-0 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <p className="text-xs text-slate-400 mb-1">示例 {j + 1}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{ex}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* 练习 */}
                                <div>
                                  <h4 className="flex items-center gap-1.5 text-sm font-bold text-ink mb-2">
                                    <svg className="w-4 h-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                    </svg>
                                    练习
                                  </h4>
                                  <div className="p-3 bg-amber-50/80 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                      {content.practice}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-paper-light border border-slate-100 rounded-xl p-6 text-center">
                                <p className="text-sm text-slate-400">内容加载失败，请重试</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
