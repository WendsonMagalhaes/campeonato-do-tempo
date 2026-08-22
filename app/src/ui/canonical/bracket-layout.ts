/**
 * Copa Esperança deterministic 16-team bilateral bracket.
 * No bracket topology may come from an image generator.
 */

export type Side = 'left' | 'right';
export type BracketRound = 'R16' | 'QF' | 'SF' | 'FINALIST';

export interface NodePosition {
  id: string;
  side: Side;
  round: BracketRound;
  index: number;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
}

export interface Connector {
  from: string;
  to: string;
}

const Y_R16 = [0.08, 0.19, 0.30, 0.41, 0.59, 0.70, 0.81, 0.92];
const midpoint = (a: number, b: number) => (a + b) / 2;
const derive = (input: number[]) => input.reduce<number[]>((acc, _, i) => {
  if (i % 2 === 0) acc.push(midpoint(input[i], input[i + 1]));
  return acc;
}, []);

const Y_QF = derive(Y_R16); // 4
const Y_SF = derive(Y_QF);  // 2
const Y_FINALIST = derive(Y_SF); // 1

export function buildSide(side: Side): { nodes: NodePosition[]; connectors: Connector[] } {
  const mirrored = side === 'right';
  const x = {
    R16: mirrored ? 0.93 : 0.07,
    QF: mirrored ? 0.80 : 0.20,
    SF: mirrored ? 0.68 : 0.32,
    FINALIST: mirrored ? 0.58 : 0.42,
  };

  const nodes: NodePosition[] = [];
  const connectors: Connector[] = [];

  const addRound = (round: BracketRound, ys: number[]) => {
    ys.forEach((y, index) => nodes.push({ id: `${side}-${round}-${index}`, side, round, index, x: x[round], y }));
  };

  addRound('R16', Y_R16);
  addRound('QF', Y_QF);
  addRound('SF', Y_SF);
  addRound('FINALIST', Y_FINALIST);

  for (let i = 0; i < 8; i++) connectors.push({ from: `${side}-R16-${i}`, to: `${side}-QF-${Math.floor(i / 2)}` });
  for (let i = 0; i < 4; i++) connectors.push({ from: `${side}-QF-${i}`, to: `${side}-SF-${Math.floor(i / 2)}` });
  for (let i = 0; i < 2; i++) connectors.push({ from: `${side}-SF-${i}`, to: `${side}-FINALIST-0` });

  return { nodes, connectors };
}

export function buildFullBracket() {
  const left = buildSide('left');
  const right = buildSide('right');
  return {
    nodes: [...left.nodes, ...right.nodes],
    connectors: [...left.connectors, ...right.connectors],
    final: { leftFinalist: 'left-FINALIST-0', rightFinalist: 'right-FINALIST-0' },
  };
}
