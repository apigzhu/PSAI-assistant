# 错题集功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有试题练习功能基础上，增加错题自动收录与查看功能

**Architecture:** 后端新增 WrongAnswer ORM 模型和 submit/list/delete 三个 API，前端新增 WrongAnswersPage 页面、修改 QuizPanel 在提交答案后保存错题、修改 ChatPage 侧边栏添加导航入口

**Tech Stack:** Python FastAPI + SQLAlchemy (async), React + TypeScript + Zustand

## Global Constraints

- 所有 datetime 列使用 `DateTime(timezone=True)` + `server_default=func.now()`
- UUID 作为字符串主键 (`String(36)`, `default=lambda: str(uuid.uuid4())`)
- API 返回格式统一为 `{ "code": 0, "data": ..., "message": "ok" }`
- 所有新端点需认证依赖 `get_current_user`
- 前端遵循现有组件样式和设计令牌（teal-500 primary, copper-500 secondary）

---

### Task 1: 后端 — 新增 WrongAnswer ORM 模型

**Files:**
- Modify: `backend/app/db/models.py`

**Interfaces:**
- Produces: `WrongAnswer` ORM class with fields: id, user_id, topic, question_type, question, options, correct_answer, user_answer, explanation, created_at

- [ ] **Step 1: 添加 WrongAnswer 模型到 models.py**

在 `backend/app/db/models.py` 末尾添加新模型：

```python
class WrongAnswer(Base):
    """错题记录——自动收录用户答错的试题"""
    __tablename__ = "wrong_answers"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    topic: Mapped[str] = mapped_column(String(200), nullable=False)
    question_type: Mapped[str] = mapped_column(String(20), nullable=False)  # choice | true_false | fill_blank
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)  # JSON array
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    user_answer: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

同时确保文件顶部已有导入：`import uuid` 和 `from datetime import datetime`（已存在）。

- [ ] **Step 2: 验证模型导入无误**

运行：
```bash
cd backend && python -c "from app.db.models import WrongAnswer; print('OK')"
```
预期输出：`OK`

- [ ] **Step 3: 提交**

```bash
cd C:\Users\LENOVO\Desktop\pias
git add backend/app/db/models.py
git commit -m "feat: add WrongAnswer ORM model for wrong answer collection"
```

---

### Task 2: 后端 — 新增错题集 API 端点

**Files:**
- Modify: `backend/app/api/quiz.py`

**Interfaces:**
- Consumes: `WrongAnswer` model, `get_current_user` dependency
- Produces:
  - `POST /api/quiz/submit` — 提交答题结果，自动保存错题
  - `GET /api/quiz/wrong-answers` — 获取当前用户错题列表
  - `DELETE /api/quiz/wrong-answers/{id}` — 删除单条错题

- [ ] **Step 1: 在 quiz.py 中添加 submit 和 list/delete 端点**

在文件末尾（`_shuffle_choice_options` 函数之前或之后）添加以下代码：

```python
# ========== 错题集 ==========

class AnswerRecord(BaseModel):
    question_id: int
    question: str
    type: str  # choice | true_false | fill_blank
    options: list[str] | None = None
    user_answer: str
    correct_answer: str
    explanation: str


class SubmitQuizRequest(BaseModel):
    topic: str
    answers: list[AnswerRecord]


@router.post("/submit")
async def submit_quiz(
    req: SubmitQuizRequest,
    user: User = Depends(get_current_user),
):
    """提交答题结果，自动保存错题"""
    if not req.topic or not req.answers:
        raise HTTPException(status_code=400, detail="参数不完整")

    saved_count = 0
    from app.db.database import async_session

    async with async_session() as session:
        for ans in req.answers:
            if ans.user_answer != ans.correct_answer:
                wrong = WrongAnswer(
                    user_id=user.id,
                    topic=req.topic,
                    question_type=ans.type,
                    question=ans.question,
                    options=json.dumps(ans.options, ensure_ascii=False) if ans.options else None,
                    correct_answer=ans.correct_answer,
                    user_answer=ans.user_answer,
                    explanation=ans.explanation,
                )
                session.add(wrong)
                saved_count += 1
        await session.commit()

    return {
        "code": 0,
        "data": {"saved_count": saved_count},
        "message": "ok",
    }


