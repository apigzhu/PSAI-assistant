export interface AuthResponse {
  access_token: string
  user_id: string
  username: string
}

export interface Session {
  id: string
  title: string
  created_at: string
}

export interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  memoryType?: 'semantic' | 'insight' | 'personal' | 'connecting'
  created_at?: string
}

export interface MemoryUsage {
  total: number
  max: number
  usage_ratio: number
  entry_count: number
}

export interface SSEChunk {
  type: 'user_message' | 'chunk' | 'done' | 'error'
  content?: string
  full_content?: string
}

// ========== 学习路径 ==========

export interface Milestone {
  name: string
  description: string
  order: number
  status?: 'pending' | 'in_progress' | 'completed'
  content?: MilestoneContent
}

export interface LearningPath {
  id: string
  title: string
  goal: string
  progress: number
  milestones: Milestone[]
}

// ========== 里程碑内容 ==========

export interface MilestoneContent {
  explanation: string
  key_points: string[]
  examples: string[]
  practice: string
}

// ========== 导师角色 ==========

export interface Tutor {
  id: string
  name: string
  title: string
  avatar_style: string
  theme_color: string
  tags: string[]
  description: string
  temperature: number
  is_default: boolean
}

// ========== 知识图谱 ==========

export interface KnowledgeNode {
  id: string
  label: string
  type: 'concept' | 'term' | 'formula' | 'method'
  description: string
  confidence: number
}

export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  relation: 'prerequisite' | 'derived_from' | 'related_to' | 'example_of' | 'part_of'
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

// ========== 个人中心 ==========

export interface UserProfile {
  user_id: string
  username: string
  email: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
  last_login: string | null
}

export interface LoginRecord {
  id: string
  ip_address: string | null
  user_agent: string | null
  login_at: string
}

export interface LoginHistoryResponse {
  items: LoginRecord[]
  total: number
  page: number
  page_size: number
}

/** 导航视图 */
export type ViewType = 'chat' | 'learning' | 'knowledge' | 'profile' | 'quiz' | 'wrong_answers'

// ========== 试题练习 ==========

export interface QuizQuestion {
  id: number
  type: 'choice' | 'true_false' | 'fill_blank'
  question: string
  options?: string[]
  answer: string
  explanation: string
}

export interface QuizResponse {
  topic: string
  questions: QuizQuestion[]
}

// ========== 错题集 ==========

export interface WrongAnswer {
  id: string
  topic: string
  question_type: 'choice' | 'true_false' | 'fill_blank'
  question: string
  options?: string[]
  correct_answer: string
  user_answer: string
  explanation: string
  created_at: string
}

export interface AnswerRecord {
  question_id: number
  question: string
  type: 'choice' | 'true_false' | 'fill_blank'
  options?: string[]
  user_answer: string
  correct_answer: string
  explanation: string
}
