#!/usr/bin/env python3
"""
PIAS 答辩 PPT 生成脚本 v2 — 标题统一置于顶部
Personalized Intelligent Assistant System — 个性化智慧助理系统
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

# ── 品牌色系 (Layered Intelligence) ──
TEAL = RGBColor(0x3A, 0x7B, 0x7D)
TEAL_DARK = RGBColor(0x2A, 0x5F, 0x61)
TEAL_LIGHT = RGBColor(0xE8, 0xF4, 0xF4)
COPPER = RGBColor(0xD4, 0x95, 0x6B)
COPPER_LIGHT = RGBColor(0xFB, 0xF0, 0xE8)
VIOLET = RGBColor(0x7C, 0x3A, 0xED)
DARK = RGBColor(0x16, 0x1B, 0x2D)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GRAY = RGBColor(0x6B, 0x72, 0x88)
LIGHT_GRAY = RGBColor(0xF0, 0xF2, 0xF5)
MEDIUM_GRAY = RGBColor(0x9C, 0xA3, 0xB5)

prs = Presentation()
prs.slide_width = Inches(13.333)  # 16:9
prs.slide_height = Inches(7.5)

W = prs.slide_width
H = prs.slide_height

# ── Global layout constants ──
TITLE_Y = Inches(0.35)
SUBTITLE_Y = Inches(1.05)
SEP_Y = Inches(1.35)
CONTENT_Y = Inches(1.55)
CONTENT_BOTTOM = Inches(7.0)

# ════════════════════════════════════════════════════
#  Helper functions
# ════════════════════════════════════════════════════

def add_bg(slide, color=WHITE):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_rect(slide, left, top, width, height, fill_color=None, line_color=None, line_width=Pt(0)):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.line.color.rgb = line_color if line_color else fill_color if fill_color else WHITE
    shape.line.width = line_width
    if fill_color:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill_color
    else:
        shape.fill.background()
    return shape

def add_textbox(slide, left, top, width, height, text="", font_size=18, font_color=DARK,
                bold=False, alignment=PP_ALIGN.LEFT, font_name="Microsoft YaHei"):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = font_color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return txBox

def add_rich_textbox(slide, left, top, width, height):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    return txBox, tf

def add_para(tf, text, font_size=16, font_color=DARK, bold=False, alignment=PP_ALIGN.LEFT,
             space_before=Pt(6), space_after=Pt(4), font_name="Microsoft YaHei"):
    p = tf.add_paragraph()
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = font_color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    p.space_before = space_before
    p.space_after = space_after
    return p

def add_bullet(tf, text, level=0, font_size=14, font_color=DARK, bold=False, font_name="Microsoft YaHei"):
    p = tf.add_paragraph()
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = font_color
    p.font.bold = bold
    p.font.name = font_name
    p.level = level
    p.space_before = Pt(4)
    p.space_after = Pt(2)
    return p

def page_number(slide, num, total):
    add_textbox(slide, W - Inches(1.2), H - Inches(0.45), Inches(1), Inches(0.35),
                f"{num} / {total}", font_size=10, font_color=MEDIUM_GRAY,
                alignment=PP_ALIGN.RIGHT)

# ── Title bar at the top (replaces old section_header) ──

def add_title_bar(slide, title, subtitle="", bar_side="left"):
    """Add a prominent title bar at the top of the slide.
    bar_side: 'left' or 'right' — which side the accent bar goes on.
    """
    add_bg(slide, WHITE)
    # Full-height accent bar
    if bar_side == "left":
        add_rect(slide, 0, 0, Inches(0.35), H, fill_color=TEAL)
        tx = Inches(1.0)
    else:
        add_rect(slide, W - Inches(0.35), 0, Inches(0.35), H, fill_color=TEAL)
        tx = Inches(1.2)

    # Title text — large, at the top
    add_textbox(slide, tx, TITLE_Y, Inches(11), Inches(0.7),
                title, font_size=32, font_color=TEAL_DARK, bold=True)

    # Subtitle
    if subtitle:
        add_textbox(slide, tx, SUBTITLE_Y, Inches(11), Inches(0.35),
                    subtitle, font_size=14, font_color=GRAY)

    # Separator line
    add_rect(slide, tx, SEP_Y, Inches(11.5), Inches(0.02), fill_color=TEAL_LIGHT)


TOTAL = 13

# ════════════════════════════════════════════════════
#  Slide 1 — 封面
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)

# Top teal block
add_rect(slide, 0, 0, W, Inches(0.15), fill_color=TEAL)
# Bottom decorative bar
add_rect(slide, 0, H - Inches(0.08), W, Inches(0.08), fill_color=COPPER)

# Large teal decorative circle (top right area)
circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, W - Inches(3.5), Inches(-1.5), Inches(5), Inches(5))
circle.fill.solid()
circle.fill.fore_color.rgb = TEAL_LIGHT
circle.line.fill.background()

# Main title
add_textbox(slide, Inches(1.5), Inches(1.8), Inches(10), Inches(1.2),
            "个性化智慧助理系统", font_size=44, font_color=TEAL_DARK, bold=True,
            alignment=PP_ALIGN.LEFT)

# English subtitle
add_textbox(slide, Inches(1.5), Inches(2.9), Inches(10), Inches(0.7),
            "Personalized Intelligent Assistant System (PIAS)", font_size=22, font_color=COPPER,
            alignment=PP_ALIGN.LEFT)

# Accent line
add_rect(slide, Inches(1.5), Inches(3.7), Inches(2.5), Inches(0.04), fill_color=TEAL)

# Project description
add_textbox(slide, Inches(1.5), Inches(4.1), Inches(8), Inches(0.5),
            "—— 基于大语言模型的 AI 学习助理平台", font_size=18, font_color=GRAY)

# Info block
info_box, tf_info = add_rich_textbox(slide, Inches(7.5), Inches(4.8), Inches(5), Inches(2.2))
info_box.fill.solid()
info_box.fill.fore_color.rgb = TEAL_LIGHT
info_box.line.color.rgb = TEAL
info_box.line.width = Pt(1)

add_para(tf_info, "答辩人：", font_size=12, font_color=GRAY, space_before=Pt(8))
add_para(tf_info, "PIAS 团队", font_size=18, font_color=TEAL_DARK, bold=True, space_before=Pt(0))
add_para(tf_info, "2026 年 7 月", font_size=12, font_color=GRAY, space_before=Pt(12))


# ════════════════════════════════════════════════════
#  Slide 2 — 目录
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_title_bar(slide, "目  录", "CONTENTS", bar_side="left")
page_number(slide, 2, TOTAL)

toc_items = [
    ("01", "项目背景与研究意义"),
    ("02", "系统架构与技术栈"),
    ("03", "核心功能模块"),
    ("04", "关键技术与创新点"),
    ("05", "系统演示"),
    ("06", "总结与展望"),
]

for i, (num, title) in enumerate(toc_items):
    y = Inches(1.2) + Inches(0.85) * i
    add_textbox(slide, Inches(4.0), y, Inches(0.8), Inches(0.6),
                num, font_size=28, font_color=TEAL, bold=True, alignment=PP_ALIGN.RIGHT)
    dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.0), y + Inches(0.15), Inches(0.12), Inches(0.12))
    dot.fill.solid()
    dot.fill.fore_color.rgb = TEAL
    dot.line.fill.background()
    add_textbox(slide, Inches(5.4), y + Inches(0.02), Inches(6), Inches(0.5),
                title, font_size=20, font_color=DARK)


# ════════════════════════════════════════════════════
#  Slide 3 — 项目背景
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_title_bar(slide, "项目背景与研究意义", "Background & Motivation", bar_side="left")
page_number(slide, 3, TOTAL)

box_left, tf_l = add_rich_textbox(slide, Inches(1.0), CONTENT_Y, Inches(5.6), Inches(5.2))
box_left.fill.solid()
box_left.fill.fore_color.rgb = LIGHT_GRAY
box_left.line.color.rgb = LIGHT_GRAY
box_left.line.width = Pt(1)

tf_l.paragraphs[0].text = "痛点分析"
tf_l.paragraphs[0].font.size = Pt(20)
tf_l.paragraphs[0].font.color.rgb = TEAL_DARK
tf_l.paragraphs[0].font.bold = True
tf_l.paragraphs[0].font.name = "Microsoft YaHei"

for item in [
    "大学生学习资源分散，缺乏个性化指导",
    "传统 AI 助教缺乏教学策略和人格化互动",
    "知识体系难以可视化，学习路径不清晰",
    "学习效果评估与复习巩固环节薄弱",
]:
    add_bullet(tf_l, f"▸ {item}", font_size=14, font_color=DARK)

box_right, tf_r = add_rich_textbox(slide, Inches(6.9), CONTENT_Y, Inches(5.6), Inches(5.2))
box_right.fill.solid()
box_right.fill.fore_color.rgb = TEAL_LIGHT
box_right.line.color.rgb = TEAL
box_right.line.width = Pt(1)

tf_r.paragraphs[0].text = "研究目标"
tf_r.paragraphs[0].font.size = Pt(20)
tf_r.paragraphs[0].font.color.rgb = TEAL_DARK
tf_r.paragraphs[0].font.bold = True
tf_r.paragraphs[0].font.name = "Microsoft YaHei"

for item in [
    "构建多角色 AI 教学助手，因材施教",
    "实现对话中自动提取知识图谱",
    "提供结构化学习路径规划",
    "集成智能测验与错题管理",
]:
    add_bullet(tf_r, f"▸ {item}", font_size=14, font_color=DARK)


# ════════════════════════════════════════════════════
#  Slide 4 — 技术栈
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_title_bar(slide, "系统架构与技术栈", "Tech Stack & Architecture", bar_side="right")
page_number(slide, 4, TOTAL)

col_h = Inches(5.2)
# Backend column
add_rect(slide, Inches(0.8), CONTENT_Y, Inches(3.8), Inches(0.45), fill_color=TEAL)
add_textbox(slide, Inches(0.8), CONTENT_Y + Inches(0.03), Inches(3.8), Inches(0.4),
            "  后端技术栈", font_size=16, font_color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)

box_b, tf_b = add_rich_textbox(slide, Inches(0.8), CONTENT_Y + Inches(0.55), Inches(3.8), col_h)
box_b.fill.solid()
box_b.fill.fore_color.rgb = LIGHT_GRAY
add_para(tf_b, "Python 3.11+ / FastAPI", font_size=14, font_color=DARK, bold=True)
add_bullet(tf_b, "高性能异步 ASGI 框架", level=1, font_size=12)
add_para(tf_b, "SQLAlchemy 2.0 (async)", font_size=14, font_color=DARK, bold=True)
add_bullet(tf_b, "PostgreSQL + asyncpg 驱动", level=1, font_size=12)
add_para(tf_b, "LiteLLM 多模型网关", font_size=14, font_color=DARK, bold=True)
add_bullet(tf_b, "统一接口接入 OpenAI / Claude 等", level=1, font_size=12)
add_para(tf_b, "JWT 认证 + bcrypt 加密", font_size=14, font_color=DARK, bold=True)
add_para(tf_b, "Redis 缓存（会话管理）", font_size=14, font_color=DARK, bold=True)
add_para(tf_b, "Docker 容器化部署", font_size=14, font_color=DARK, bold=True)

# Frontend column
add_rect(slide, Inches(5.0), CONTENT_Y, Inches(3.8), Inches(0.45), fill_color=COPPER)
add_textbox(slide, Inches(5.0), CONTENT_Y + Inches(0.03), Inches(3.8), Inches(0.4),
            "  前端技术栈", font_size=16, font_color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)

box_f, tf_f = add_rich_textbox(slide, Inches(5.0), CONTENT_Y + Inches(0.55), Inches(3.8), col_h)
box_f.fill.solid()
box_f.fill.fore_color.rgb = COPPER_LIGHT
add_para(tf_f, "React 18 + TypeScript", font_size=14, font_color=DARK, bold=True)
add_bullet(tf_f, "函数组件 + Hooks 架构", level=1, font_size=12)
add_para(tf_f, "Vite 5 构建工具", font_size=14, font_color=DARK, bold=True)
add_bullet(tf_f, "极速 HMR，秒级热更新", level=1, font_size=12)
add_para(tf_f, "Zustand 状态管理", font_size=14, font_color=DARK, bold=True)
add_bullet(tf_f, "轻量、无模板代码", level=1, font_size=12)
add_para(tf_f, "TailwindCSS 3 样式系统", font_size=14, font_color=DARK, bold=True)
add_bullet(tf_f, "CSS 变量驱动的暗色模式", level=1, font_size=12)
add_para(tf_f, "Axios + SSE 流式通信", font_size=14, font_color=DARK, bold=True)

# Design column
add_rect(slide, Inches(9.2), CONTENT_Y, Inches(3.8), Inches(0.45), fill_color=VIOLET)
add_textbox(slide, Inches(9.2), CONTENT_Y + Inches(0.03), Inches(3.8), Inches(0.4),
            "  设计语言", font_size=16, font_color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)

box_d, tf_d = add_rich_textbox(slide, Inches(9.2), CONTENT_Y + Inches(0.55), Inches(3.8), col_h)
box_d.fill.solid()
box_d.fill.fore_color.rgb = RGBColor(0xF3, 0xEE, 0xFC)
add_para(tf_d, "\"Layered Intelligence\"", font_size=16, font_color=VIOLET, bold=True)
add_bullet(tf_d, "分层智能设计理念", level=0, font_size=13)
add_para(tf_d, "Teal #3A7B7D", font_size=14, font_color=TEAL, bold=True)
add_bullet(tf_d, "主色调，科技感与信赖感", level=1, font_size=12)
add_para(tf_d, "Copper #D4956B", font_size=14, font_color=COPPER, bold=True)
add_bullet(tf_d, "辅色调，温暖与人文感", level=1, font_size=12)
add_para(tf_d, "暗色模式", font_size=14, font_color=DARK, bold=True)
add_bullet(tf_d, "CSS 变量 + data-theme 切换", level=1, font_size=12)


# ════════════════════════════════════════════════════
#  Slide 5 — 系统架构图
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_title_bar(slide, "系统架构设计", "System Architecture", bar_side="left")
page_number(slide, 5, TOTAL)

layers = [
    ("表现层 (Presentation)", CONTENT_Y, TEAL,
     "React SPA  |  TypeScript  |  TailwindCSS  |  Zustand"),
    ("API 层 (REST API)", CONTENT_Y + Inches(0.85), COPPER,
     "FastAPI  |  JWT Auth  |  SSE Streaming  |  统一响应格式 {code, data, message}"),
    ("核心服务层 (Core Services)", CONTENT_Y + Inches(1.70), RGBColor(0x5B, 0x8D, 0xE0),
     "LLM 网关  |  工作记忆  |  知识图谱引擎  |  学习路径  |  测验系统"),
    ("数据层 (Data Layer)", CONTENT_Y + Inches(2.55), VIOLET,
     "PostgreSQL  |  SQLAlchemy 2.0  |  Redis  |  asyncpg"),
    ("基础设施 (Infrastructure)", CONTENT_Y + Inches(3.40), GRAY,
     "Docker  |  Docker Compose  |  Nginx"),
]

for i, (label, y, color, desc) in enumerate(layers):
    box = add_rect(slide, Inches(0.8), y, Inches(11.7), Inches(0.65), fill_color=color)
    box.text_frame.paragraphs[0].text = label
    box.text_frame.paragraphs[0].font.size = Pt(14)
    box.text_frame.paragraphs[0].font.color.rgb = WHITE
    box.text_frame.paragraphs[0].font.bold = True
    box.text_frame.paragraphs[0].font.name = "Microsoft YaHei"
    add_textbox(slide, Inches(3.5), y + Inches(0.05), Inches(9), Inches(0.5),
                desc, font_size=12, font_color=WHITE)

    if i < len(layers) - 1:
        add_textbox(slide, Inches(6.0), y + Inches(0.6), Inches(1), Inches(0.25),
                    "▼", font_size=11, font_color=MEDIUM_GRAY, alignment=PP_ALIGN.CENTER)


# ════════════════════════════════════════════════════
#  Slide 6 — 核心功能：AI 聊天与多角色助教
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_title_bar(slide, "核心功能模块 — AI 聊天与多角色助教",
              "Core Features: AI Chat & Tutor Personas", bar_side="right")
page_number(slide, 6, TOTAL)

# Chat feature description
box_c, tf_c = add_rich_textbox(slide, Inches(0.8), CONTENT_Y, Inches(6), Inches(2.8))
box_c.fill.solid()
box_c.fill.fore_color.rgb = LIGHT_GRAY

tf_c.paragraphs[0].text = "多轮智能对话"
tf_c.paragraphs[0].font.size = Pt(18)
tf_c.paragraphs[0].font.color.rgb = TEAL_DARK
tf_c.paragraphs[0].font.bold = True
tf_c.paragraphs[0].font.name = "Microsoft YaHei"

for item in [
    "基于 LiteLLM 的流式 SSE 响应",
    "智能工作记忆：128K token 滑动窗口",
    "中英双语 Token 估算优化",
    "会话管理与历史回溯",
]:
    add_bullet(tf_c, f"▸ {item}", font_size=14, font_color=DARK)

# Tutor cards - 4 tutor personas
tutors = [
    ("苏格拉底式助教\nSocrates", TEAL, "以提问引导思考\n启发式教学，temper=0.8"),
    ("魔鬼教官\nDrill Instructor", RGBColor(0xDC, 0x26, 0x26), "严格要求，注重严谨\n高标准，temper=0.5"),
    ("费曼导师\nFeynman Tutor", RGBColor(0x2D, 0x9C, 0x7C), "深入浅出的讲解\n费曼学习法，temper=0.7"),
    ("学习伙伴\nPeer", VIOLET, "平等协作式学习\n共同进步，temper=0.9"),
]

for i, (name, color, desc) in enumerate(tutors):
    x = Inches(0.8) + Inches(3.1) * (i % 2)
    y = CONTENT_Y + Inches(3.1) * (i // 2)

    card = add_rect(slide, x, y, Inches(2.8), Inches(2.3), fill_color=WHITE)
    card.line.color.rgb = color
    card.line.width = Pt(2)

    add_rect(slide, x, y, Inches(2.8), Inches(0.06), fill_color=color)

    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.1), y + Inches(0.2), Inches(0.6), Inches(0.6))
    circle.fill.solid()
    circle.fill.fore_color.rgb = color
    circle.line.fill.background()

    add_textbox(slide, x + Inches(0.85), y + Inches(0.3), Inches(1.8), Inches(0.7),
                name, font_size=13, font_color=DARK, bold=True)

    add_textbox(slide, x + Inches(0.15), y + Inches(1.1), Inches(2.5), Inches(1.0),
                desc, font_size=11, font_color=GRAY)


# ════════════════════════════════════════════════════
#  Slide 7 — 知识图谱
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_title_bar(slide, "核心功能模块 — 知识图谱",
              "Core Features: Knowledge Graph", bar_side="left")
page_number(slide, 7, TOTAL)

box_kg, tf_kg = add_rich_textbox(slide, Inches(0.8), CONTENT_Y, Inches(5.8), Inches(5.2))
box_kg.fill.solid()
box_kg.fill.fore_color.rgb = LIGHT_GRAY

tf_kg.paragraphs[0].text = "自动知识提取"
tf_kg.paragraphs[0].font.size = Pt(18)
tf_kg.paragraphs[0].font.color.rgb = TEAL_DARK
tf_kg.paragraphs[0].font.bold = True
tf_kg.paragraphs[0].font.name = "Microsoft YaHei"

for item in [
    "每次对话后自动调用 LLM 抽取知识点",
    "节点类型：概念 / 术语 / 公式 / 方法",
    "关联类型：前置、派生、相关、示例、组成",
    "支持单会话与全局聚合两种视图",
    "自定义 SVG 力导向图可视化",
    "物理仿真：排斥力、吸引力、阻尼边界",
    "交互：悬停高亮、点击选中、详情面板",
]:
    add_bullet(tf_kg, f"▸ {item}", font_size=14, font_color=DARK)

box_leg, tf_leg = add_rich_textbox(slide, Inches(7.0), CONTENT_Y, Inches(5.5), Inches(5.2))
box_leg.fill.solid()
box_leg.fill.fore_color.rgb = WHITE
box_leg.line.color.rgb = TEAL
box_leg.line.width = Pt(1.5)

tf_leg.paragraphs[0].text = "节点类型图例"
tf_leg.paragraphs[0].font.size = Pt(18)
tf_leg.paragraphs[0].font.color.rgb = TEAL_DARK
tf_leg.paragraphs[0].font.bold = True
tf_leg.paragraphs[0].font.name = "Microsoft YaHei"

node_types = [
    ("概念 (Concept)", TEAL, "核心知识概念"),
    ("术语 (Term)", COPPER, "专业术语定义"),
    ("公式 (Formula)", VIOLET, "数学表达式"),
    ("方法 (Method)", RGBColor(0x5B, 0x8D, 0xE0), "方法论与步骤"),
]

for label, color, desc in node_types:
    idx = node_types.index((label, color, desc))
    dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(7.3), CONTENT_Y + Inches(0.5 + 0.6 * idx), Inches(0.2), Inches(0.2))
    dot.fill.solid()
    dot.fill.fore_color.rgb = color
    dot.line.fill.background()
    add_textbox(slide, Inches(7.7), CONTENT_Y + Inches(0.45 + 0.6 * idx), Inches(2.5), Inches(0.3),
                label, font_size=14, font_color=DARK, bold=True)

add_textbox(slide, Inches(7.3), CONTENT_Y + Inches(3.3), Inches(5), Inches(0.4),
            "关联类型：", font_size=14, font_color=DARK, bold=True)
edge_types = "前置  派生  相关  示例  组成"
add_textbox(slide, Inches(7.3), CONTENT_Y + Inches(3.7), Inches(5), Inches(0.4),
            edge_types, font_size=12, font_color=GRAY)


# ════════════════════════════════════════════════════
#  Slide 8 — 学习路径 & 测验
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_title_bar(slide, "核心功能模块 — 学习路径 & 测验",
              "Core Features: Learning Path & Quiz", bar_side="right")
page_number(slide, 8, TOTAL)

box_lp, tf_lp = add_rich_textbox(slide, Inches(0.8), CONTENT_Y, Inches(5.8), Inches(2.5))
box_lp.fill.solid()
box_lp.fill.fore_color.rgb = TEAL_LIGHT
box_lp.line.color.rgb = TEAL
box_lp.line.width = Pt(1.5)

tf_lp.paragraphs[0].text = "学习路径规划"
tf_lp.paragraphs[0].font.size = Pt(18)
tf_lp.paragraphs[0].font.color.rgb = TEAL_DARK
tf_lp.paragraphs[0].font.bold = True
tf_lp.paragraphs[0].font.name = "Microsoft YaHei"

for item in [
    "输入学习目标，AI 自动生成 3-6 个里程碑",
    "每个里程碑包含讲解、要点、示例、练习",
    "AI 动态生成学习内容，进度追踪",
    "支持完成/待办切换，逐步推进",
]:
    add_bullet(tf_lp, f"▸ {item}", font_size=13, font_color=DARK)

box_q, tf_q = add_rich_textbox(slide, Inches(0.8), CONTENT_Y + Inches(2.8), Inches(5.8), Inches(2.5))
box_q.fill.solid()
box_q.fill.fore_color.rgb = COPPER_LIGHT
box_q.line.color.rgb = COPPER
box_q.line.width = Pt(1.5)

tf_q.paragraphs[0].text = "AI 智能测验"
tf_q.paragraphs[0].font.size = Pt(18)
tf_q.paragraphs[0].font.color.rgb = TEAL_DARK
tf_q.paragraphs[0].font.bold = True
tf_q.paragraphs[0].font.name = "Microsoft YaHei"

for item in [
    "任意主题生成 10 道混合题型",
    "难度分布：3 基础 + 4 中等 + 3 进阶",
    "选择题 / 判断题 / 填空题自动批改",
    "错题自动归集，支持分类复习与删除",
]:
    add_bullet(tf_q, f"▸ {item}", font_size=13, font_color=DARK)

box_m, tf_m = add_rich_textbox(slide, Inches(7.0), CONTENT_Y, Inches(5.5), Inches(5.3))
box_m.fill.solid()
box_m.fill.fore_color.rgb = RGBColor(0xF3, 0xEE, 0xFC)
box_m.line.color.rgb = VIOLET
box_m.line.width = Pt(1.5)

tf_m.paragraphs[0].text = "分层记忆系统"
tf_m.paragraphs[0].font.size = Pt(18)
tf_m.paragraphs[0].font.color.rgb = VIOLET
tf_m.paragraphs[0].font.bold = True
tf_m.paragraphs[0].font.name = "Microsoft YaHei"

add_para(tf_m, "四层记忆架构，由浅入深：", font_size=13, font_color=DARK, space_before=Pt(8))

memories = [
    ("语义记忆 (Semantic)", TEAL, "知识概念存储"),
    ("洞察记忆 (Insight)", COPPER, "新连接与新见解"),
    ("个性化记忆 (Personal)", VIOLET, "用户偏好与画像"),
    ("关联记忆 (Connecting)", RGBColor(0x5B, 0x8D, 0xE0), "跨领域知识链接"),
]

for idx, (label, color, desc) in enumerate(memories):
    add_rect(slide, Inches(7.3), CONTENT_Y + Inches(0.65 + 0.65 * idx),
             Inches(0.08), Inches(0.35), fill_color=color)
    add_textbox(slide, Inches(7.7), CONTENT_Y + Inches(0.6 + 0.65 * idx),
                Inches(4.5), Inches(0.25), f"{label} - {desc}",
                font_size=12, font_color=DARK)


# ════════════════════════════════════════════════════
#  Slide 9 — 关键技术
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_title_bar(slide, "关键技术与创新点", "Key Technologies & Innovation", bar_side="right")
page_number(slide, 9, TOTAL)

box_lg, tf_lg = add_rich_textbox(slide, Inches(0.8), CONTENT_Y, Inches(5.8), Inches(2.4))
box_lg.fill.solid()
box_lg.fill.fore_color.rgb = LIGHT_GRAY

tf_lg.paragraphs[0].text = "统一 LLM 网关"
tf_lg.paragraphs[0].font.size = Pt(18)
tf_lg.paragraphs[0].font.color.rgb = TEAL_DARK
tf_lg.paragraphs[0].font.bold = True
tf_lg.paragraphs[0].font.name = "Microsoft YaHei"

for item in [
    "基于 LiteLLM 的 acocompletion() 异步调用",
    "支持流式 SSE 与非流式两种模式",
    "更换模型仅需修改环境变量",
    "与 Tutor 角色系统深度集成",
]:
    add_bullet(tf_lg, f"▸ {item}", font_size=13, font_color=DARK)

box_wm, tf_wm = add_rich_textbox(slide, Inches(0.8), CONTENT_Y + Inches(2.7), Inches(5.8), Inches(2.7))
box_wm.fill.solid()
box_wm.fill.fore_color.rgb = LIGHT_GRAY

tf_wm.paragraphs[0].text = "智能工作记忆"
tf_wm.paragraphs[0].font.size = Pt(18)
tf_wm.paragraphs[0].font.color.rgb = TEAL_DARK
tf_wm.paragraphs[0].font.bold = True
tf_wm.paragraphs[0].font.name = "Microsoft YaHei"

for item in [
    "128K token 滑动窗口管理",
    "中英双语 token 估算：中文x2, 英文x0.3",
    "系统提示词注入（来自 Tutor 角色）",
    "计划迁移至 Redis 实现持久化",
]:
    add_bullet(tf_wm, f"▸ {item}", font_size=13, font_color=DARK)

box_in, tf_in = add_rich_textbox(slide, Inches(7.2), CONTENT_Y, Inches(5.5), Inches(5.4))
box_in.fill.solid()
box_in.fill.fore_color.rgb = WHITE
box_in.line.color.rgb = TEAL
box_in.line.width = Pt(2)

tf_in.paragraphs[0].text = "核心创新点"
tf_in.paragraphs[0].font.size = Pt(20)
tf_in.paragraphs[0].font.color.rgb = TEAL_DARK
tf_in.paragraphs[0].font.bold = True
tf_in.paragraphs[0].font.name = "Microsoft YaHei"

innovations = [
    ("1. 多角色教学人格系统", "四种不同教学风格的 AI Tutor，\n通过系统提示和温度参数差异化实现"),
    ("2. 自动化知识图谱构建", "每次对话后无声调用 LLM 提取知识，\n单会话/全局聚合双视图"),
    ("3. 分层记忆指示器", "直观展示 AI 回答所使用的记忆层，\n语义/洞察/个性化/关联四色标识"),
    ("4. 统一 API 响应规范", "全系统 {code, data, message}\n标准化错误处理与前端适配"),
]

for label, desc in innovations:
    add_para(tf_in, label, font_size=15, font_color=TEAL_DARK, bold=True, space_before=Pt(14))
    add_bullet(tf_in, desc, level=0, font_size=12, font_color=GRAY)


# ════════════════════════════════════════════════════
#  Slide 10 — 代码示例
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_title_bar(slide, "关键技术实现", "Key Implementation Details", bar_side="left")
page_number(slide, 10, TOTAL)

code_bg = RGBColor(0x1E, 0x1E, 0x2E)

# Label above code blocks
add_textbox(slide, Inches(0.8), CONTENT_Y - Inches(0.15), Inches(4), Inches(0.35),
            "LLM 流式调用", font_size=14, font_color=TEAL, bold=True)
add_textbox(slide, Inches(7.0), CONTENT_Y - Inches(0.15), Inches(4), Inches(0.35),
            "工作记忆 Token 管理", font_size=14, font_color=TEAL, bold=True)

box_code, tf_code = add_rich_textbox(slide, Inches(0.8), CONTENT_Y + Inches(0.25), Inches(5.8), Inches(5.0))
box_code.fill.solid()
box_code.fill.fore_color.rgb = code_bg

code_text = """# LLM Gateway - 统一流式调用
async def stream_chat(system_prompt, messages):
    response = await acompletion(
        model=settings.LLM_MODEL,
        messages=[{"role":"system",
                   "content":system_prompt}] + messages,
        stream=True,
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
        temperature=tutor.temperature,
    )
    async for chunk in response:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta"""

tf_code.paragraphs[0].text = code_text
tf_code.paragraphs[0].font.size = Pt(11)
tf_code.paragraphs[0].font.color.rgb = RGBColor(0xA6, 0xE2, 0x2E)
tf_code.paragraphs[0].font.name = "JetBrains Mono"
tf_code.paragraphs[0].alignment = PP_ALIGN.LEFT

box_wm2, tf_wm2 = add_rich_textbox(slide, Inches(7.0), CONTENT_Y + Inches(0.25), Inches(5.5), Inches(5.0))
box_wm2.fill.solid()
box_wm2.fill.fore_color.rgb = code_bg

wm_code = """# Working Memory - 滑动窗口
class WorkingMemory:
    MAX_TOKENS = 128_000

    def estimate_tokens(self, text: str) -> int:
        cn = sum(1 for c in text
                 if '一' <= c <= '鿿')
        en = len(text) - cn
        return cn * 2 + int(en * 0.3)

    def trim_to_fit(self, messages):
        total = sum(self.estimate_tokens(m.content)
                    for m in messages)
        while total > self.MAX_TOKENS and messages:
            dropped = messages.pop(0)
            total -= self.estimate_tokens(
                dropped.content)
        return messages"""

tf_wm2.paragraphs[0].text = wm_code
tf_wm2.paragraphs[0].font.size = Pt(11)
tf_wm2.paragraphs[0].font.color.rgb = RGBColor(0xA6, 0xE2, 0x2E)
tf_wm2.paragraphs[0].font.name = "JetBrains Mono"
tf_wm2.paragraphs[0].alignment = PP_ALIGN.LEFT


# ════════════════════════════════════════════════════
#  Slide 11 — 数据模型
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_title_bar(slide, "数据模型设计", "Data Model Design", bar_side="right")
page_number(slide, 11, TOTAL)

models_info = [
    ("User 用户", TEAL, "用户认证、偏好设置、账号管理"),
    ("Session 会话", COPPER, "聊天会话、Tutor 指派"),
    ("Message 消息", RGBColor(0x5B, 0x8D, 0xE0), "用户/助手的对话记录"),
    ("KnowledgeNode 知识节点", RGBColor(0x2D, 0x9C, 0x7C), "概念、术语、公式、方法"),
    ("KnowledgeEdge 知识边", VIOLET, "前置、派生、相关、示例、组成"),
    ("LearningPath 学习路径", RGBColor(0xE6, 0x7E, 0x22), "里程碑规划与进度追踪"),
    ("TutorRole 助教角色", RGBColor(0xDC, 0x26, 0x26), "四种预设教学人格"),
    ("WrongAnswer 错题集", RGBColor(0x9B, 0x59, 0xB6), "自动收集错题与答案对比"),
]

for i, (name, color, desc) in enumerate(models_info):
    row = i // 2
    col = i % 2
    x = Inches(0.8) + Inches(6.2) * col
    y = CONTENT_Y + Inches(0.7) * row

    dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, y + Inches(0.08), Inches(0.16), Inches(0.16))
    dot.fill.solid()
    dot.fill.fore_color.rgb = color
    dot.line.fill.background()

    add_textbox(slide, x + Inches(0.3), y, Inches(2.5), Inches(0.3),
                name, font_size=14, font_color=DARK, bold=True)
    add_textbox(slide, x + Inches(2.8), y + Inches(0.02), Inches(3.0), Inches(0.3),
                desc, font_size=12, font_color=GRAY)

# Key design patterns at bottom
box_pat, tf_pat = add_rich_textbox(slide, Inches(0.8), CONTENT_Y + Inches(3.5), Inches(11.7), Inches(1.5))
box_pat.fill.solid()
box_pat.fill.fore_color.rgb = LIGHT_GRAY

tf_pat.paragraphs[0].text = "关键设计模式"
tf_pat.paragraphs[0].font.size = Pt(16)
tf_pat.paragraphs[0].font.color.rgb = TEAL_DARK
tf_pat.paragraphs[0].font.bold = True
tf_pat.paragraphs[0].font.name = "Microsoft YaHei"

add_para(tf_pat,
         "UUID 字符串主键  |  DateTime(timezone=True) 时间戳  |  统一的 {code, data, message} 响应格式  |  全局异常处理器三层覆盖  |  SQLite 开发 / PostgreSQL 生产双模式",
         font_size=12, font_color=DARK, space_before=Pt(4))


# ════════════════════════════════════════════════════
#  Slide 12 — 总结与展望
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_title_bar(slide, "总结与展望", "Summary & Future Work", bar_side="left")
page_number(slide, 12, TOTAL)

box_sum, tf_sum = add_rich_textbox(slide, Inches(0.8), CONTENT_Y, Inches(5.8), Inches(5.2))
box_sum.fill.solid()
box_sum.fill.fore_color.rgb = TEAL_LIGHT
box_sum.line.color.rgb = TEAL
box_sum.line.width = Pt(1.5)

tf_sum.paragraphs[0].text = "已完成工作"
tf_sum.paragraphs[0].font.size = Pt(20)
tf_sum.paragraphs[0].font.color.rgb = TEAL_DARK
tf_sum.paragraphs[0].font.bold = True
tf_sum.paragraphs[0].font.name = "Microsoft YaHei"

for item in [
    "完整的多轮对话系统与 4 种 Tutor 人格",
    "自动知识图谱构建与力导向图可视化",
    "AI 学习路径规划与里程碑内容生成",
    "智能测验生成与错题自动归集系统",
    "用户账户管理、偏好设置与数据导出",
    "暗色模式与响应式界面设计",
]:
    add_bullet(tf_sum, f"v {item}", font_size=14, font_color=DARK)

box_fut, tf_fut = add_rich_textbox(slide, Inches(7.2), CONTENT_Y, Inches(5.5), Inches(5.2))
box_fut.fill.solid()
box_fut.fill.fore_color.rgb = COPPER_LIGHT
box_fut.line.color.rgb = COPPER
box_fut.line.width = Pt(1.5)

tf_fut.paragraphs[0].text = "未来展望"
tf_fut.paragraphs[0].font.size = Pt(20)
tf_fut.paragraphs[0].font.color.rgb = TEAL_DARK
tf_fut.paragraphs[0].font.bold = True
tf_fut.paragraphs[0].font.name = "Microsoft YaHei"

for item in [
    "工作记忆迁移至 Redis 持久化存储",
    "多模态支持（图片理解与分析）",
    "联机协作学习小组功能",
    "学习行为分析与个性化推荐",
    "移动端适配与 PWA 支持",
    "更多 Tutor 人格与社区贡献机制",
]:
    add_bullet(tf_fut, f"> {item}", font_size=14, font_color=DARK)


# ════════════════════════════════════════════════════
#  Slide 13 — 致谢
# ════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, WHITE)

add_rect(slide, 0, 0, W, Inches(0.08), fill_color=TEAL)
add_rect(slide, 0, Inches(0.08), W, Inches(0.04), fill_color=COPPER)

add_textbox(slide, Inches(1), Inches(2.0), Inches(11.3), Inches(1.5),
            "感谢聆听", font_size=48, font_color=TEAL_DARK, bold=True,
            alignment=PP_ALIGN.CENTER)

add_rect(slide, Inches(5.5), Inches(3.3), Inches(2.3), Inches(0.04), fill_color=TEAL)

add_textbox(slide, Inches(1), Inches(3.7), Inches(11.3), Inches(0.8),
            "PIAS - Personalized Intelligent Assistant System", font_size=22, font_color=COPPER,
            alignment=PP_ALIGN.CENTER)

add_textbox(slide, Inches(1), Inches(4.8), Inches(11.3), Inches(0.6),
            "欢迎提问与交流", font_size=18, font_color=GRAY,
            alignment=PP_ALIGN.CENTER)

add_rect(slide, 0, H - Inches(0.12), W, Inches(0.12), fill_color=TEAL)

page_number(slide, 13, TOTAL)


# ════════════════════════════════════════════════════
#  Save
# ════════════════════════════════════════════════════
output_path = os.path.join(os.path.expanduser("~"), "Desktop", "PIAS_答辩_PPT.pptx")
prs.save(output_path)
print(f"PPT 已生成到桌面: {output_path}")
