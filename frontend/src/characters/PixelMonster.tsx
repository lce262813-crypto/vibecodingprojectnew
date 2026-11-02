import type { CSSProperties } from 'react'

export interface PixelMonsterParts {
  body: string
  color: string
  eyebrow: string
  eyes: string
  mouth: string
  decoration?: string | null
  effects?: string[]
  mutation?: string | null
}

interface PixelMonsterProps {
  alt: string
  parts: PixelMonsterParts
}

const root = '/assets/character-prototype'

function layer(folder: string, name: string) {
  return `${root}/parts/${folder}/${name}.png`
}

export function PixelMonster({ alt, parts }: PixelMonsterProps) {
  const bodySource = `${root}/bodies/${parts.body}.png`
  const tintStyle = {
    '--monster-body-mask': `url("${bodySource}")`,
    backgroundColor: parts.color,
  } as CSSProperties

  return (
    <span className="pixel-monster" role="img" aria-label={alt}>
      <img aria-hidden="true" className="pixel-monster__layer" src={bodySource} />
      <span aria-hidden="true" className="pixel-monster__tint" style={tintStyle} />
      {parts.mutation && (
        <img aria-hidden="true" className="pixel-monster__layer" src={layer('mutations', parts.mutation)} />
      )}
      <img aria-hidden="true" className="pixel-monster__layer pixel-monster__layer--ink" src={layer('eyebrows', parts.eyebrow)} />
      <img aria-hidden="true" className="pixel-monster__layer pixel-monster__layer--ink" src={layer('eyes', parts.eyes)} />
      <img aria-hidden="true" className="pixel-monster__layer pixel-monster__layer--ink" src={layer('mouths', parts.mouth)} />
      {parts.decoration && (
        <img aria-hidden="true" className="pixel-monster__layer" src={layer('decorations', parts.decoration)} />
      )}
      {parts.effects?.map((effect) => (
        <img aria-hidden="true" className="pixel-monster__layer" key={effect} src={layer('effects', effect)} />
      ))}
    </span>
  )
}
