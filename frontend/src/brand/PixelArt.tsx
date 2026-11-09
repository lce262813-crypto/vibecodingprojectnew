import { useMemo, type CSSProperties } from 'react'

import type { PixelGrid } from './appIcon.ts'
import { gridRuns } from './pixelGrid.ts'

/** Crisp SVG rendering of a pixel grid; it scales to any size without blurring. */
export function PixelArt({ className, grid, label, style }: { className?: string; grid: PixelGrid; label?: string; style?: CSSProperties }) {
  const runs = useMemo(() => gridRuns(grid), [grid])
  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
      style={style}
      role={label ? 'img' : undefined}
      shapeRendering="crispEdges"
      viewBox={`0 0 ${grid[0].length} ${grid.length}`}
    >
      {runs.map((run) => <rect fill={run.color} height="1.02" key={`${run.x}-${run.y}`} width={run.width} x={run.x} y={run.y} />)}
    </svg>
  )
}
