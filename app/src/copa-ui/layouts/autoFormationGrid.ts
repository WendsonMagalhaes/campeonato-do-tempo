export type GridArea = { x: number; y: number; w: number; h: number }

export type AutoGridCell = {
  index: number
  x: number
  y: number
  w: number
  h: number
}

export type AutoGridResult = {
  cols: number
  rows: number
  cellW: number
  cellH: number
  cells: AutoGridCell[]
}

/**
 * Fits `count` cards into `area` (design px), picking the column count that
 * maximizes card size while respecting `aspectRatio` (width / height) and `gap`.
 *
 * Centers the grid inside `area`, and centers the last (possibly incomplete)
 * row so an odd count doesn't look lopsided.
 */
export function computeAutoGrid(
  count: number,
  area: GridArea,
  options: { aspectRatio?: number; gap?: number; maxCols?: number } = {},
): AutoGridResult {
  if (count <= 0) {
    return { cols: 0, rows: 0, cellW: 0, cellH: 0, cells: [] }
  }

  const aspectRatio = options.aspectRatio ?? 0.8 // width / height, portrait card
  const gap = options.gap ?? 16
  const maxCols = Math.min(options.maxCols ?? count, count)

  let best: { cols: number; rows: number; cellW: number; cellH: number } | null = null

  for (let cols = 1; cols <= maxCols; cols++) {
    const rows = Math.ceil(count / cols)
    const cellW = (area.w - gap * (cols - 1)) / cols
    const cellH = cellW / aspectRatio
    const totalH = cellH * rows + gap * (rows - 1)
    if (totalH > area.h) continue
    if (!best || cellW > best.cellW) {
      best = { cols, rows, cellW, cellH }
    }
  }

  // Fallback: too many items for the area at min size — shrink by height instead.
  if (!best) {
    const cols = maxCols
    const rows = Math.ceil(count / cols)
    const cellH = (area.h - gap * (rows - 1)) / rows
    const cellW = cellH * aspectRatio
    best = { cols, rows, cellW, cellH }
  }

  const { cols, rows, cellW, cellH } = best
  const gridW = cellW * cols + gap * (cols - 1)
  const gridH = cellH * rows + gap * (rows - 1)
  const offsetX = area.x + (area.w - gridW) / 2
  const offsetY = area.y + (area.h - gridH) / 2

  const cells: AutoGridCell[] = []
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols
    const itemsInRow = row === rows - 1 ? count - cols * (rows - 1) : cols
    const rowW = itemsInRow * cellW + gap * (itemsInRow - 1)
    const rowOffsetX = offsetX + (gridW - rowW) / 2
    cells.push({
      index: i,
      x: rowOffsetX + col * (cellW + gap),
      y: offsetY + row * (cellH + gap),
      w: cellW,
      h: cellH,
    })
  }

  return { cols, rows, cellW, cellH, cells }
}