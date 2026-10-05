import { useState, useEffect } from 'react'
import type { Tutor } from '../types'
import { listTutors, setSessionTutor } from '../api/client'

interface TutorSelectorProps {
  sessionId: string | null
  onClose: () => void
  onTutorSet: (tutor: Tutor) => void
}

function TutorAvatar({ style, color }: { style: string; color: string }) {
  const fill = color
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${fill}15` }}>
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
        {style === 'socratic' && (
          <>
            <circle cx="24" cy="18" r="8" fill={fill} opacity="0.2" />
            <circle cx="24" cy="18" r="4" fill={fill} />
            <path d="M14 36c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke={fill} strokeWidth="1.5" fill="none" />
          </>
        )}
        {style === 'drill' && (
          <>
            <rect x="14" y="12" width="20" height="22" rx="3" fill={fill} opacity="0.15" />
            <path d="M19 22l4 4 6-8" stroke={fill} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}
        {style === 'feynman' && (
          <>
            <circle cx="24" cy="18" r="8" fill={fill} opacity="0.2" />
            <path d="M16 34c0-4.5 3.5-8 8-8s8 3.5 8 8" stroke={fill} strokeWidth="1.5" fill="none" />
            <path d="M20 16l4 4 8-8" stroke={fill} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </>
        )}
        {style === 'peer' && (
          <>
            <circle cx="18" cy="18" r="6" fill={fill} opacity="0.2" />
            <circle cx="30" cy="18" r="6" fill={fill} opacity="0.2" />
            <circle cx="18" cy="18" r="3" fill={fill} />
            <circle cx="30" cy="18" r="3" fill={fill} />
            <path d="M10 36c0-5 3.5-9 8-9s8 4 8 9" stroke={fill} strokeWidth="1.5" fill="none" />
            <path d="M30 27c4.5 0 8 4 8 9" stroke={fill} strokeWidth="1.5" fill="none" />
          </>
        )}
      </svg>
    </div>
  )
}

export default function TutorSelector({ sessionId, onClose, onTutorSet }: TutorSelectorProps) {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [setting, setSetting] = useState<string | null>(null)

  useEffect(() => {
    listTutors()
      .then(setTutors)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (tutor: Tutor) => {
    if (!sessionId) return
    setSetting(tutor.name)
    try {
      await setSessionTutor(sessionId, tutor.name)
      onTutorSet(tutor)
      onClose()
    } catch {
      // ignore
    } finally {
      setSetting(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg">
        {/* 阴影光晕 */}
        <div className="absolute -inset-2 bg-gradient-to-r from-teal-500/10 to-copper-500/10 rounded-3xl blur-xl" />

        <div className="relative bg-paper-light rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* 顶部渐变条 */}
          <div className="h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-copper-500" />

          {/* ===== 头部 ===== */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">选择导师</h2>
              <p className="text-xs text-slate-400 mt-0.5">每位导师有不同的教学风格，选择最适合你的</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 4l10 10M14 4l-10 10" />
              </svg>
            </button>
          </div>

          {/* ===== 导师列表 ===== */}
          <div className="p-4 max-h-[60vh] overflow-y-auto scrollbar-thin space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            ) : (
              tutors.map((tutor) => (
                <button
                  key={tutor.id}
                  onClick={() => handleSelect(tutor)}
                  disabled={setting !== null}
                  className="w-full flex items-start gap-4 p-4 rounded-xl card-base hover:border-teal-200 dark:hover:border-teal-800 transition-all duration-200 text-left disabled:opacity-50 group"
                >
                  <TutorAvatar style={tutor.avatar_style} color={tutor.theme_color} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-ink">{tutor.title}</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 font-mono">
                        {tutor.name}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{tutor.description}</p>
                    {(tutor.tags || []).length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {(tutor.tags || []).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 self-center">
                    {setting === tutor.name ? (
                      <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            )}
            {!loading && tutors.length === 0 && (
              <div className="text-center py-10">
                <svg className="mx-auto mb-3 w-12 h-12 text-slate-200 dark:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <div className="text-sm text-slate-400">暂无导师角色</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
