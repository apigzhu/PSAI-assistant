import { useState, useEffect } from 'react'
import { getWrongAnswers, deleteWrongAnswer } from '../api/client'
import type { WrongAnswer } from '../types'

/** 题型标签 */
function getTypeLabel(t: string) {
  switch (t) {
    case 'choice': return '选择题'
    case 'true_false': return '判断题'
    case 'fill_blank': return '填空题'
    default: return t
  }
}

/** 提取选项字母前缀后的文本 */
function stripPrefix(opt: string): string {
  for (const p of ['A. ', 'B. ', 'C. ', 'D. ']) {
    if (opt.startsWith(p)) return opt.slice(p.length)
  }
  return opt
}

/** 获取选项字母前缀 */
function getPrefix(opt: string): string {
  for (const p of ['A. ', 'B. ', 'C. ', 'D. ']) {
    if (opt.startsWith(p)) return p[0]
  }
  return '?'
}

export default function WrongAnswersPage() {
  const [items, setItems] = useState<WrongAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getWrongAnswers(topicFilter || undefined)
      setItems(data)
    } catch {
      setError('加载错题失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [topicFilter])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteWrongAnswer(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  // 提取所有不重复的知识点
  const allTopics = [...new Set(items.map((i) => i.topic))]

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* ===== 顶部栏 ===== */}
      <div className="h-12 flex items-center px-4 border-b border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-[#1e2130]/60 backdrop-blur-sm flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4v4l2.5 1.5" />
        </svg>
        <span className="ml-2 text-sm font-medium text-ink">错题集</span>
        {items.length > 0 && (
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            {items.length} 题
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 scrollbar-thin">
        <div className="max-w-3xl mx-auto">
          {/* ===== 筛选栏 ===== */}
          {items.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="7" cy="7" r="5" />
                <path d="M11 11l3.5 3.5" />
              </svg>
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-[#1e2130] text-slate-600 dark:text-slate-400
                  focus:outline-none focus:border-teal-400 transition-colors"
              >
                <option value="">全部知识点</option>
                {allTopics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* ===== 加载状态 ===== */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-teal-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-500 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 font-medium">加载错题中...</p>
            </div>
          )}

          {/* ===== 错误状态 ===== */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <p className="text-sm text-red-500 font-medium">{error}</p>
              <button
                onClick={fetchItems}
                className="mt-3 px-4 py-1.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-lg text-xs font-medium"
              >
                重新加载
              </button>
            </div>
          )}

          {/* ===== 空状态 ===== */}
          {!loading && !error && items.length === 0 && (
            <div className="flex items-center justify-center min-h-[50vh] select-none">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-teal-500/10 mx-auto mb-6 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent" />
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3A7B7D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                </div>
                <h2 className="font-display text-2xl font-bold text-ink mb-2">
                  暂无<span className="text-gradient-teal">错题</span>
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  还没有收录错题，去试题练习中挑战一下吧！
                  <br />
                  答错的题目会自动收录到这里。
                </p>
              </div>
            </div>
          )}

          {/* ===== 错题列表 ===== */}
          {!loading && items.length > 0 && (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1e2130] p-4 transition-all duration-200 hover:shadow-sm"
                >
                  {/* 顶部：题型+知识点+删除 */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500 text-white text-xs font-bold">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M8 4v4l2.5 1.5" />
                      </svg>
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium
                      bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    >
                      {getTypeLabel(item.question_type)}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium
                      bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400"
                    >
                      {item.topic}
                    </span>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 disabled:opacity-50"
                      title="删除此错题"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M12.5 4v9a1 1 0 01-1 1h-7a1 1 0 01-1-1V4" />
                        <path d="M6 7v4M10 7v4" />
                      </svg>
                    </button>
                  </div>

                  {/* 题目 */}
                  <p className="text-sm text-ink font-medium mb-3 leading-relaxed">
                    {item.question}
                  </p>

                  {/* 选项（选择题/判断题） */}
                  {(item.question_type === 'choice' || item.question_type === 'true_false') && item.options && (
                    <div className="space-y-2 mb-3">
                      {item.options.map((opt) => {
                        const prefix = getPrefix(opt)
                        const isUserAnswer = opt === item.user_answer
                        const isCorrect = opt === item.correct_answer
                        return (
                          <div
                            key={opt}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                              ${isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700'
                                : isUserAnswer
                                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700'
                                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500'
                              }`}
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                              ${isCorrect
                                ? 'bg-emerald-500 text-white'
                                : isUserAnswer
                                  ? 'bg-red-400 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                              }`}
                            >
                              {prefix}
                            </span>
                            <span className="flex-1">{stripPrefix(opt)}</span>
                            {isCorrect && (
                              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {isUserAnswer && !isCorrect && (
                              <span className="text-[10px] text-red-400 font-medium flex-shrink-0">你的选择</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 填空题答案对比 */}
                  {item.question_type === 'fill_blank' && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700">
                        <span className="text-xs text-red-500 font-medium flex-shrink-0">你的答案：</span>
                        <span className="text-sm text-red-600 dark:text-red-400 line-through">{item.user_answer}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700">
                        <span className="text-xs text-emerald-600 font-medium flex-shrink-0">正确答案：</span>
                        <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">{stripPrefix(item.correct_answer)}</span>
                      </div>
                    </div>
                  )}

                  {/* 解析 */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="font-medium text-teal-600 dark:text-teal-400">解析：</span>
                      {item.explanation?.replace(/^解析[：:]\s*/, '')}
                    </p>
                  </div>

                  {/* 时间 */}
                  <div className="mt-2 text-[10px] text-slate-400">
                    {new Date(item.created_at).toLocaleDateString('zh-CN', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
