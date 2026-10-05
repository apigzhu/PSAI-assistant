import { useState } from 'react'
import { generateQuiz, submitQuizResults } from '../api/client'
import type { QuizQuestion, AnswerRecord } from '../types'

/** 提取选项字母前缀 */
function stripPrefix(opt: string): string {
  for (const p of ['A. ', 'B. ', 'C. ', 'D. ']) {
    if (opt.startsWith(p)) return opt.slice(p.length)
  }
  return opt
}

function getPrefix(opt: string): string {
  for (const p of ['A. ', 'B. ', 'C. ', 'D. ']) {
    if (opt.startsWith(p)) return p[0]
  }
  return '?'
}

export default function QuizPanel() {
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    setQuestions([])
    setAnswers({})
    setSubmitted(false)
    setScore(0)
    try {
      const data = await generateQuiz(topic.trim())
      setQuestions(data.questions || [])
      if ((data.questions || []).length === 0) {
        setError('未能生成试题，请尝试其他知识点')
      }
    } catch {
      setError('生成失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (qId: number, value: string) => {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [qId]: value }))
  }

  const handleFillChange = (qId: number, value: string) => {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [qId]: value }))
  }

  const handleSubmit = async () => {
    let correct = 0
    for (const q of questions) {
      const userAns = answers[q.id] || ''
      if (q.type === 'fill_blank') {
        if (userAns.trim().toLowerCase() === stripPrefix(q.answer).trim().toLowerCase()) {
          correct++
        }
      } else {
        if (userAns === q.answer) {
          correct++
        }
      }
    }
    setScore(correct)
    setSubmitted(true)

    // 自动保存错题
    const records: AnswerRecord[] = questions.map((q) => ({
      question_id: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      user_answer: answers[q.id] || '',
      correct_answer: q.answer,
      explanation: q.explanation,
    }))
    try {
      const result = await submitQuizResults(topic, records)
      setSavedCount(result.saved_count)
    } catch {
      // 错题保存失败不影响答题体验
      setSavedCount(-1)
    }
  }

  const answeredCount = questions.filter((q) => answers[q.id]).length
  const allAnswered = answeredCount === questions.length && questions.length > 0

  const handleReset = () => {
    setTopic('')
    setQuestions([])
    setAnswers({})
    setSubmitted(false)
    setScore(0)
    setSavedCount(null)
    setError('')
  }

  /** 渲染单个题目 */
  const renderQuestion = (q: QuizQuestion) => {
    const userAns = answers[q.id] || ''
    let isCorrect = false
    if (submitted && userAns) {
      if (q.type === 'fill_blank') {
        isCorrect = userAns.trim().toLowerCase() === stripPrefix(q.answer).trim().toLowerCase()
      } else {
        isCorrect = userAns === q.answer
      }
    }
    const showResult = submitted && !!userAns

    return (
      <div
        key={q.id}
        className={`rounded-xl border p-4 transition-all duration-200 ${
          showResult
            ? isCorrect
              ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10'
              : 'border-red-300 bg-red-50/50 dark:border-red-700 dark:bg-red-900/10'
            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1e2130]'
        }`}
      >
        {/* 题号 + 类型标签 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-teal-500 text-white text-xs font-bold">
            {q.id}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium
            bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            {q.type === 'choice' ? '选择题' : q.type === 'true_false' ? '判断题' : '填空题'}
          </span>
          {showResult && (
            <span className={`text-xs font-medium ${isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
              {isCorrect ? '✓ 正确' : '✗ 错误'}
            </span>
          )}
        </div>

        {/* 题目 */}
        <p className="text-sm text-ink font-medium mb-3 leading-relaxed">
          {q.question.split('____').map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className="inline-block border-b-2 border-teal-400 min-w-[80px] px-2 text-teal-600 font-bold">
                  {submitted ? stripPrefix(q.answer) : '______'}
                </span>
              )}
            </span>
          ))}
        </p>

        {/* 选项 */}
        {(q.type === 'choice' || q.type === 'true_false') && q.options && (
          <div className="space-y-2">
            {q.options.map((opt) => {
              const prefix = getPrefix(opt)
              const isSelected = userAns === opt
              const isAnswer = submitted && opt === q.answer
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(q.id, opt)}
                  disabled={submitted}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-200
                    ${submitted
                      ? isAnswer
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400 text-emerald-800 dark:text-emerald-200 border'
                        : isSelected && !isAnswer
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-300 text-red-600 dark:text-red-400 border'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-500'
                      : isSelected
                        ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-300 text-teal-700 dark:text-teal-300 border'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border'
                    }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${submitted && isAnswer
                      ? 'bg-emerald-500 text-white'
                      : submitted && isSelected && !isAnswer
                        ? 'bg-red-400 text-white'
                        : isSelected
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {prefix}
                  </span>
                  <span className="flex-1">{stripPrefix(opt)}</span>
                  {submitted && isAnswer && (
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {submitted && isSelected && !isAnswer && (
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* 填空题输入 */}
        {q.type === 'fill_blank' && (
          <div className="mt-2">
            <input
              type="text"
              value={userAns}
              onChange={(e) => handleFillChange(q.id, e.target.value)}
              disabled={submitted}
              placeholder="请输入答案..."
              className={`w-full px-3 py-2 rounded-xl text-sm border bg-transparent outline-none transition-all duration-200
                ${submitted
                  ? isCorrect
                    ? 'border-emerald-400 text-emerald-700 dark:text-emerald-300'
                    : 'border-red-300 text-red-600'
                  : 'border-slate-200 dark:border-slate-700 text-ink focus:border-teal-400'
                }`}
            />
          </div>
        )}

        {/* 解析（提交后显示） */}
        {showResult && (
          <div className={`mt-3 pt-3 border-t text-xs leading-relaxed ${
            isCorrect
              ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'border-red-200 dark:border-red-800 text-slate-600 dark:text-slate-400'
          }`}>
            <span className="font-medium">解析：</span>
            {q.explanation?.replace(/^解析[：:]\s*/, '')}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* ===== 顶部栏 ===== */}
      <div className="h-12 flex items-center px-4 border-b border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-[#1e2130]/60 backdrop-blur-sm flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500">
          <path d="M4 12V4l8 4-8 4z" />
        </svg>
        <span className="ml-2 text-sm font-medium text-ink">试题练习</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 scrollbar-thin">
        <div className="max-w-3xl mx-auto">
          {/* ===== 搜索区 ===== */}
          {questions.length === 0 && !loading && (
            <div className="flex items-center justify-center min-h-[50vh] select-none">
              <div className="text-center max-w-md">
                {/* 装饰图标 */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-copper-500/10 via-copper-400/5 to-teal-500/10 mx-auto mb-6 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-copper-500/5 to-transparent" />
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4956B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                </div>

                <h2 className="font-display text-2xl font-bold text-ink mb-2">
                  知识点<span className="text-gradient-teal">试题练习</span>
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  输入一个知识点，AI 将为你生成 10 道测试题
                  <br />
                  帮助巩固和检验学习成果
                </p>

                {/* 搜索输入框 */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="7" cy="7" r="5" />
                      <path d="M11 11l3.5 3.5" />
                    </svg>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                      placeholder="输入知识点，如：矩阵乘法、微积分基本定理..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700
                        bg-white dark:bg-[#1e2130] text-sm text-ink placeholder-slate-400
                        focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30
                        transition-all duration-200"
                    />
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={!topic.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500
                      hover:from-teal-700 hover:to-teal-600 disabled:from-slate-300 disabled:to-slate-300
                      text-white rounded-xl text-sm font-medium transition-all duration-200
                      active:scale-[0.97] shadow-sm hover:shadow-md
                      disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 4h10M2 7h10M2 10h6" />
                    </svg>
                    生成试题
                  </button>
                </div>

                {/* 快捷知识点 */}
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  {[
                    '矩阵乘法',
                    '微积分基本定理',
                    'Python 列表推导式',
                    '二叉树遍历',
                    '化学反应平衡',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setTopic(q); setTimeout(() => handleGenerate(), 100) }}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700
                        text-slate-500 hover:border-copper-300 hover:text-copper-600
                        hover:bg-copper-50/50 dark:hover:bg-copper-900/20
                        transition-all duration-200 active:scale-95"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== 加载状态 ===== */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-copper-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-500 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 font-medium">正在生成试题...</p>
              <p className="text-xs text-slate-400 mt-1">AI 正在根据知识点创建题目</p>
            </div>
          )}

          {/* ===== 错误状态 ===== */}
          {error && questions.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <p className="text-sm text-red-500 font-medium">{error}</p>
              <button
                onClick={() => setError('')}
                className="mt-3 text-xs text-teal-500 hover:text-teal-600 transition-colors"
              >
                重新输入
              </button>
            </div>
          )}

          {/* ===== 题目列表 ===== */}
          {questions.length > 0 && !loading && (
            <>
              {/* 顶部操作栏 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink font-medium">共 {questions.length} 题</span>
                    <span className="text-xs text-slate-400">
                      · 已答 {answeredCount}/{questions.length}
                    </span>
                    {submitted && (
                      <span className="text-sm font-bold px-3 py-0.5 rounded-full
                        bg-gradient-to-r from-teal-500 to-teal-600 text-white"
                      >
                        {score}/{questions.length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!submitted ? (
                    <button
                      onClick={handleSubmit}
                      disabled={!allAnswered}
                      className="px-4 py-1.5 bg-gradient-to-r from-teal-600 to-teal-500
                        hover:from-teal-700 hover:to-teal-600 disabled:from-slate-300 disabled:to-slate-300
                        text-white rounded-lg text-xs font-medium transition-all duration-200
                        active:scale-[0.97] shadow-sm disabled:cursor-not-allowed"
                    >
                      提交答案
                    </button>
                  ) : (
                    <button
                      onClick={handleReset}
                      className="px-4 py-1.5 bg-gradient-to-r from-copper-500 to-copper-400
                        hover:from-copper-600 hover:to-copper-500
                        text-white rounded-lg text-xs font-medium transition-all duration-200
                        active:scale-[0.97] shadow-sm"
                    >
                      重新生成
                    </button>
                  )}
                </div>
              </div>

              {/* 题目列表 */}
              <div className="space-y-4">
                {questions.map(renderQuestion)}
              </div>

              {/* 底部结果 */}
              {submitted && (
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-teal-50 to-copper-50
                  dark:from-teal-900/20 dark:to-copper-900/10 border border-teal-200 dark:border-teal-800
                  text-center"
                >
                  <p className="text-lg font-bold text-ink">
                    得分：<span className="text-teal-600">{score}</span> / {questions.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {score === questions.length
                      ? '🎉 太棒了！全部答对！'
                      : score >= questions.length * 0.7
                        ? '👍 掌握得不错，继续加油！'
                        : score >= questions.length * 0.5
                          ? '📚 还需加强，建议复习相关知识点'
                          : '💪 不要气馁，重新学习知识点后再试一次'}
                  </p>
                  {/* 错题收录提示 */}
                  {savedCount !== null && (
                    <p className="text-xs mt-2">
                      {savedCount >= 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          📝 已自动收录 {savedCount} 道错题
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          错题收录暂不可用
                        </span>
                      )}
                    </p>
                  )}
                  <button
                    onClick={handleReset}
                    className="mt-3 px-5 py-2 bg-gradient-to-r from-teal-600 to-teal-500
                      hover:from-teal-700 hover:to-teal-600 text-white rounded-xl text-sm font-medium
                      transition-all duration-200 active:scale-[0.97] shadow-sm"
                  >
                    再来一组
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