@router.get("/wrong-answers")
async def list_wrong_answers(
    topic: str | None = None,
    user: User = Depends(get_current_user),
):
    """获取当前用户的错题列表"""
    from app.db.database import async_session
    from sqlalchemy import select, desc

    async with async_session() as session:
        query = select(WrongAnswer).where(WrongAnswer.user_id == user.id)
        if topic:
            query = query.where(WrongAnswer.topic == topic)
        query = query.order_by(desc(WrongAnswer.created_at))

        result = await session.execute(query)
        records = result.scalars().all()

    data = []
    for r in records:
        item = {
            "id": r.id,
            "topic": r.topic,
            "question_type": r.question_type,
            "question": r.question,
            "options": json.loads(r.options) if r.options else None,
            "correct_answer": r.correct_answer,
            "user_answer": r.user_answer,
            "explanation": r.explanation,
            "created_at": r.created_at.isoformat(),
        }
        data.append(item)

    return {
        "code": 0,
        "data": data,
        "message": "ok",
    }


@router.delete("/wrong-answers/{wrong_id}")
async def delete_wrong_answer(
    wrong_id: str,
    user: User = Depends(get_current_user),
):
    """删除单条错题记录"""
    from app.db.database import async_session
    from sqlalchemy import select

    async with async_session() as session:
        result = await session.execute(
            select(WrongAnswer).where(
                WrongAnswer.id == wrong_id,
                WrongAnswer.user_id == user.id,
            )
        )
        record = result.scalar_one_or_none()
        if not record:
            raise HTTPException(status_code=404, detail="错题记录不存在")

        await session.delete(record)
        await session.commit()

    return {"code": 0, "data": None, "message": "ok"}
```

- [ ] **Step 2: 确保 quiz.py 文件顶部已有 WrongAnswer 导入**

在 `backend/app/api/quiz.py` 的导入部分，确认已有 `from app.db.models import User, WrongAnswer`，如果没有则添加。文件顶部现在是：
```python
import json
import random
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.db.models import User, WrongAnswer
from app.core.llm_gateway import LLMGateway
```

- [ ] **Step 3: 验证 API 端点可加载**

启动后端：
```bash
cd backend && uvicorn app.main:app --reload --port 8000
```
然后检查 `/docs` 页面是否显示三个新端点（submit、list_wrong_answers、delete_wrong_answer）。

用 Ctrl+C 停止服务器。

- [ ] **Step 4: 提交**

```bash
cd C:\Users\LENOVO\Desktop\pias
git add backend/app/api/quiz.py
git commit -m "feat: add quiz submit and wrong answer collection API endpoints"
```

---

### Task 3: 前端 — 类型定义和 API 客户端扩展

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`

**Interfaces:**
- Produces:
  - `WrongAnswer` interface
  - `AnswerRecord` interface
  - `ViewType` 增加 `'wrong_answers'`
  - `submitQuizResults()`, `getWrongAnswers()`, `deleteWrongAnswer()` API 函数

- [ ] **Step 1: 在 types/index.ts 中添加 WrongAnswer 类型并更新 ViewType**

在 `frontend/src/types/index.ts` 中 `QuizResponse` 接口之后添加：

```typescript
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
```

将 `ViewType` 行更新为：
```typescript
export type ViewType = 'chat' | 'learning' | 'knowledge' | 'profile' | 'quiz' | 'wrong_answers'
```

- [ ] **Step 2: 在 api/client.ts 中添加错题集 API 函数**

在文件末尾 `generateQuiz` 函数之后添加：

```typescript
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
```

同时更新文件顶部的导入，将 `WrongAnswer` 和 `AnswerRecord` 加入类型导入：
```typescript
import type {
  AuthResponse, Session, SSEChunk, Message,
  LearningPath, Tutor, KnowledgeGraph,
  UserProfile, LoginHistoryResponse,
  MilestoneContent, QuizResponse,
  WrongAnswer, AnswerRecord,
} from '../types'
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit
```
预期输出：无错误

- [ ] **Step 4: 提交**

```bash
cd C:\Users\LENOVO\Desktop\pias
git add frontend/src/types/index.ts frontend/src/api/client.ts
git commit -m "feat: add WrongAnswer types and API client functions"
```

---

### Task 4: 前端 — 修改 QuizPanel 提交答题结果时保存错题

**Files:**
- Modify: `frontend/src/components/QuizPanel.tsx`

- [ ] **Step 1: 在 QuizPanel 的 handleSubmit 中添加错题保存逻辑**

修改 `handleSubmit` 函数，在计算分数后提交答题结果。同时添加状态跟踪保存结果：

在 `submitted` 和 `score` state 之后添加一个新 state：
```typescript
const [savedCount, setSavedCount] = useState<number | null>(null)
```

在第 60-76 行替换 `handleSubmit` 为：
```typescript
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
```

并在 `handleReset` 中重置 `savedCount`：
```typescript
const handleReset = () => {
  setTopic('')
  setQuestions([])
  setAnswers({})
  setSubmitted(false)
  setScore(0)
  setError('')
  setSavedCount(null)  // 添加这一行
}
```

