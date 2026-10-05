import json
import random
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.db.models import User, WrongAnswer
from app.core.llm_gateway import LLMGateway

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


class GenerateQuizRequest(BaseModel):
    topic: str


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


QUIZ_SYSTEM_PROMPT = """你是一名资深学科教师和题目生成专家。根据用户输入的知识点或主题，生成 10 道高质量的测试题，帮助用户检验和巩固所学知识。

## 题型分配
- 至少 6 道**选择题**（4 个选项）
- 2-3 道**判断题**（正确/错误）
- 1-2 道**填空题**（用 ____ 表示填空位置）

## 难度分布
- 3 道基础题（概念、定义、事实类）
- 4 道中等题（理解、比较、应用类）
- 3 道进阶题（分析、综合、评价类）

## 输出格式
请严格以 JSON 数组格式返回，不要包含任何额外文字：

```json
[
  {
    "id": 1,
    "type": "choice",
    "question": "题干内容不超过100字",
    "options": ["A. 选项一", "B. 选项二", "C. 选项三", "D. 选项四"],
    "answer": "A. 选项一",
    "explanation": "解析：简要说明为什么选这个答案，建议包含知识点回顾（50字以内）"
  },
  {
    "id": 2,
    "type": "true_false",
    "question": "判断题题干",
    "options": ["A. 正确", "B. 错误"],
    "answer": "A. 正确",
    "explanation": "解析：说明正确或错误的原因"
  },
  {
    "id": 3,
    "type": "fill_blank",
    "question": "填空题题干，____ 是填空位置",
    "answer": "填空答案",
    "explanation": "解析：说明该空为什么填这个内容"
  }
]
```

## 规则
1. 选择题选项使用 A./B./C./D. 前缀
2. 判断题 answer 和 options 使用 "A. 正确" 或 "B. 错误"
3. 填空题用 ____（4 个下划线）标记填空位置
4. 答案必须准确无误，解析必须包含知识点说明
5. 题目之间不要重复考察同一知识点
6. 每个题干控制在 100 字以内，简洁明了
7. 选择题的正确答案在选项中的位置应随机分布（不总是 A）
"""


@router.post("/generate")
async def generate_quiz(
    req: GenerateQuizRequest,
    user: User = Depends(get_current_user),
):
    """根据知识点生成10道测试题"""
    if not req.topic or not req.topic.strip():
        raise HTTPException(status_code=400, detail="知识点不能为空")

    gateway = LLMGateway()
    try:
        resp = await gateway.chat([
            {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"请生成关于「{req.topic}」的 10 道测试题。要求题型多样化，从基础到进阶。",
            },
        ])

        if "```json" in resp:
            resp = resp.split("```json")[1].split("```")[0]
        elif "```" in resp:
            resp = resp.split("```")[1].split("```")[0]

        questions = json.loads(resp.strip())

        if not isinstance(questions, list) or len(questions) == 0:
            raise ValueError("生成的题目格式不正确")

        # 截断到 10 题
        questions = questions[:10]

        # 打乱选择题选项顺序
        for q in questions:
            if q.get("type") == "choice" and "options" in q:
                _shuffle_choice_options(q)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"题目生成失败: {str(e)}",
        )

    return {
        "code": 0,
        "data": {
            "topic": req.topic,
            "questions": questions,
        },
        "message": "ok",
    }


def _shuffle_choice_options(q: dict):
    """打乱选择题选项顺序，保持答案正确"""
    raw_answer = q["answer"]
    raw_options = q["options"]

    # 提取选项文本（去掉前缀）
    option_texts = []
    for opt in raw_options:
        text = opt
        for prefix in ("A. ", "B. ", "C. ", "D. "):
            if text.startswith(prefix):
                text = text[len(prefix):]
                break
        option_texts.append(text)

    # 提取正确答案文本
    answer_text = raw_answer
    for prefix in ("A. ", "B. ", "C. ", "D. "):
        if answer_text.startswith(prefix):
            answer_text = answer_text[len(prefix):]
            break

    # 打乱
    combined = list(zip(option_texts, raw_options))
    random.shuffle(combined)
    option_texts, raw_options = zip(*combined)
    option_texts = list(option_texts)
    raw_options = list(raw_options)

    # 重新标记 ABCD
    labels = ["A", "B", "C", "D"]
    shuffled_options = []
    correct_idx = -1
    for i, opt_text in enumerate(option_texts):
        prefix = f"{labels[i]}. "
        shuffled_options.append(f"{prefix}{opt_text}")
        if opt_text == answer_text:
            correct_idx = i

    q["options"] = shuffled_options
    if correct_idx >= 0:
        q["answer"] = f"{labels[correct_idx]}. {option_texts[correct_idx]}"


# ========== 错题集 ==========


@router.post("/submit")
async def submit_quiz(
    req: SubmitQuizRequest,
    user: User = Depends(get_current_user),
):
    """提交答题结果，自动保存错题"""
    if not req.topic or not req.answers:
        raise HTTPException(status_code=400, detail="参数不完整")

    from app.db.database import async_session

    async with async_session() as session:
        saved_count = 0
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
