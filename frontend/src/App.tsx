import { useAuthStore } from './stores/authStore'
import { isDemo } from './demo/demoApi'
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'

export default function App() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)

  return (
    <>
      {isLoggedIn ? <ChatPage /> : <LoginPage />}
      {isDemo && (
        <div
          style={{
            position: 'fixed',
            right: '12px',
            bottom: '12px',
            zIndex: 9999,
            padding: '6px 12px',
            borderRadius: '999px',
            background: 'rgba(22,27,45,0.82)',
            color: '#fff',
            fontSize: '11px',
            letterSpacing: '0.02em',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(6px)',
            pointerEvents: 'none',
          }}
        >
          演示模式 · 数据为模拟
        </div>
      )}
    </>
  )
}