# 错题集功能设计文档

## 概述

在现有试题练习功能基础上，增加错题自动收录与查看功能。用户做 AI 生成的试题后，答错的题目自动保存为错题记录，可在左侧导航栏"错题集"中浏览和管理。

## 用户故事

- 作为学习者，我在做完试题后，答错的题目应该自动被记录下来
- 作为学习者，我可以在左侧导航栏进入"错题集"，查看所有错题
- 作为学习者，我可以看到每道错题的题目、我的答案、正确答案和解析
- 作为学习者，我可以按知识点筛选错题
- 作为学习者，我可以删除已经掌握的错题记录
- 作为学习者，我可以在空错题集时看到友好的提示

## 技术方案

### 后端

#### 新增数据库模型

在 `backend/app/db/models.py` 中新增 `WrongAnswer` 表：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String(36), PK, UUID | 主键 |
| `user_id` | String(36), FK→users.id | 用户 ID |
| `topic` | String(200) | 知识点名称 |
| `question_type` | String(20) | 题型：choice / true_false / fill_blank |
| `question` | Text | 题目内容 |
| `options` | Text, nullable | 选项 JSON 数组 |
| `correct_answer` | Text | 正确答案 |
| `user_answer` | Text | 用户的错误答案 |
| `explanation` | Text | 题目解析 |
| `created_at` | DateTime(timezone=True) | 创建时间 |

所有 datetime 列使用 `DateTime(timezone=True)` + `server_default=func.now()` 模式，遵循项目现有约定。

#### 新增/扩展 API 端点

在 `backend/app/api/quiz.py` 中新增：

##### `POST /api/quiz/submit`
- 请求体：
  ```json
  {
    "topic": "矩阵乘法",
    "answers": [
      {
        "question_id": 1,
        "question": "矩阵乘法的定义是...",
        "type": "choice",
        "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "user_answer": "A. ...",
        "correct_answer": "C. ...",
        "explanation": "解析：..."
      }
    ]
  }
  ```
- 处理逻辑：遍历 answers，对比 user_answer 和 correct_answer，不一致的存入 WrongAnswer 表
- 返回：`{ "saved_count": 3 }`

##### `GET /api/quiz/wrong-answers`
- 查询参数：`?topic=xxx`（可选筛选）
- 返回：按 created_at 降序的错题列表

##### `DELETE /api/quiz/wrong-answers/{id}`
- 验证：只能删除自己的错题
- 返回：标准成功响应

### 前端

#### 类型定义（`types/index.ts`）

```typescript
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

// ViewType 增加 'wrong_answers'
export type ViewType = 'chat' | 'learning' | 'knowledge' | 'profile' | 'quiz' | 'wrong_answers'
```

#### API 函数（`api/client.ts`）

```typescript
// 提交答题结果时用到的单题记录
export interface AnswerRecord {
  question_id: number
  question: string
  type: 'choice' | 'true_false' | 'fill_blank'
  options?: string[]
  user_answer: string
  correct_answer: string
  explanation: string
}

export async function submitQuizResults(topic: string, answers: AnswerRecord[]): Promise<{ saved_count: number }>
export async function getWrongAnswers(topic?: string): Promise<WrongAnswer[]>
export async function deleteWrongAnswer(id: string): Promise<void>
```

#### QuizPanel 修改

在 `handleSubmit` 中，提交答案后调用 `submitQuizResults()` 将答题结果发送到后端：
- 收集所有题目的用户答案和正确答案
- 调用 API 保存
- 在提交后的结果区域显示"已自动收录错题"的提示

#### 新增 WrongAnswersPage

文件：`frontend/src/pages/WrongAnswersPage.tsx`

功能：
- **顶部区域**：标题 + 总错题数 + 按知识点筛选的下拉/标签
- **列表区域**：每条错题以卡片形式展示，包含：
  - 题型标签（选择题/判断题/填空题）
  - 题目内容
  - 用户答案（红色标记）
  - 正确答案（绿色标记）
  - 解析
  - 删除按钮
- **空状态**：无错题时显示友好提示（类似 QuizPanel 的空状态风格）
- **加载状态**：获取数据时显示加载动画
- **错误状态**：加载失败时的重试按钮

#### ChatPage 侧边栏修改

- 导航标签列表在"试题练习"之后增加"错题集"标签
- 增加 WrongAnswersIcon SVG
- renderContent 增加 `'wrong_answers'` 分支
- 可以标注错题数量徽章（可选）

## 数据流

```
用户做题 → 提交答案 → QuizPanel 计算分数
                    → 调用 POST /api/quiz/submit
                    → 后端遍历答案，保存错题
                    → 前端显示结果 + "已收录 X 道错题"

用户查看错题 → 点击左侧"错题集"
            → GET /api/quiz/wrong-answers
            → WrongAnswersPage 渲染列表
```

## 状态处理

- **加载中**：页面/数据加载时显示居中旋转动画
- **空数据**：友好的空状态引导（"还没有错题，去练习一下吧"）
- **错误**：网络错误时显示重试按钮
- **删除后**：无感删除，从列表移除，更新总数

## 文件变更清单

### 新增文件
- `frontend/src/pages/WrongAnswersPage.tsx`

### 修改文件
- `backend/app/db/models.py` — 添加 WrongAnswer 模型
- `backend/app/api/quiz.py` — 添加 submit、list、delete 端点
- `frontend/src/types/index.ts` — 添加 WrongAnswer 类型、更新 ViewType
- `frontend/src/api/client.ts` — 添加 API 函数
- `frontend/src/components/QuizPanel.tsx` — 提交后保存错题
- `frontend/src/pages/ChatPage.tsx` — 侧边栏导航增加错题集
