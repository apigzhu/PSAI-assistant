import { useState, useEffect } from 'react'
import {
  getProfile, updateProfile, changePassword, getLoginHistory,
  deleteAccount, exportData,
} from '../api/client'
import type {
  UserProfile, LoginRecord, LoginHistoryResponse,
} from '../types'
import { useAuthStore } from '../stores/authStore'

type ProfileTab = 'basic' | 'security' | 'data'

function md5(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(32, '0')
}

function getGravatarUrl(email: string, size: number = 80): string {
  const hash = md5(email.trim().toLowerCase())
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`
}

function getInitialAvatar(name: string): string {
  return name.charAt(0).toUpperCase()
}

const TAB_ITEMS: { key: ProfileTab; label: string; icon: JSX.Element }[] = [
  {
    key: 'basic',
    label: '基本信息',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    ),
  },
  {
    key: 'security',
    label: '安全设置',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="10" height="8" rx="1.5" />
        <path d="M5 7V4a3 3 0 016 0v3" />
      </svg>
    ),
  },
  {
    key: 'data',
    label: '数据管理',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1l-6 3v8l6 3 6-3V4l-6-3z" />
        <path d="M8 8l6-3M8 8v7" />
      </svg>
    ),
  },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ProfileTab>('basic')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { logout } = useAuthStore()

  // 基本信息编辑状态
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // 修改密码状态
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // 登录历史状态
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)

  // 数据管理状态
  const [exporting, setExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // 加载个人资料
  useEffect(() => {
    setLoading(true)
    getProfile()
      .then((p) => {
        setProfile(p)
        setEditUsername(p.username)
        setEditEmail(p.email)
        setEditAvatarUrl(p.avatar_url || '')
      })
      .catch(() => setError('加载个人资料失败'))
      .finally(() => setLoading(false))
  }, [])

  // 加载登录历史（切换标签或翻页时）
  useEffect(() => {
    if (activeTab === 'security') {
      getLoginHistory(historyPage)
        .then((data: LoginHistoryResponse) => {
          setLoginHistory(data.items)
          setHistoryTotal(data.total)
        })
        .catch(() => {})
    }
  }, [activeTab, historyPage])

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  // 保存基本信息
  const handleSaveProfile = async () => {
    clearMessages()
    setSavingProfile(true)
    try {
      const updated = await updateProfile({
        username: editUsername !== profile?.username ? editUsername : undefined,
        email: editEmail !== profile?.email ? editEmail : undefined,
        avatar_url: editAvatarUrl || undefined,
      })
      setProfile(updated)
      setSuccess('资料已更新')
    } catch (e: any) {
      setError(e?.response?.data?.detail || '更新失败')
    } finally {
      setSavingProfile(false)
    }
  }

  // 修改密码
  const handleChangePassword = async () => {
    clearMessages()
    if (newPassword !== confirmPassword) {
      setError('两次密码输入不一致')
      return
    }
    if (newPassword.length < 6) {
      setError('新密码长度不能少于 6 位')
      return
    }
    setChangingPassword(true)
    try {
      await changePassword(oldPassword, newPassword)
      setSuccess('密码修改成功')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      setError(e?.response?.data?.detail || '密码修改失败')
    } finally {
      setChangingPassword(false)
    }
  }

  // 导出数据
  const handleExport = async () => {
    clearMessages()
    setExporting(true)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pias-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSuccess('数据已导出')
    } catch (e: any) {
      setError(e?.response?.data?.detail || '导出失败')
    } finally {
      setExporting(false)
    }
  }

  // 注销账号
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '确认删除') return
    clearMessages()
    setDeleting(true)
    try {
      await deleteAccount()
      logout()
    } catch (e: any) {
      setError(e?.response?.data?.detail || '注销失败')
      setDeleting(false)
    }
  }

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
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {/* 页面标题 */}
        <div className="mb-5">
          <h1 className="font-display text-xl font-bold text-ink">个人中心</h1>
          <p className="text-sm text-slate-400 mt-0.5">管理你的账号和个人偏好</p>
        </div>

        {/* 成功/错误提示 */}
        {error && (
          <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600">
            {success}
          </div>
        )}

        {/* 标签页导航 */}
        <div className="flex gap-1 mb-5 p-1 bg-slate-50 rounded-xl border border-slate-100">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); clearMessages() }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                ${activeTab === tab.key
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ===== 基本信息 ===== */}
        {activeTab === 'basic' && profile && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* 头像区域 */}
            <div className="flex items-center gap-4 p-5 bg-paper-light border border-slate-100 rounded-2xl shadow-sm">
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-16 h-16 rounded-full border-2 border-slate-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                      const parent = (e.target as HTMLImageElement).parentElement
                      if (parent) {
                        const fallback = document.createElement('div')
                        fallback.className = 'w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white text-2xl font-bold flex items-center justify-center'
                        fallback.textContent = getInitialAvatar(profile.username)
                        parent.appendChild(fallback)
                      }
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white text-2xl font-bold flex items-center justify-center">
                    {getInitialAvatar(profile.username)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-ink truncate">{profile.username}</p>
                <p className="text-sm text-slate-400">{profile.email}</p>
                <p className="text-xs text-slate-400 mt-1">
                  注册于 {new Date(profile.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                {profile.last_login && (
                  <p className="text-xs text-slate-400">
                    最近登录：{new Date(profile.last_login).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
            </div>

            {/* 头像 URL 设置 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                头像 URL
              </label>
              <p className="text-xs text-slate-400 mb-2">
                输入 Gravatar 或其他头像地址，留空使用首字母头像
              </p>
              <input
                type="text"
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                placeholder="https://www.gravatar.com/avatar/..."
                className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                  transition-all duration-200 placeholder:text-slate-400"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setEditAvatarUrl(getGravatarUrl(profile.email))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-500
                    hover:border-teal-300 hover:text-teal-600 transition-all"
                >
                  使用 Gravatar
                </button>
              </div>
            </div>

            {/* 用户名 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                用户名
              </label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                  transition-all duration-200"
              />
            </div>

            {/* 邮箱 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                邮箱
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                  transition-all duration-200"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200
                text-white disabled:text-slate-400 rounded-xl text-sm font-medium
                transition-all duration-200 active:scale-[0.98]"
            >
              {savingProfile ? '保存中...' : '保存修改'}
            </button>
          </div>
        )}

        {/* ===== 安全设置 ===== */}
        {activeTab === 'security' && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* 修改密码 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-base text-ink mb-4">修改密码</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">当前密码</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">新密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少 6 位"
                    className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">确认新密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200
                    text-white disabled:text-slate-400 rounded-xl text-sm font-medium
                    transition-all duration-200 active:scale-[0.98]"
                >
                  {changingPassword ? '修改中...' : '修改密码'}
                </button>
              </div>
            </div>

            {/* 登录历史 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-base text-ink mb-4">登录历史</h3>

              {loginHistory.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">暂无登录记录</p>
              ) : (
                <div className="space-y-2">
                  {loginHistory.map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-600 truncate">
                          {log.ip_address || '未知 IP'}
                        </p>
                        {log.user_agent && (
                          <p className="text-xs text-slate-400 truncate max-w-[250px]">
                            {log.user_agent}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                        {new Date(log.login_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 登录历史分页 */}
              {historyTotal > 20 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage <= 1}
                    className="text-xs text-slate-400 hover:text-teal-600 disabled:opacity-40 px-2 py-1"
                  >
                    上一页
                  </button>
                  <span className="text-xs text-slate-400">
                    第 {historyPage} 页 / 共 {Math.ceil(historyTotal / 20)} 页
                  </span>
                  <button
                    onClick={() => setHistoryPage((p) => p + 1)}
                    disabled={historyPage >= Math.ceil(historyTotal / 20)}
                    className="text-xs text-slate-400 hover:text-teal-600 disabled:opacity-40 px-2 py-1"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== 数据管理 ===== */}
        {activeTab === 'data' && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* 导出数据 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-base text-ink mb-2">导出我的数据</h3>
              <p className="text-sm text-slate-500 mb-4">
                导出你的所有对话记录、学习路径和复习数据为 JSON 文件
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full py-2.5 bg-paper border-2 border-slate-200 hover:border-teal-300
                  text-slate-600 hover:text-teal-600 rounded-xl text-sm font-medium
                  transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 1v10M4 7l4 4 4-4M2 13v1a1 1 0 001 1h10a1 1 0 001-1v-1" />
                    </svg>
                    导出数据
                  </>
                )}
              </button>
            </div>

            {/* 注销账号 */}
            <div className="bg-paper-light border border-red-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-base text-red-600 mb-2">危险区域</h3>
              <p className="text-sm text-slate-500 mb-4">
                注销账号将永久删除你的所有数据，此操作不可撤销
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium
                    transition-all duration-200 active:scale-[0.98]"
                >
                  注销账号
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-600 font-medium">确定要注销账号吗？此操作不可撤销。</p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder='输入 "确认删除" 以继续'
                    className="w-full px-3 py-2 bg-paper border border-red-200 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500
                      transition-all duration-200 placeholder:text-slate-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleting(false) }}
                      className="flex-1 py-2.5 bg-paper border border-slate-200 text-slate-600 rounded-xl text-sm font-medium
                        transition-all duration-200 hover:bg-slate-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== '确认删除' || deleting}
                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-200
                        text-white disabled:text-slate-400 rounded-xl text-sm font-medium
                        transition-all duration-200 active:scale-[0.98]"
                    >
                      {deleting ? '注销中...' : '确认注销'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
