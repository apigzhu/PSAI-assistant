import type { AxiosAdapter, AxiosResponse } from 'axios'
import type {
  AuthResponse, Session, Message, MemoryUsage, SSEChunk, Tutor,
  LearningPath, Milestone, MilestoneContent, KnowledgeGraph,
  UserProfile, LoginHistoryResponse, QuizResponse, QuizQuestion,
  WrongAnswer, AnswerRecord,
} from '../types'

/**
 * 演示模式（GitHub Pages 静态部署用）
 *
 * 通过 VITE_DEMO=true 开启：所有后端请求都被本地 mock 拦截，
 * 无需数据库 / Redis / LLM Key 即可完整浏览界面与交互。
 */
export const isDemo = import.meta.env.VITE_DEMO === 'true'

/* ============ 演示模式：自动登录，直接进入应用 ============ */
if (isDemo && typeof localStorage !== 'undefined') {
  localStorage.setItem('pias_token', 'demo-token')
  localStorage.setItem('pias_username', 'demo_user')
  localStorage.setItem('pias_userId', 'u-demo')
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ==================== 模拟数据 ==================== */

const tutors: Tutor[] = [
  {
    id: 't-socratic', name: '苏格拉底导师', title: '启发式追问', avatar_style: 'socratic',
    theme_color: '#3A7B7D', tags: ['引导提问', '批判性思维'],
    description: '不直接给答案，通过连续追问引导你自己想通。', temperature: 0.7, is_default: true,
  },
  {
    id: 't-explain', name: '精讲导师', title: '系统讲解', avatar_style: 'drill',
    theme_color: '#4F6BED', tags: ['概念精讲', '例题演练'],
    description: '把知识点拆解开，配例题一步步讲透。', temperature: 0.5, is_default: false,
  },
  {
    id: 't-feynman', name: '费曼导师', title: '以教代学', avatar_style: 'feynman',
    theme_color: '#D4956B', tags: ['通俗类比', '查漏补缺'],
    description: '用最简单的话把知识讲出来，讲不清就是没学会。', temperature: 0.8, is_default: false,
  },
  {
    id: 't-peer', name: '同伴导师', title: '一起讨论', avatar_style: 'peer',
    theme_color: '#7C3AED', tags: ['伙伴式', '轻松讨论'],
    description: '像同学一样和你一起讨论、互相提问。', temperature: 0.9, is_default: false,
  },
]

let sessions: Session[] = [
  { id: 's-1', title: 'Python 数据分析入门', created_at: '2026-09-28T10:20:00Z' },
  { id: 's-2', title: '理解梯度下降', created_at: '2026-09-25T14:05:00Z' },
  { id: 's-3', title: '英语写作：议论文结构', created_at: '2026-09-20T09:00:00Z' },
]

const messagesBySession: Record<string, Message[]> = {
  's-1': [
    { id: 'm-1', role: 'user', content: '我想学 Python 数据分析，应该从哪里开始？', created_at: '2026-09-28T10:20:00Z' },
    {
      id: 'm-2', role: 'assistant', memoryType: 'semantic',
      content: '入门数据分析，建议按这条主线走：\n\n1. Python 基础语法（变量、列表、字典、循环、函数）\n2. NumPy——先把数组和向量化运算搞明白\n3. Pandas——数据分析的核心，重点掌握 DataFrame 的筛选、分组、聚合\n4. Matplotlib / Seaborn——把结论画出来\n5. 找一个真实数据集做完整项目\n\n你现在有编程基础吗？我可以据此把计划调整得更细。',
      created_at: '2026-09-28T10:20:08Z',
    },
    { id: 'm-3', role: 'user', content: '学过一点 Python，但没接触过数据分析。', created_at: '2026-09-28T10:22:00Z' },
    {
      id: 'm-4', role: 'assistant', memoryType: 'personal',
      content: '那你的起点很合适。既然有语法基础，可以直接从 NumPy 切入，不用再回头补基础。\n\n给你一个 4 周节奏：\n• 第 1 周：NumPy 数组、广播、向量化\n• 第 2 周：Pandas 读写数据、清洗、筛选\n• 第 3 周：分组聚合 + 可视化\n• 第 4 周：用一份真实数据（比如某城市房价）做完整分析报告\n\n要不要我把它整理成一份可跟踪的学习路径？',
      created_at: '2026-09-28T10:22:10Z',
    },
  ],
  's-2': [
    { id: 'm-5', role: 'user', content: '梯度下降到底在做什么？', created_at: '2026-09-25T14:05:00Z' },
    {
      id: 'm-6', role: 'assistant', memoryType: 'insight',
      content: '想象你在浓雾里的山坡上，要走到谷底，但只能看到脚下这一小块。\n\n梯度就是「最陡的上坡方向」，所以梯度下降就是每次都朝它的反方向迈一小步。这个「一小步」的大小就是学习率：\n• 步子太小 → 走得慢，半天到不了谷底\n• 步子太大 → 可能一步跨过谷底，来回震荡甚至发散\n\n参数更新的核心公式就是：θ ← θ − η·∇J(θ)。\n\n你觉得如果学习率设得特别大，损失曲线会是什么样子？',
      created_at: '2026-09-25T14:05:12Z',
    },
    { id: 'm-7', role: 'user', content: '会上下剧烈震荡吧？', created_at: '2026-09-25T14:06:30Z' },
    {
      id: 'm-8', role: 'assistant', memoryType: 'connecting',
      content: '对，而且严重时损失会越来越大，直接发散（NaN）。\n\n这和你刚才说的「震荡」是同一个原因：步长超过了地形本身的尺度。实践中常用这几招：\n1. 用较小的学习率（如 1e-3）起步\n2. 用学习率衰减或 Adam 这类自适应优化器\n3. 对输入做归一化，让各维度尺度接近\n\n你已经抓住了直觉，接下来可以自己跑一段代码看看损失曲线。',
      created_at: '2026-09-25T14:06:45Z',
    },
  ],
  's-3': [
    { id: 'm-9', role: 'user', content: '英语议论文的结构应该怎么安排？', created_at: '2026-09-20T09:00:00Z' },
    {
      id: 'm-10', role: 'assistant', memoryType: 'semantic',
      content: '英语议论文最稳的结构是「总—分—总」五段式：\n\n1. 引言段：引出话题 + 明确论点（thesis statement）\n2. 论点一：主题句 + 论据 + 例证\n3. 论点二：主题句 + 论据 + 例证\n4. 让步段：承认反方合理之处，再反驳\n5. 结论段：重申论点 + 升华\n\n关键在引言段那句 thesis statement——它决定了整篇文章的骨架。要不要拿一个具体题目练一下？',
      created_at: '2026-09-20T09:00:10Z',
    },
  ],
}

const memoryUsage: MemoryUsage = {
  total: 1240, max: 128000, usage_ratio: 0.0097, entry_count: 6,
}

let learningPath: LearningPath | null = {
  id: 'lp-1',
  title: 'Python 数据分析学习路径',
  goal: '在 3 个月内掌握 Python 数据分析',
  progress: 40,
  milestones: [
    { name: 'Python 基础语法', description: '变量、数据类型、控制流与函数', order: 0, status: 'completed' },
    { name: 'NumPy 数组与向量化', description: 'ndarray、广播机制、向量化运算', order: 1, status: 'completed' },
    { name: 'Pandas 数据处理', description: 'DataFrame 筛选、清洗、分组聚合', order: 2, status: 'in_progress' },
    { name: '数据可视化', description: '用 Matplotlib / Seaborn 表达结论', order: 3, status: 'pending' },
    { name: '综合实战项目', description: '用真实数据集完成一份分析报告', order: 4, status: 'pending' },
  ],
}

const milestoneContents: MilestoneContent[] = [
  {
    explanation: 'Python 基础语法是后续一切操作的地基，重点在于理解数据类型与作用域，而不是死记语法。',
    key_points: ['变量与动态类型', '列表 / 字典 / 元组的适用场景', 'for / while 与推导式', '函数、参数与返回值'],
    examples: ['用字典统计一段文本中每个词出现的次数', '用列表推导式筛选出所有偶数'],
    practice: '写一个函数，接收一个整数列表，返回其中所有素数的平方。',
  },
  {
    explanation: 'NumPy 的核心是 ndarray 和向量化：把循环交给底层 C 实现，代码更短、速度更快。',
    key_points: ['ndarray 的 shape / dtype', '广播（broadcasting）规则', '布尔索引', '向量化替代显式循环'],
    examples: ['arr[arr > 0] 筛选正数', '用广播对矩阵每一列做标准化'],
    practice: '给定一个 1000×5 的随机矩阵，用向量化方式把每一列归一化到 [0,1]。',
  },
  {
    explanation: 'Pandas 是数据分析的主力工具，DataFrame 可以理解为「带标签的二维表」，绝大多数分析都在它上面完成。',
    key_points: ['read_csv / to_csv', 'loc 与 iloc 的区别', '缺失值处理 dropna / fillna', 'groupby 分组聚合'],
    examples: ['df.groupby("city")["price"].mean()', 'df.dropna(subset=["age"])'],
    practice: '加载一份销售数据，按月份统计总销售额，并找出增长最快的品类。',
  },
  {
    explanation: '可视化的目的不是「画得漂亮」，而是让结论一眼可见，所以先想清楚要表达什么，再选图型。',
    key_points: ['折线图看趋势', '柱状图比大小', '散点图看相关性', '热力图看多维关系'],
    examples: ['用折线图展示月度趋势', '用散点图观察变量相关性'],
    practice: '用同一份数据分别画折线图和柱状图，比较哪种更能说明趋势。',
  },
  {
    explanation: '综合项目检验的是「从问题到结论」的完整链路，而不是某个单独的知识点。',
    key_points: ['明确分析问题', '数据清洗与特征构造', '选择合适的方法与图表', '输出结论与建议'],
    examples: ['房价影响因素分析', '用户流失特征分析'],
    practice: '选一份公开数据集，写出一份包含背景、方法、结论的分析报告。',
  },
]

let profile: UserProfile = {
  user_id: 'u-demo', username: 'demo_user', email: 'demo@pias.dev',
  avatar_url: null, is_active: true,
  created_at: '2026-09-01T08:00:00Z', last_login: '2026-10-05T09:30:00Z',
}

const loginHistory: LoginHistoryResponse = {
  items: [
    { id: 'l-1', ip_address: '114.86.12.34', user_agent: 'Chrome / Windows', login_at: '2026-10-05T09:30:00Z' },
    { id: 'l-2', ip_address: '114.86.12.34', user_agent: 'Chrome / Windows', login_at: '2026-10-04T21:14:00Z' },
    { id: 'l-3', ip_address: '10.20.30.40', user_agent: 'Safari / macOS', login_at: '2026-10-02T08:05:00Z' },
  ],
  total: 3, page: 1, page_size: 20,
}

const knowledgeGraph: KnowledgeGraph = {
  nodes: [
    { id: 'n1', label: 'Python', type: 'concept', description: '编程语言基础', confidence: 0.95 },
    { id: 'n2', label: 'NumPy', type: 'term', description: '数值计算库', confidence: 0.92 },
    { id: 'n3', label: '向量化', type: 'concept', description: '避免显式循环', confidence: 0.8 },
    { id: 'n4', label: 'Pandas', type: 'term', description: '数据处理库', confidence: 0.9 },
    { id: 'n5', label: 'DataFrame', type: 'concept', description: '带标签的二维数据结构', confidence: 0.88 },
    { id: 'n6', label: '数据清洗', type: 'method', description: '处理缺失值与异常值', confidence: 0.82 },
    { id: 'n7', label: '分组聚合', type: 'method', description: 'groupby 统计', confidence: 0.79 },
    { id: 'n8', label: 'Matplotlib', type: 'term', description: '数据可视化库', confidence: 0.76 },
    { id: 'n9', label: '相关性', type: 'formula', description: '变量之间的相关程度', confidence: 0.7 },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', relation: 'prerequisite' },
    { id: 'e2', source: 'n2', target: 'n3', relation: 'part_of' },
    { id: 'e3', source: 'n2', target: 'n4', relation: 'related_to' },
    { id: 'e4', source: 'n4', target: 'n5', relation: 'part_of' },
    { id: 'e5', source: 'n5', target: 'n6', relation: 'derived_from' },
    { id: 'e6', source: 'n5', target: 'n7', relation: 'derived_from' },
    { id: 'e7', source: 'n4', target: 'n8', relation: 'related_to' },
    { id: 'e8', source: 'n7', target: 'n9', relation: 'derived_from' },
  ],
}

let wrongAnswers: WrongAnswer[] = [
  {
    id: 'w-1', topic: 'Pandas 数据处理', question_type: 'choice',
    question: '在 Pandas 中，按某一列对数据分组并计算均值，应使用下列哪个方法？',
    options: ['A. df.sort_values()', 'B. df.groupby().mean()', 'C. df.merge()', 'D. df.pivot()'],
    correct_answer: 'B', user_answer: 'A',
    explanation: 'groupby 负责分组，随后接聚合函数（如 mean）即可按组计算统计量。',
    created_at: '2026-09-29T19:20:00Z',
  },
  {
    id: 'w-2', topic: '梯度下降', question_type: 'true_false',
    question: '学习率设置得越大，模型一定收敛得越快。',
    options: ['A. 正确', 'B. 错误'],
    correct_answer: 'B', user_answer: 'A',
    explanation: '学习率过大会导致震荡甚至发散，并非越大越好。',
    created_at: '2026-09-26T10:02:00Z',
  },
]

const quizBank: QuizQuestion[] = [
  {
    id: 1, type: 'choice',
    question: '在 Pandas 中读取 CSV 文件并返回 DataFrame 的函数是？',
    options: ['A. pd.read_csv()', 'B. pd.load()', 'C. pd.open()', 'D. pd.csv()'],
    answer: 'A', explanation: 'pd.read_csv() 是读取 CSV 的标准方法，支持丰富的参数。',
  },
  {
    id: 2, type: 'true_false',
    question: 'DataFrame 的 loc 用于按标签索引，iloc 用于按位置索引。',
    options: ['A. 正确', 'B. 错误'],
    answer: 'A', explanation: 'loc 按标签，iloc 按整数位置，这是两者最核心的区别。',
  },
  {
    id: 3, type: 'fill_blank',
    question: '要把 DataFrame 中的缺失值删除，可以使用 df.____() 方法。',
    answer: 'dropna', explanation: 'dropna() 会删除包含缺失值的行或列，可用 subset 指定范围。',
  },
]

/* ==================== 会话内回复生成 ==================== */

function buildReply(question: string): string {
  const q = question.toLowerCase()
  if (q.includes('pandas') || q.includes('数据')) {
    return '好问题！用 Pandas 处理这类任务，可以按这个顺序展开：\n\n1. 先看数据长什么样：df.head()、df.info()、df.describe()\n2. 处理缺失值：df.dropna() 或 df.fillna()\n3. 筛选出你关心的子集：df[df["列名"] > 阈值]\n4. 分组聚合：df.groupby("类别")["指标"].sum()\n5. 把结果可视化，验证你的判断\n\n简单来说：先理解数据，再清洗，最后聚合。你可以先跑一遍 df.info()，看看有没有意外的空值。'
  }
  if (q.includes('梯度') || q.includes('学习率')) {
    return '用一句话概括：梯度下降就是「沿着最陡的下坡方向，一小步一小步走向最低点」。\n\n三个关键点：\n• 梯度 ∇J 指向上升最快的方向，所以要往它的反方向走\n• 学习率 η 决定每步迈多大，太大震荡、太小太慢\n• 更新公式：θ ← θ − η·∇J(θ)\n\n如果你在调试，可以先画出损失曲线：它应该是平滑下降的，如果上下剧烈跳动，多半是学习率太大了。'
  }
  if (q.includes('英语') || q.includes('作文') || q.includes('写作')) {
    return '写作类问题，建议先搭骨架再填内容：\n\n1. 引言：一句话点题，给出明确的中心论点\n2. 主体两段：每段一个论点，配例子或数据\n3. 让步段：先承认对方合理之处，再反驳，显得更客观\n4. 结论：重申论点并升华，不要引入新观点\n\n先别纠结用词，把结构写清楚，分数就不会低。'
  }
  return '收到，这是个很好的问题。让我帮你把它拆开看：\n\n1. 先明确你要解决的核心问题是什么\n2. 找到它依赖的前置知识，检查你有没有缺口\n3. 用一个最小的例子把它跑通，再逐步扩展\n\n学习新东西时，最快的路径往往不是「看更多」，而是「先动手做一个最小的例子」。你可以先试一步，把结果发我，我们再一起看哪里需要调整。'
}

function chunkText(text: string, size = 6): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + size))
    i += size
  }
  return chunks
}

