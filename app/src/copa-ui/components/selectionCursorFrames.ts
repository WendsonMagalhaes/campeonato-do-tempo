/**
 * Pre-cropped selection cursor frames (moldura around photo).
 * Source sheet: /assets/ui/selection_cursor_frame_sheet.png
 * Do NOT atlas-slice at runtime — use these PNG paths only.
 *
 * Team Formation wiring (QA 2026-08-15): IDLE + LOCK only.
 * MOVE / SELECTED assets remain on disk but are not used (too flashy / invade neighbors).
 */

export type CursorPlayer = 'p1' | 'p2'

/** Active TF cursor states — waiting/navigating = idle; confirmed = lock. */
export type CursorAnimState = 'idle' | 'lock'

const frame = (player: CursorPlayer, state: CursorAnimState, i: number) =>
  `/assets/runtime/cursors/${player}/${state}_${String(i).padStart(2, '0')}.png`

function sequence(player: CursorPlayer, state: CursorAnimState): readonly string[] {
  return [1, 2, 3, 4].map((i) => frame(player, state, i)) as [string, string, string, string]
}

export const SELECTION_CURSOR_FRAMES: Record<
  CursorPlayer,
  Record<CursorAnimState, readonly string[]>
> = {
  p1: {
    idle: sequence('p1', 'idle'),
    lock: sequence('p1', 'lock'),
  },
  p2: {
    idle: sequence('p2', 'idle'),
    lock: sequence('p2', 'lock'),
  },
}

/** FPS per state — LOCK plays once then holds last frame. */
export const SELECTION_CURSOR_FPS: Record<CursorAnimState, number> = {
  idle: 5,
  lock: 10,
}
