import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { drawCharacter, drawCharacterWithEmotionEffect } from './canvasExport'
import { EFFECT_CANVAS_WIDTH } from './emotionEffects'
import type { EmotionKey } from './palette'
import type { RenderedCharacter } from './renderCharacter'

interface PixelCharacterCanvasProps {
  character: RenderedCharacter
  label: string
  /** 정수 배율. CSS로 확대하며 nearest-neighbor(pixelated)로 표시된다. */
  scale?: number
  grid?: boolean
  emotionEffect?: EmotionKey | null
  animateEffect?: boolean
  /** 부모 카드/방 슬롯에 비율을 유지한 채 맞춘다. */
  fit?: boolean
}

export function PixelCharacterCanvas({
  character,
  label,
  scale = 4,
  grid = false,
  emotionEffect,
  animateEffect = true,
  fit = false,
}: PixelCharacterCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [raisedFrame, setRaisedFrame] = useState(false)
  const resolvedEmotionEffect = emotionEffect === undefined ? character.secondaryEffect : emotionEffect

  useEffect(() => {
    if (!resolvedEmotionEffect || !animateEffect) return undefined
    const timer = window.setInterval(() => setRaisedFrame((current) => !current), 500)
    return () => window.clearInterval(timer)
  }, [resolvedEmotionEffect, animateEffect])

  useEffect(() => {
    if (!ref.current) return
    if (resolvedEmotionEffect) drawCharacterWithEmotionEffect(ref.current, character, resolvedEmotionEffect, animateEffect && raisedFrame)
    else drawCharacter(ref.current, character)
  }, [character, resolvedEmotionEffect, animateEffect, raisedFrame])

  const pixelScale = Math.max(1, Math.round(scale))
  const logicalWidth = resolvedEmotionEffect ? EFFECT_CANVAS_WIDTH : character.size
  const width = logicalWidth * pixelScale
  const height = character.size * pixelScale
  return (
    <span
      className={`pixel-character${grid ? ' pixel-character--grid' : ''}${fit ? ' pixel-character--fit' : ''}`}
      style={{ width: fit ? '100%' : width, height: fit ? 'auto' : height, '--pixel-cell': `${pixelScale}px` } as CSSProperties}
    >
      <canvas ref={ref} width={logicalWidth} height={character.size} role="img" aria-label={label} />
    </span>
  )
}
