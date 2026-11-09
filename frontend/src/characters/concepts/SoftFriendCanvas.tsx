import { useEffect, useRef, useState } from 'react'

import { renderFriend } from './friends'
import type { EmotionKey } from '../pixel/palette'

export interface SoftFriendSpec {
  primary: { key: EmotionKey; score: number }
  secondary: { key: EmotionKey; score: number } | null
}

interface SoftFriendCanvasProps {
  spec: SoftFriendSpec
  label: string
  scale: number
  walking?: boolean
  secondaryRelation?: 'companion' | 'residual' | 'relief' | 'reversal' | null
  /** Shown only when there is no second emotion: the balloons take the hand otherwise. */
  item?: string | null
}

/** Renders the soft-color character shown in /prototype/characters/colors. */
export function SoftFriendCanvas({ spec, label, scale, walking = false, secondaryRelation = null, item = null }: SoftFriendCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!walking || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = window.setInterval(() => setTick((current) => current + 1), 170)
    return () => window.clearInterval(timer)
  }, [walking])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const sprite = renderFriend(spec, { tick, walking, soft: true, accessory: 'balloon', secondaryRelation, heldItem: item })
    context.clearRect(0, 0, 40, 40)
    sprite.px.forEach((color, index) => {
      if (!color) return
      context.fillStyle = color
      context.fillRect(index % 40, Math.floor(index / 40), 1, 1)
    })
  }, [spec.primary.key, spec.primary.score, spec.secondary?.key, spec.secondary?.score, tick, walking, secondaryRelation, item])

  return (
    <span
      className="pixel-character"
      style={{ display: 'inline-block', width: `min(100%, ${40 * scale}px)`, aspectRatio: '1', lineHeight: 0 }}
    >
      <canvas
        ref={canvasRef}
        width={40}
        height={40}
        role="img"
        aria-label={label}
        style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated' }}
      />
    </span>
  )
}
