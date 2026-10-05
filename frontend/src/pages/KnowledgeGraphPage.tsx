import { useState, useEffect } from 'react'
import type { Session } from '../types'
import { listSessions, getKnowledgeGraph, getAllKnowledgeGraph, extractKnowledge } from '../api/client'
import KnowledgeGraphView from '../components/KnowledgeGraph'
import type { KnowledgeGraph } from '../types'

type ViewMode = 'session' | 'all'

export default function KnowledgeGraphPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('session')
  const [aggStats, setAggStats] = useState<any>(null)

  // 加载会话列表并自动选中最近的一个
  useEffect(() => {
    listSessions()
      .then((list) => {
        setSessions(list)
        if (list.length > 0 && !selectedSessionId) {
          setSelectedSessionId(list[0].id)
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 根据视图模式加载图谱数据
  useEffect(() => {
    if (viewMode === 'all') {
      setLoading(true)
      setError('')
      getAllKnowledgeGraph()
        .then((data) => {
          setGraph({ nodes: data.nodes || [], edges: data.edges || [] })
          setAggStats(data.stats || null)
        })
        .catch(() => {
          setError('加载聚合知识图谱失败')
        })
        .finally(() => setLoading(false))
      return
    }

    if (!selectedSessionId) {
      setGraph(null)
      setAggStats(null)
      return
    }

    setLoading(true)
    setError('')
    getKnowledgeGraph(selectedSessionId)
      .then((data) => {
        setGraph(data)
        setAggStats(null)
      })
      .catch(() => {
        setError('加载知识图谱失败')
      })
      .finally(() => setLoading(false))
  }, [selectedSessionId, viewMode])

  const handleRefresh = async () => {
    if (viewMode === 'all') {
      setLoading(true)
      setError('')
      try {
        const data = await getAllKnowledgeGraph()
        setGraph({ nodes: data.nodes || [], edges: data.edges || [] })
        setAggStats(data.stats || null)
      } catch {
        setError('刷新失败')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!selectedSessionId) return
    setLoading(true)
    setError('')
    try {
      await extractKnowledge(selectedSessionId, '')
      const data = await getKnowledgeGraph(selectedSessionId)
      setGraph(data)
    } catch {
      setError('刷新失败')
    } finally {
      setLoading(false)
    }
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setError('')
  }

  const currentSession = sessions.find((s) => s.id === selectedSessionId)

  return (
    <div className="h-full flex flex-col view-enter">
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scrollbar-thin">
        <div className="max-w-4xl mx-auto">
          {/* ===== 页面标题 ===== */}
          <div className="mb-5">
            <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
              <svg className="w-6 h-6 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              知识图谱
            </h1>
            <p className="text-sm text-slate-400 mt-0.5 ml-9">可视化你的知识结构</p>
          </div>

          {/* ===== 视图切换 + 操作栏 ===== */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {/* 视图模式切换 */}
            <div className="flex bg-paper-light border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
              <button
                onClick={() => handleViewModeChange('session')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  viewMode === 'session'
                    ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                按会话
              </button>
              <button
                onClick={() => handleViewModeChange('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  viewMode === 'all'
                    ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                全部聚合
              </button>
            </div>

            {/* 会话选择下拉（仅会话模式） */}
            {viewMode === 'session' && (
              <div className="relative flex-1 max-w-md">
                <select
                  value={selectedSessionId ?? ''}
                  onChange={(e) => setSelectedSessionId(e.target.value || null)}
                  className="w-full px-4 py-2 bg-paper-light border border-slate-200 dark:border-slate-700 rounded-xl text-sm
                    focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                    transition-all duration-200 appearance-none cursor-pointer pl-10"
                >
                  <option value="">选择一个对话...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                  {sessions.length === 0 && (
                    <option value="" disabled>暂无对话记录</option>
                  )}
                </select>
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* 图谱统计（聚合模式） */}
            {viewMode === 'all' && aggStats && (
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  节点 {aggStats.total_nodes}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-0.5 bg-slate-400" />
                  边 {aggStats.total_edges}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  涉及 {aggStats.session_count} 个会话
                </span>
              </div>
            )}

            {/* 刷新按钮 */}
            {(viewMode === 'all' || selectedSessionId) && (
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 bg-paper-light border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500
                  hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                title="刷新图谱"
              >
                <svg
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* ===== 图谱内容 ===== */}
          {loading ? (
            <div className="flex items-center justify-center h-80 bg-paper-light rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-center">
                <div className="flex gap-1.5 justify-center mb-3">
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
                <p className="text-sm text-slate-400">加载知识图谱中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-80 bg-paper-light rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </div>
                <p className="text-sm text-red-500 mb-3">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-1.5 bg-gradient-to-r from-teal-600 to-teal-500
                    text-white rounded-lg text-xs font-medium hover:from-teal-700 hover:to-teal-600
                    transition-colors shadow-sm"
                >
                  重试
                </button>
              </div>
            </div>
          ) : viewMode === 'session' && !selectedSessionId ? (
            <div className="flex items-center justify-center h-80 bg-paper-light rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-center text-slate-400">
                <svg className="mx-auto mb-4 w-20 h-20 text-slate-200 dark:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="8" r="2" />
                  <path d="M12 12l-2 6m2-6l2 4" />
                </svg>
                <p className="text-sm font-medium">选择一个对话查看知识图谱</p>
                <p className="text-xs mt-1">从左侧下拉菜单选择一个对话</p>
              </div>
            </div>
          ) : graph && graph.nodes.length === 0 ? (
            <div className="flex items-center justify-center h-80 bg-paper-light rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-center text-slate-400">
                <svg className="mx-auto mb-4 w-20 h-20 text-slate-200 dark:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="8" r="2" />
                  <path d="M12 12l-2 6m2-6l2 4" />
                </svg>
                <p className="text-sm font-medium">暂未提取到知识节点</p>
                <p className="text-xs mt-1">在对话中发送学习相关内容即可自动生成</p>
              </div>
            </div>
          ) : (
            <div className="view-enter">
              {/* 会话/聚合信息 */}
              {viewMode === 'session' && currentSession && (
                <div className="flex items-center gap-2 mb-4 px-1">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <span className="text-sm text-slate-500">
                    当前会话：
                    <span className="text-ink font-medium">{currentSession.title}</span>
                  </span>
                </div>
              )}
              {viewMode === 'all' && aggStats && (
                <div className="flex items-center gap-2 mb-4 px-1">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  <span className="text-sm text-slate-500">
                    全部会话聚合 · 共
                    <span className="text-ink font-medium"> {aggStats.total_nodes} </span>
                    个知识点、
                    <span className="text-ink font-medium">{aggStats.total_edges}</span>
                    条关联
                  </span>
                </div>
              )}

              {/* 图谱可视化 */}
              <div className="relative">
                <KnowledgeGraphView
                  graph={graph || { nodes: [], edges: [] }}
                  width={800}
                  height={500}
                />
              </div>

              {/* 节点列表 */}
              {graph && graph.nodes.length > 0 && (
                <div className="mt-5">
                  <details className="group card-base p-4" open>
                    <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-ink transition-colors select-none flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                        </svg>
                        概念列表（{graph.nodes.length}）
                      </span>
                      <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </summary>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {graph.nodes.map((node) => (
                        <span
                          key={node.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-paper-light border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:border-teal-200 dark:hover:border-teal-800 transition-colors"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                node.type === 'concept' ? '#3A7B7D'
                                  : node.type === 'term' ? '#D4956B'
                                    : node.type === 'formula' ? '#7C3AED'
                                      : '#2563EB',
                            }}
                          />
                          {node.label}
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-slate-400">
                            {node.type === 'concept' ? '概念' :
                             node.type === 'term' ? '术语' :
                             node.type === 'formula' ? '公式' : '方法'}
                          </span>
                        </span>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
