import type { PixelGrid } from './appIcon.ts'

export interface PixelRun { x: number; y: number; width: number; color: string }

/** Merge horizontal runs of one colour so a grid becomes a handful of SVG rects. */
export function gridRuns(grid: PixelGrid): PixelRun[] {
  const runs: PixelRun[] = []
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const color = row[x]
      let end = x + 1
      while (end < row.length && row[end] === color) end += 1
      if (color) runs.push({ x, y, width: end - x, color })
      x = end
    }
  })
  return runs
}

/** Standalone SVG markup, used by the asset script for favicon.svg and the boot-screen logo. */
export function gridToSvg(grid: PixelGrid) {
  const width = grid[0].length
  const height = grid.length
  const rects = gridRuns(grid).map((run) => `<rect x="${run.x}" y="${run.y}" width="${run.width}" height="1" fill="${run.color}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 8}" height="${height * 8}" shape-rendering="crispEdges">${rects}</svg>\n`
}
