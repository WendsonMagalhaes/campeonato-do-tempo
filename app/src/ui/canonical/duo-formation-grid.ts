export type FormationCell =
  | { kind: 'participant'; participantIndex: number; row: number; col: number }
  | { kind: 'random'; row: 2; col: 6; label: '?' };

/** 3x11 = 33 cells. Row 2 / column 6 is the fixed random cell; remaining 32 are participants. */
export function buildFormationGrid(): FormationCell[] {
  const cells: FormationCell[] = [];
  let participantIndex = 0;
  for (let row = 1; row <= 3; row++) {
    for (let col = 1; col <= 11; col++) {
      if (row === 2 && col === 6) {
        cells.push({ kind: 'random', row: 2, col: 6, label: '?' });
      } else {
        cells.push({ kind: 'participant', participantIndex, row, col });
        participantIndex += 1;
      }
    }
  }
  if (participantIndex !== 32) throw new Error(`Invariant broken: expected 32 participants, got ${participantIndex}`);
  return cells;
}

/**
 * Presentation-only Fisher–Yates shuffle.
 * Fake shuffle / TF grid occupancy order must NOT alter predetermined duos.
 */
export function shuffleFormationOccupants<T>(
  occupants: readonly T[],
  random: () => number = Math.random,
): T[] {
  if (occupants.length !== 32) {
    throw new Error(`shuffleFormationOccupants expects 32 occupants; got ${occupants.length}`);
  }
  const arr = [...occupants];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const left = arr[i];
    const right = arr[j];
    if (left === undefined || right === undefined) continue;
    arr[i] = right;
    arr[j] = left;
  }
  return arr;
}
