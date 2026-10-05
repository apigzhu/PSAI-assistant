import { useRef, useEffect, useState, useCallback } from 'react'
import type { KnowledgeGraph, KnowledgeNode, KnowledgeEdge } from '../types'

interface Position {
  x: number
  y: number
}

const NODE_RADIUS = 34
const REPULSION = 500
const ATTRACTION = 0.008
const DAMPING = 0.85
const MIN_VELOCITY = 0.05

const TYPE_COLORS: Record<string, string> = {
  concept: '#3A7B7D',
  term: '#D4956B',
  formula: '#7C3AED',
  method: '#2563EB',
}

const TYPE_ICONS: Record<string, string> = {
  concept: '●',
  term: '?',
  formula: '∑',
  method: '⚡',
}

const RELATION_LABELS: Record<string, string> = {
  prerequisite: '前置',
  derived_from: '推导自',
  related_to: '相关',
  example_of: '示例',
  part_of: '组成部分',
}

interface Props {
  graph: KnowledgeGraph
  width?: number
  height?: number
}

interface SimNode extends KnowledgeNode {
  x: number
  y: number
  vx: number
  vy: number
}

export default function KnowledgeGraphView({ graph, width = 700, height = 450 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const animRef = useRef<number>(0)
  const [nodes, setNodes] = useState<SimNode[]>([])
  const [edges, setEdges] = useState<KnowledgeEdge[]>([])
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null)

  // 初始化物理模拟
  useEffect(() => {
    if (!graph.nodes.length) {
      setNodes([])
      setEdges([])
      return
    }

    const cx = width / 2
    const cy = height / 2
    const simNodes: SimNode[] = graph.nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / graph.nodes.length
      const radius = Math.min(width, height) * 0.32
      return {
        ...n,
        x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
      }
    })
    setNodes(simNodes)
    setEdges(graph.edges)
  }, [graph, width, height])

  // 力导向模拟
  useEffect(() => {
    if (nodes.length < 2) return

    let running = true
    const iterate = () => {
      if (!running) return

      let maxVelocity = 0
      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }))

        // 排斥力（节点之间）
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j].x - next[i].x
            const dy = next[j].y - next[i].y
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
            const force = REPULSION / (dist * dist)
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            next[i].vx -= fx
            next[i].vy -= fy
            next[j].vx += fx
            next[j].vy += fy
          }
        }

        // 吸引力（沿边）
        const nodeMap = new Map(next.map((n) => [n.id, n]))
        for (const edge of edges) {
          const src = nodeMap.get(edge.source)
          const tgt = nodeMap.get(edge.target)
          if (!src || !tgt) continue
          const dx = tgt.x - src.x
          const dy = tgt.y - src.y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const force = dist * ATTRACTION
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          src.vx += fx
          src.vy += fy
          tgt.vx -= fx
          tgt.vy -= fy
        }

        // 向中心引力
        const cx = width / 2
        const cy = height / 2
        for (const n of next) {
          n.vx += (cx - n.x) * 0.001
          n.vy += (cy - n.y) * 0.001
          n.vx *= DAMPING
          n.vy *= DAMPING
          const vel = Math.sqrt(n.vx * n.vx + n.vy * n.vy)
          if (vel > maxVelocity) maxVelocity = vel
          n.x += n.vx
          n.y += n.vy
          // 边界约束
          n.x = Math.max(NODE_RADIUS, Math.min(width - NODE_RADIUS, n.x))
          n.y = Math.max(NODE_RADIUS, Math.min(height - NODE_RADIUS, n.y))
        }

        return next
      })

      if (maxVelocity > MIN_VELOCITY) {
        animRef.current = requestAnimationFrame(iterate)
      }
    }

    animRef.current = requestAnimationFrame(iterate)
    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
    }
  }, [nodes.length > 0, edges, width, height])

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const handleNodeClick = useCallback((node: SimNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
    setHoveredNode(null)
  }, [])

  // 生成曲线路径
  const getCurvePath = (src: { x: number; y: number }, tgt: { x: number; y: number }) => {
    const dx = tgt.x - src.x
    const dy = tgt.y - src.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const cx = (src.x + tgt.x) / 2
    const cy = (src.y + tgt.y) / 2
    const offset = Math.min(dist * 0.15, 20)
    const px = -dy / dist * offset
    const py = dx / dist * offset
    return `M${src.x},${src.y} Q${cx + px},${cy + py} ${tgt.x},${tgt.y}`
  }

  if (!graph.nodes.length) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        <div className="text-center">
          <svg className="mx-auto mb-4 w-16 h-16 text-slate-200 dark:text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="8" r="2" />
            <path d="M12 12l-2 6m2-6l2 4" />
          </svg>
          <p className="font-medium">暂无知识图谱数据</p>
          <p className="text-xs mt-1">在聊天中发送消息后会自动提取知识</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-br from-paper-light via-white to-paper-light dark:from-[#181b25] dark:via-[#1e2130] dark:to-[#181b25] rounded-xl border border-slate-100 dark:border-slate-800">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full"
        style={{ minHeight: '300px' }}
      >
        <defs>
          {/* 节点发光滤镜 */}
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ===== 边（曲线连线） ===== */}
        {edges.map((edge, i) => {
          const src = nodeMap.get(edge.source)
          const tgt = nodeMap.get(edge.target)
          if (!src || !tgt) return null
          const isHighlighted = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id)
          return (
            <g key={`edge-${i}`}>
              {/* 阴影路径 */}
              <path
                d={getCurvePath(src, tgt)}
                fill="none"
                stroke={isHighlighted ? '#3A7B7D' : '#C5CCD8'}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                strokeDasharray={edge.relation === 'related_to' ? '5 4' : 'none'}
                opacity={isHighlighted ? 0.8 : 0.4}
                className="transition-all duration-300"
              />
              {/* 背景标签 */}
              <rect
                x={(src.x + tgt.x) / 2 - 14}
                y={(src.y + tgt.y) / 2 - 10}
                width={28}
                height={16}
                rx={4}
                fill="white"
                className="dark:fill-[#1e2130]"
                opacity={0.85}
              />
              <text
                x={(src.x + tgt.x) / 2}
                y={(src.y + tgt.y) / 2 + 4}
                textAnchor="middle"
                fill={isHighlighted ? '#3A7B7D' : '#8792A8'}
                fontSize="8"
                fontWeight="500"
                fontFamily="inherit"
              >
                {RELATION_LABELS[edge.relation] || edge.relation}
              </text>
            </g>
          )
        })}

        {/* ===== 节点 ===== */}
        {nodes.map((node) => {
          const isHovered = hoveredNode?.id === node.id
          const isSelected = selectedNode?.id === node.id
          const color = TYPE_COLORS[node.type] || '#6B788F'
          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => handleNodeClick(node)}
              style={{ cursor: 'pointer' }}
              className="transition-all duration-200"
            >
              {/* 发光效果 */}
              {(isHovered || isSelected) && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS + 8}
                  fill={color}
                  opacity={0.08}
                />
              )}
              {/* 节点外圈 */}
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS}
                fill={isSelected ? `${color}20` : 'white'}
                className="dark:fill-[#1e2130]"
                stroke={isSelected ? color : isHovered ? color : '#C5CCD8'}
                strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
                filter={isSelected ? 'url(#nodeGlow)' : undefined}
                style={{ transition: 'all 0.2s ease' }}
              />
              {/* 图标 */}
              <text
                x={node.x}
                y={node.y + 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
                fontSize={node.type === 'formula' ? '18' : '14'}
                fontWeight="600"
              >
                {TYPE_ICONS[node.type] || '●'}
              </text>
              {/* 标签 */}
              <text
                x={node.x}
                y={node.y + NODE_RADIUS + 15}
                textAnchor="middle"
                fill={isHovered || isSelected ? color : '#556076'}
                className="dark:fill-slate-400"
                fontSize="11"
                fontWeight={isHovered || isSelected ? '600' : '400'}
              >
                {node.label.length > 8 ? node.label.slice(0, 7) + '…' : node.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* ===== 详情浮窗 ===== */}
      {selectedNode && (
        <div className="absolute bottom-3 left-3 right-3 bg-white dark:bg-[#1e2130] rounded-xl border border-slate-100 dark:border-slate-800 shadow-lg p-4 animate-slide-up mx-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[selectedNode.type] || '#6B788F' }}
                />
                <span className="font-bold text-sm text-ink">{selectedNode.label}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {selectedNode.type === 'concept' ? '概念' :
                   selectedNode.type === 'term' ? '术语' :
                   selectedNode.type === 'formula' ? '公式' :
                   selectedNode.type === 'method' ? '方法' : selectedNode.type}
                </span>
                {selectedNode.confidence && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400">
                    置信度: {Math.round(selectedNode.confidence * 100)}%
                  </span>
                )}
              </div>
              {selectedNode.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {selectedNode.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex-shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ===== 图例 ===== */}
      <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span
            key={type}
            className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400
              bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {type === 'concept' ? '概念' :
             type === 'term' ? '术语' :
             type === 'formula' ? '公式' :
             type === 'method' ? '方法' : type}
          </span>
        ))}
      </div>
    </div>
  )
}
