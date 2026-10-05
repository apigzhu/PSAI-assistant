import axios from 'axios'
import type {
  AuthResponse, Session, SSEChunk, Message,
  LearningPath, Tutor, KnowledgeGraph,
  UserProfile, LoginHistoryResponse,
  MilestoneContent, QuizResponse,
  WrongAnswer, AnswerRecord,
} from '../types'
import { isDemo, demoAdapter, demoMessageStream } from '../demo/demoApi'

const api = axios.create({
  baseURL: '/api',
  adapter: isDemo ? demoAdapter : undefined,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pias_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (e) => {
    // 登录和注册接口返回 401/409 不应触发跳转
    const isLoginRequest = e.config?.url?.includes('/auth/login')
    const isRegisterRequest = e.config?.url?.includes('/auth/register')
    if (e.response?.status === 401 && !isLoginRequest && !isRegisterRequest) {
      localStorage.removeItem('pias_token')
      localStorage.removeItem('pias_username')
      localStorage.removeItem('pias_userId')
      window.location.href = '/'
    }
    return Promise.reject(e)
  }
)

// ========== 认证 ==========

export async function register(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const resp = await api.post('/auth/register', { username, email, password })
  return resp.data.data
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  const resp = await api.post('/auth/login', { username, password })
  return resp.data.data
}

// ========== 会话 ==========

export async function createSession(title: string): Promise<Session> {
  const resp = await api.post('/chat/sessions', { title })
  return resp.data.data
}

export async function listSessions(): Promise<Session[]> {
  const resp = await api.get('/chat/sessions')
  return resp.data.data
}

export async function* sendMessageStream(
  sessionId: string,
  content: string
): AsyncGenerator<SSEChunk> {
  if (isDemo) {
    yield* demoMessageStream(sessionId, content)
    return
  }

  const token = localStorage.getItem('pias_token')

  const resp = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  })

  if (!resp.ok) {
    throw new Error('发送消息失败')
  }

  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data: SSEChunk = JSON.parse(line.slice(6))
          yield data
        } catch {
          // skip malformed JSON
        }
      }
    }
  }
}

export async function getSessionMessages(sessionId: string): Promise<Message[]> {
  const resp = await api.get(`/chat/sessions/${sessionId}/messages`)
  return resp.data.data
}

export async function getMemoryUsage(sessionId: string) {
  const resp = await api.get(`/chat/sessions/${sessionId}/memory`)
  return resp.data.data
}

export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/chat/sessions/${sessionId}`)
}

// ========== 学习路径 ==========

export async function createLearningPath(goal: string): Promise<LearningPath> {
  const resp = await api.post('/learning/path', { goal })
  return resp.data.data
}

export async function getLearningPath(): Promise<LearningPath | null> {
  const resp = await api.get('/learning/path')
  return resp.data.data
}

export async function getPathProgress(pathId: string) {
  const resp = await api.get(`/learning/path/${pathId}/progress`)
  return resp.data.data
}

export async function toggleMilestone(
  pathId: string,
  index: number,
  status: 'completed' | 'pending'
): Promise<{ milestones: any[]; progress: number; completed: number; total: number }> {
  const resp = await api.patch(`/learning/path/${pathId}/milestones/${index}`, { status })
  return resp.data.data
}

export async function getMilestoneContent(
  pathId: string,
  index: number
): Promise<MilestoneContent> {
  const resp = await api.post(`/learning/path/${pathId}/milestones/${index}/content`)
  return resp.data.data
}

// ========== 导师角色 ==========

export async function listTutors(): Promise<Tutor[]> {
  const resp = await api.get('/tutors')
  return resp.data.data
}

export async function setSessionTutor(sessionId: string, tutorName: string) {
  const resp = await api.post(`/tutors/sessions/${sessionId}/tutor`, { tutor_name: tutorName })
  return resp.data.data
}

// ========== 知识图谱 ==========

export async function extractKnowledge(sessionId: string, recentContent: string) {
  const resp = await api.post('/knowledge/extract', { session_id: sessionId, recent_content: recentContent })
  return resp.data.data
}

export async function getKnowledgeGraph(sessionId: string): Promise<KnowledgeGraph> {
  const resp = await api.get(`/knowledge/graph/${sessionId}`)
  return resp.data.data
}

export async function getAllKnowledgeGraph(): Promise<KnowledgeGraph & { stats?: any }> {
  const resp = await api.get('/knowledge/graph')
  return resp.data.data
}

// ========== 个人中心 ==========

export async function getProfile(): Promise<UserProfile> {
  const resp = await api.get('/auth/profile')
  return resp.data.data
}

export async function updateProfile(data: {
  username?: string
  email?: string
  avatar_url?: string
}): Promise<UserProfile> {
  const resp = await api.patch('/auth/profile', data)
  return resp.data.data
}

export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  await api.post('/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}

export async function getLoginHistory(
  page: number = 1,
  pageSize: number = 20
): Promise<LoginHistoryResponse> {
  const resp = await api.get('/auth/login-history', {
    params: { page, page_size: pageSize },
  })
  return resp.data.data
}

export async function deleteAccount(): Promise<void> {
  await api.delete('/auth/account')
}

export async function exportData(): Promise<any> {
  const resp = await api.get('/auth/export-data')
  return resp.data.data
}

// ========== 试题练习 ==========

export async function generateQuiz(topic: string): Promise<QuizResponse> {
  const resp = await api.post('/quiz/generate', { topic })
  return resp.data.data
}

// ========== 错题集 ==========

export async function submitQuizResults(
  topic: string,
  answers: AnswerRecord[]
): Promise<{ saved_count: number }> {
  const resp = await api.post('/quiz/submit', { topic, answers })
  return resp.data.data
}

export async function getWrongAnswers(topic?: string): Promise<WrongAnswer[]> {
  const params = topic ? { topic } : {}
  const resp = await api.get('/quiz/wrong-answers', { params })
  return resp.data.data
}

export async function deleteWrongAnswer(id: string): Promise<void> {
  await api.delete(`/quiz/wrong-answers/${id}`)
}