- [ ] **Step 2: 在结果区域显示错题收录提示**

在提交后结果区域（`{submitted && (...)}` 块内，"得分" 展示下方添加：

```tsx
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
```

放在 "再来一组" 按钮之前。

- [ ] **Step 3: 确保 QuizPanel 顶部导入新 API 函数和类型**

更新导入行：
```typescript
import { generateQuiz, submitQuizResults } from '../api/client'
import type { QuizQuestion, AnswerRecord } from '../types'
```

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit
```
预期输出：无错误

- [ ] **Step 5: 提交**

```bash
cd C:\Users\LENOVO\Desktop\pias
git add frontend/src/components/QuizPanel.tsx
git commit -m "feat: auto-save wrong answers after quiz submission"
```

---

### Task 5: 前端 — 新建 WrongAnswersPage 页面

**Files:**
- Create: `frontend/src/pages/WrongAnswersPage.tsx`

- [ ] **Step 1: 创建 WrongAnswersPage.tsx**

完整页面代码：

```tsx
import { useState, useEffect } from 'react'
import { getWrongAnswers, deleteWrongAnswer } from '../api/client'
import type { WrongAnswer } from '../types'

/** 题型标签 */
function getTypeLabel(t: string) {
  switch (t) {
    case 'choice': return '选择题'
    case 'true_false': return '判断题'
    case 'fill_blank': return '填空题'
    default: return t
  }
}

/** 提取选项字母前缀后的文本 */
function stripPrefix(opt: string): string {
  for (const p of ['A. ', 'B. ', 'C. ', 'D. ']) {
    if (opt.startsWith(p)) return opt.slice(p.length)
  }
  return opt
}

/** 获取选项字母前缀 */
function getPrefix(opt: string): string {
  for (const p of ['A. ', 'B. ', 'C. ', 'D. ']) {
    if (opt.startsWith(p)) return p[0]
  }
  return '?'
}

