import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { login, register } from '../api/client'

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = isRegister
        ? await register(username, email, password)
        : await login(username, password)
      setAuth(result.access_token, result.username, result.user_id)
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        '操作失败，请重试'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 relative overflow-hidden">
      {/* ===== 装饰性背景元素 ===== */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* 大的模糊渐变圆 */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-teal-500/8 to-teal-400/3 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-copper-500/8 to-amber-400/3 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-teal-500/3 via-transparent to-copper-500/3 blur-3xl" />

        {/* 浮动几何装饰 */}
        <div className="absolute top-1/4 right-1/4 w-24 h-24 border border-teal-200/30 rounded-2xl rotate-12 animate-pulse-slow" />
        <div className="absolute bottom-1/3 left-1/4 w-16 h-16 border border-copper-200/20 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* ===== 登录卡片 ===== */}
        <div className="relative">
          {/* 卡片阴影光晕 */}
          <div className="absolute -inset-2 bg-gradient-to-r from-teal-500/10 to-copper-500/10 rounded-3xl blur-xl" />

          <div className="relative bg-paper-light rounded-2xl shadow-lg border border-slate-100/80 overflow-hidden backdrop-blur-sm">
            {/* 顶部渐变装饰条 */}
            <div className="h-1.5 bg-gradient-to-r from-teal-500 via-teal-400 to-copper-500" />

            <div className="p-8">
              {/* ===== Logo / 品牌区 ===== */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 text-white text-xl font-bold mb-4 shadow-lg logo-pulse">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h1 className="font-display text-2xl font-bold text-ink mb-1">
                  智慧学习助理
                </h1>
                <p className="text-slate-500 text-sm font-body">
                  <span className="text-gradient-teal font-semibold">PIAS</span>
                  {' — '}你的专属 AI 学习伙伴
                </p>
              </div>

              {/* ===== 表单 ===== */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 用户名 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    用户名
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="输入你的用户名"
                      className="w-full pl-10 pr-4 py-2.5 bg-paper border border-slate-200 rounded-xl text-sm
                        focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                        transition-all duration-200 placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                {/* 邮箱（注册时） */}
                {isRegister && (
                  <div className="view-enter">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      邮箱
                    </label>
                    <div className="relative">
                      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-paper border border-slate-200 rounded-xl text-sm
                          focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                          transition-all duration-200 placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* 密码 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    密码
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isRegister ? '至少 6 位密码' : '输入你的密码'}
                      className="w-full pl-10 pr-11 py-2.5 bg-paper border border-slate-200 rounded-xl text-sm
                        focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                        transition-all duration-200 placeholder:text-slate-400"
                      required
                      minLength={isRegister ? 6 : 1}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                          <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                          <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 000 1.186A10.004 10.004 0 0010 18.172c4.258 0 7.894-2.66 9.337-6.41a1.651 1.651 0 000-1.186A10.004 10.004 0 0010 4.172c-4.258 0-7.894 2.66-9.337 6.41zM10 14.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50/80 px-3 py-2.5 rounded-lg view-enter border border-red-100">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                {/* 提交按钮 */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600
                    disabled:from-slate-300 disabled:to-slate-300 text-white font-medium rounded-xl
                    transition-all duration-200 active:scale-[0.97] text-sm flex items-center justify-center gap-2
                    shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                        <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      请稍候...
                    </>
                  ) : isRegister ? (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                      </svg>
                      创建账号
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 10a7 7 0 0111.76-4.33.75.75 0 01-1.06 1.06A5.5 5.5 0 104.5 10h2.75a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75V10z" clipRule="evenodd" />
                      </svg>
                      进入学习
                    </>
                  )}
                </button>
              </form>

              {/* ===== 切换登录/注册 ===== */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-center text-sm text-slate-500">
                  {isRegister ? '已有账号？' : '还没有账号？'}
                  <button
                    onClick={() => {
                      setIsRegister(!isRegister)
                      setError('')
                    }}
                    className="text-teal-600 hover:text-teal-700 font-medium ml-1.5 transition-colors group"
                  >
                    {isRegister ? '去登录' : '去注册'}
                    <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                      →
                    </span>
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 底部版本号 ===== */}
        <div className="flex items-center justify-center gap-3 mt-5 text-xs text-slate-400">
          <span className="font-mono">PIAS v0.1.0</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span>个性化智慧助理系统</span>
        </div>
      </div>
    </div>
  )
}
