import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.db.models import User, Session
from app.models.learning import TutorRole
from app.core.deps import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/tutors", tags=["tutors"])

# 预设导师角色 —— 系统初始化时写入
SEED_TUTORS = [
    {
        "name": "socrates",
        "title": "苏格拉底式助教",
        "avatar_style": "socratic",
        "system_prompt": "你是一位苏格拉底式导师。不要直接给答案，而是通过提问引导学生自己发现答案。使用「你怎么理解…」「如果…会怎样」「能举个例吗」等启发式提问。当学生卡住时，给出提示而不是答案。",
        "temperature": 0.8,
        "theme_color": "#D4956B",
        "tags": '["思辨","提问","逻辑"]',
        "description": "不直接给答案，用提问引导你发现真理",
        "sort_order": 1,
    },
    {
        "name": "drill",
        "title": "魔鬼教官",
        "avatar_style": "drill",
        "system_prompt": "你是一位严格但公正的教官。对学生要求极高，不断追问「你确定吗」「证明给我看」。要求学生给出严格的推理和证明。如果学生含糊其辞，直接指出漏洞。表扬要吝啬，但每次表扬都要真诚。目标是培养学生严谨的思维习惯。",
        "temperature": 0.5,
        "theme_color": "#DC2626",
        "tags": '["严格","严谨","训练"]',
        "description": "严格训练，把你练到条件反射",
        "sort_order": 2,
    },
    {
        "name": "feynman",
        "title": "费曼导师",
        "avatar_style": "feynman",
        "system_prompt": "你是一位费曼学习法导师。你的核心方法是：用最简单的语言解释复杂概念。每次解释后，要求学生用自己的话复述。如果学生能教会一个「完全不懂的人」，才算真正理解。善用类比、故事和可视化描述。鼓励学生指出不理解的部分，然后换种方式再讲。",
        "temperature": 0.7,
        "theme_color": "#3A7B7D",
        "tags": '["类比","简化","费曼技巧"]',
        "description": "用最简单的语言讲清最复杂的概念",
        "sort_order": 3,
    },
    {
        "name": "peer",
        "title": "学习伙伴",
        "avatar_style": "peer",
        "system_prompt": "你是一位友善的学习伙伴，和学生在同一水平线上一起学习。语气轻松自然，用「我们一起看看」「这个我之前也搞错过」等表达方式。分享学习心得和技巧，互相鼓励。当你不确定时，坦率地说「这个我不太确定，我们来查查」。目标是把学习变成愉快的合作探索。",
        "temperature": 0.9,
        "theme_color": "#7C3AED",
        "tags": '["轻松","合作","鼓励"]',
        "description": "一起学的 buddy，让学习不孤单",
        "sort_order": 4,
    },
]


class SetTutorRequest(BaseModel):
    tutor_name: str


async def seed_tutors(db: AsyncSession):
    """首次启动时写入预设导师角色"""
    result = await db.execute(select(TutorRole).limit(1))
    if result.scalar_one_or_none():
        return

    for data in SEED_TUTORS:
        tutor = TutorRole(**data)
        db.add(tutor)
    await db.commit()


@router.get("")
async def list_tutors(
    db: AsyncSession = Depends(get_db),
):
    """获取所有导师角色列表"""
    await seed_tutors(db)

    result = await db.execute(
        select(TutorRole).order_by(TutorRole.sort_order)
    )
    tutors = result.scalars().all()

    return {
        "code": 0,
        "data": [
            {
                "id": t.id,
                "name": t.name,
                "title": t.title,
                "avatar_style": t.avatar_style,
                "theme_color": t.theme_color,
                "tags": json.loads(t.tags),
                "description": t.description,
                "temperature": t.temperature,
                "is_default": t.is_default,
            }
            for t in tutors
        ],
        "message": "ok",
    }


@router.post("/sessions/{session_id}/tutor")
async def set_session_tutor(
    session_id: str,
    req: SetTutorRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """设置会话的导师角色（将角色 system prompt 注入后续对话）"""
    # 验证会话归属
    result = await db.execute(
        select(Session).where(
            Session.id == session_id, Session.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    # 查找导师
    result = await db.execute(
        select(TutorRole).where(TutorRole.name == req.tutor_name)
    )
    tutor = result.scalar_one_or_none()
    if not tutor:
        raise HTTPException(status_code=404, detail="导师角色不存在")

    # 将导师信息存储在会话上
    session.tutor_name = tutor.name
    await db.commit()

    return {
        "code": 0,
        "data": {
            "name": tutor.name,
            "title": tutor.title,
            "theme_color": tutor.theme_color,
            "system_prompt": tutor.system_prompt,
            "temperature": tutor.temperature,
        },
        "message": f"已切换到 {tutor.title}",
    }
