import { toRgba, type RenderedCharacter } from './renderCharacter'
import { EFFECT_CANVAS_WIDTH, composeCharacterWithEmotionEffect } from './emotionEffects'
import type { EmotionKey } from './palette'

export function drawCharacter(canvas: HTMLCanvasElement, character: RenderedCharacter) {
  const context = canvas.getContext('2d')
  if (!context) return
  const image = context.createImageData(character.size, character.size)
  image.data.set(toRgba(character.pixels))
  context.putImageData(image, 0, 0)
}

export function drawCharacterWithEmotionEffect(
  canvas: HTMLCanvasElement,
  character: RenderedCharacter,
  emotion: EmotionKey,
  raisedFrame = false,
) {
  const context = canvas.getContext('2d')
  if (!context) return
  const composition = composeCharacterWithEmotionEffect(character, emotion, raisedFrame)
  const image = context.createImageData(composition.width, composition.height)
  image.data.set(toRgba(composition.pixels))
  context.putImageData(image, 0, 0)
}

/** 투명 배경을 유지한 PNG로 저장 (배율은 정수, 보간 없음) */
export function downloadCharacterPng(character: RenderedCharacter, fileName: string, scale = 1) {
  const source = document.createElement('canvas')
  source.width = character.secondaryEffect ? EFFECT_CANVAS_WIDTH : character.size
  source.height = character.size
  if (character.secondaryEffect) drawCharacterWithEmotionEffect(source, character, character.secondaryEffect)
  else drawCharacter(source, character)
  const output = document.createElement('canvas')
  output.width = source.width * scale
  output.height = character.size * scale
  const context = output.getContext('2d')
  if (!context) return
  context.imageSmoothingEnabled = false
  context.drawImage(source, 0, 0, output.width, output.height)
  output.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