export async function* demoMessageStream(_sessionId: string, content: string): AsyncGenerator<SSEChunk> {
  await sleep(500)
  const reply = buildReply(content)
  for (const piece of chunkText(reply, 4)) {
    await sleep(28)
    yield { type: 'chunk', content: piece }
  }
  yield { type: 'done', full_content: reply }
}

/* ==================== 路由 ==================== */

function parseBody(data: unknown): any {
  if (typeof data === 'string') {
    try { return JSON.parse(data) } catch { return {} }
  }
  return data ?? {}
}

function progressOf(milestones: Milestone[]) {
  const total = milestones.length
  const completed = milestones.filter((m) => m.status === 'completed').length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  return { milestones, progress, completed, total }
}

function route(method: string, url: string, body: any, params: any): any {
  const path = url.split('?')[0]

  /* -------- 认证 -------- */
  if (method === 'post' && (path === '/auth/login' || path === '/auth/register')) {
    const auth: AuthResponse = { access_token: 'demo-token', user_id: 'u-demo', username: body?.username || 'demo_user' }
    return auth
  }
  if (method === 'get' && path === '/auth/profile') return profile
  if (method === 'patch' && path === '/auth/profile') {
    if (body?.username) profile = { ...profile, username: body.username }
    if (body?.email) profile = { ...profile, email: body.email }
    if (body?.avatar_url !== undefined) profile = { ...profile, avatar_url: body.avatar_url || null }
    return profile
  }
  if (method === 'post' && path === '/auth/change-password') return null
  if (method === 'get' && path === '/auth/login-history') {
    const page = Number(params?.page ?? 1)
    return { ...loginHistory, page }
  }
  if (method === 'delete' && path === '/auth/account') return null
  if (method === 'get' && path === '/auth/export-data') {
    return { profile, sessions: sessions.length, exported_at: nowIso() }
  }

  /* -------- 会话 -------- */
  if (method === 'get' && path === '/chat/sessions') return sessions
  if (method === 'post' && path === '/chat/sessions') {
    const s: Session = { id: 's-' + Date.now(), title: body?.title || '新对话', created_at: nowIso() }
    sessions = [s, ...sessions]
    messagesBySession[s.id] = []
    return s
  }
  const msgMatch = path.match(/^\/chat\/sessions\/([^/]+)\/messages$/)
  if (msgMatch) {
    const sid = msgMatch[1]
    if (method === 'get') return messagesBySession[sid] ?? []
    if (method === 'post') return { accepted: true }
  }
  const memMatch = path.match(/^\/chat\/sessions\/([^/]+)\/memory$/)
  if (method === 'get' && memMatch) return memoryUsage
  const delSession = path.match(/^\/chat\/sessions\/([^/]+)$/)
  if (method === 'delete' && delSession) {
    sessions = sessions.filter((s) => s.id !== delSession[1])
    return null
  }

  /* -------- 导师 -------- */
  if (method === 'get' && path === '/tutors') return tutors
  if (method === 'post' && /^\/tutors\/sessions\/[^/]+\/tutor$/.test(path)) {
    return { tutor_name: body?.tutor_name, set_at: nowIso() }
  }

  /* -------- 学习路径 -------- */
  if (method === 'get' && path === '/learning/path') return learningPath
  if (method === 'post' && path === '/learning/path') {
    learningPath = {
      id: 'lp-' + Date.now(), title: body?.goal || '我的学习路径',
      goal: body?.goal || '自定义学习目标', progress: 0,
      milestones: [
        { name: '基础概念', description: '建立整体认知框架', order: 0, status: 'in_progress' },
        { name: '核心方法', description: '掌握最常用的方法与工具', order: 1, status: 'pending' },
        { name: '动手练习', description: '通过小例子巩固理解', order: 2, status: 'pending' },
        { name: '综合实战', description: '完成一个完整项目', order: 3, status: 'pending' },
      ],
    }
    return learningPath
  }
  const progressMatch = path.match(/^\/learning\/path\/([^/]+)\/progress$/)
  if (method === 'get' && progressMatch) return progressOf(learningPath?.milestones ?? [])
  const toggleMatch = path.match(/^\/learning\/path\/([^/]+)\/milestones\/(\d+)$/)
  if (method === 'patch' && toggleMatch) {
    const idx = Number(toggleMatch[2])
    if (learningPath && learningPath.milestones[idx]) {
      const status: Milestone['status'] = body?.status === 'completed' ? 'completed' : 'pending'
      const ms = learningPath.milestones.map((m, i) => (i === idx ? { ...m, status } : m))
      learningPath = { ...learningPath, milestones: ms, progress: progressOf(ms).progress }
    }
    return progressOf(learningPath?.milestones ?? [])
  }
  const contentMatch = path.match(/^\/learning\/path\/([^/]+)\/milestones\/(\d+)\/content$/)
  if (method === 'post' && contentMatch) {
    const idx = Number(contentMatch[2])
    return milestoneContents[idx % milestoneContents.length]
  }

  /* -------- 知识图谱 -------- */
  if (method === 'post' && path === '/knowledge/extract') {
    return { extracted: 3, nodes: knowledgeGraph.nodes.length }
  }
  if (method === 'get' && path === '/knowledge/graph') {
    return { ...knowledgeGraph, stats: { nodes: knowledgeGraph.nodes.length, edges: knowledgeGraph.edges.length, sessions: sessions.length } }
  }
  const graphMatch = path.match(/^\/knowledge\/graph\/([^/]+)$/)
  if (method === 'get' && graphMatch) return knowledgeGraph

  /* -------- 试题 / 错题 -------- */
  if (method === 'post' && path === '/quiz/generate') {
    const resp: QuizResponse = { topic: body?.topic || '综合练习', questions: quizBank }
    return resp
  }
  if (method === 'post' && path === '/quiz/submit') {
    const answers: AnswerRecord[] = body?.answers ?? []
    let saved = 0
    for (const a of answers) {
      if (a.user_answer && a.user_answer !== a.correct_answer) {
        wrongAnswers = [
          {
            id: 'w-' + Date.now() + '-' + saved, topic: body?.topic || '综合练习',
            question_type: a.type, question: a.question, options: a.options,
            correct_answer: a.correct_answer, user_answer: a.user_answer,
            explanation: a.explanation, created_at: nowIso(),
          },
          ...wrongAnswers,
        ]
        saved++
      }
    }
    return { saved_count: saved }
  }
  if (method === 'get' && path === '/quiz/wrong-answers') {
    if (params?.topic) return wrongAnswers.filter((w) => w.topic === params.topic)
    return wrongAnswers
  }
  const waMatch = path.match(/^\/quiz\/wrong-answers\/([^/]+)$/)
  if (method === 'delete' && waMatch) {
    wrongAnswers = wrongAnswers.filter((w) => w.id !== waMatch[1])
    return null
  }

  return null
}

function nowIso() {
  return new Date().toISOString()
}

/* ==================== Axios 适配器 ==================== */

export const demoAdapter: AxiosAdapter = async (config) => {
  const method = (config.method || 'get').toLowerCase()
  const url = config.url || ''
  const body = parseBody(config.data)
  const latency = 150 + Math.floor(Math.random() * 250)
  await sleep(latency)

  const result = route(method, url, body, config.params)

  return {
    data: { code: 0, data: result, message: 'ok' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  } as AxiosResponse
}