import { useAuthStore } from './stores/authStore'
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'

export default function App() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)

  return isLoggedIn ? <ChatPage /> : <LoginPage />
}