export default function WrongAnswersPage() {
  const [items, setItems] = useState<WrongAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchItems = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getWrongAnswers(topicFilter || undefined)
      setItems(data)
    } catch {
      setError('加载错题失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [topicFilter])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteWrongAnswer(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  // 提取所有不重复的知识点
  const allTopics = [...new Set(items.map((i) => i.topic))]

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* ===== 顶部栏 ===== */}
      <div className="h-12 flex items-center px-4 border-b border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-[#1e2130]/60 backdrop-blur-sm flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4v4l2.5 1.5" />
        </svg>
        <span className="ml-2 text-sm font-medium text-ink">错题集</span>
        {items.length > 0 && (
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            {items.length} 题
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 scrollbar-thin">
        <div className="max-w-3xl mx-auto">
          {/* ===== 筛选栏 ===== */}
          {items.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="7" cy="7" r="5" />
                <path d="M11 11l3.5 3.5" />
              </svg>
              <select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-[#1e2130] text-slate-600 dark:text-slate-400
                  focus:outline-none focus:border-teal-400 transition-colors"
              >
                <option value="">全部知识点</option>
                {allTopics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* ===== 加载状态 ===== */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-teal-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-500 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 font-medium">加载错题中...</p>
            </div>
          )}

          {/* ===== 错误状态 ===== */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <p className="text-sm text-red-500 font-medium">{error}</p>
              <button
                onClick={fetchItems}
                className="mt-3 px-4 py-1.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-lg text-xs font-medium"
              >
                重新加载
              </button>
            </div>
          )}

          {/* ===== 空状态 ===== */}
          {!loading && !error && items.length === 0 && (
            <div className="flex items-center justify-center min-h-[50vh] select-none">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-teal-500/10 mx-auto mb-6 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent" />
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3A7B7D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                </div>
                <h2 className="font-display text-2xl font-bold text-ink mb-2">
                  暂无<span className="text-gradient-teal">错题</span>
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  还没有收录错题，去试题练习中挑战一下吧！
                  <br />
                  答错的题目会自动收录到这里。
                </p>
              </div>
            </div>
          )}

          {/* ===== 错题列表 ===== */}
          {!loading && items.length > 0 && (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1e2130] p-4 transition-all duration-200 hover:shadow-sm"
                >
                  {/* 顶部：题号+类型+知识点+删除 */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500 text-white text-xs font-bold">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M8 4v4l2.5 1.5" />
                      </svg>
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium
                      bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    >
                      {getTypeLabel(item.question_type)}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium
                      bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400"
                    >
                      {item.topic}
                    </span>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 disabled:opacity-50"
                      title="删除此错题"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M12.5 4v9a1 1 0 01-1 1h-7a1 1 0 01-1-1V4" />
                        <path d="M6 7v4M10 7v4" />
                      </svg>
                    </button>
                  </div>

                  {/* 题目 */}
                  <p className="text-sm text-ink font-medium mb-3 leading-relaxed">
                    {item.question}
                  </p>

                  {/* 选项（选择题/判断题） */}
                  {(item.question_type === 'choice' || item.question_type === 'true_false') && item.options && (
                    <div className="space-y-2 mb-3">
                      {item.options.map((opt) => {
                        const prefix = getPrefix(opt)
                        const isUserAnswer = opt === item.user_answer
                        const isCorrect = opt === item.correct_answer
                        return (
                          <div
                            key={opt}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                              ${isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700'
                                : isUserAnswer
                                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700'
                                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500'
                              }`}
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                              ${isCorrect
                                ? 'bg-emerald-500 text-white'
                                : isUserAnswer
                                  ? 'bg-red-400 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                              }`}
                            >
                              {prefix}
                            </span>
                            <span className="flex-1">{stripPrefix(opt)}</span>
                            {isCorrect && (
                              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {isUserAnswer && !isCorrect && (
                              <span className="text-[10px] text-red-400 font-medium flex-shrink-0">你的选择</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 填空题答案对比 */}
                  {item.question_type === 'fill_blank' && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700">
                        <span className="text-xs text-red-500 font-medium flex-shrink-0">你的答案：</span>
                        <span className="text-sm text-red-600 dark:text-red-400 line-through">{item.user_answer}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700">
                        <span className="text-xs text-emerald-600 font-medium flex-shrink-0">正确答案：</span>
                        <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">{stripPrefix(item.correct_answer)}</span>
                      </div>
                    </div>
                  )}

                  {/* 解析 */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="font-medium text-teal-600 dark:text-teal-400">解析：</span>
                      {item.explanation?.replace(/^解析[：:]\s*/, '')}
                    </p>
                  </div>

                  {/* 时间 */}
                  <div className="mt-2 text-[10px] text-slate-400">
                    {new Date(item.created_at).toLocaleDateString('zh-CN', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit
```
预期输出：无错误

- [ ] **Step 3: 提交**

```bash
cd C:\Users\LENOVO\Desktop\pias
git add frontend/src/pages/WrongAnswersPage.tsx
git commit -m "feat: create WrongAnswersPage component"
```

---

### Task 6: 前端 — 修改 ChatPage 侧边栏添加错题集导航

**Files:**
- Modify: `frontend/src/pages/ChatPage.tsx`

- [ ] **Step 1: 添加导入**

在 `ChatPage.tsx` 顶部导入：
```typescript
import WrongAnswersPage from '../pages/WrongAnswersPage'
```

- [ ] **Step 2: 添加 WrongAnswersIcon 组件（在 QuizIcon 之后）**

在文件的 SVG 图标区域，`QuizIcon` 函数之后添加：
```tsx
function WrongAnswersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4v4l2.5 1.5" />
    </svg>
  )
}
```

- [ ] **Step 3: 在 renderContent 中添加 wrong_answers 分支**

在 `renderContent()` 函数的顶部（`currentView === 'quiz'` 条件之后）添加：
```tsx
if (currentView === 'wrong_answers') return <WrongAnswersPage />
```

- [ ] **Step 4: 在侧边栏导航标签中添加错题集**

在导航标签列表的 `{ key: 'quiz', label: '试题练习', icon: <QuizIcon /> }` 之后添加：
```tsx
{ key: 'wrong_answers' as const, label: '错题集', icon: <WrongAnswersIcon /> },
```

- [ ] **Step 5: 验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit
```
预期输出：无错误

- [ ] **Step 6: 提交**

```bash
cd C:\Users\LENOVO\Desktop\pias
git add frontend/src/pages/ChatPage.tsx
git commit -m "feat: add wrong answers navigation to sidebar"
```

---

### Task 7: 端到端验证

- [ ] **Step 1: 启动后端和前端**

分别启动两个终端：

终端 1：
```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

终端 2：
```bash
cd frontend && npm run dev
```

- [ ] **Step 2: 功能测试流程**

1. 登录系统
2. 点击左侧「试题练习」
3. 输入知识点，点击生成试题
4. 答对部分题目，答错部分题目
5. 点击提交答案
6. 确认结果区域显示「已自动收录 X 道错题」
7. 点击左侧「错题集」
8. 确认错题列表显示刚才答错的题目
9. 确认题目展示：你的答案（红色）、正确答案（绿色）、解析
10. 点击删除一条错题，确认从列表中消失
11. 使用知识点筛选下拉框，确认筛选正常
