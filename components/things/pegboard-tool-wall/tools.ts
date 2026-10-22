/** Hand tools as flat coloured parts, in metres, hanging from the origin with y running down (negative). */
export type Part =
  | { k: 'poly'; pts: [number, number][]; m: string; d?: number }
  | { k: 'circ'; c: [number, number]; r: number; hole?: number; m: string; d?: number };
export interface Tool { name: string; parts: Part[] }

const R = (x0: number, y0: number, x1: number, y1: number, m: string, d?: number): Part => ({ k: 'poly', pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], m, d });
const P = (pts: [number, number][], m: string, d?: number): Part => ({ k: 'poly', pts, m, d });
const C = (x: number, y: number, r: number, m: string, hole?: number, d?: number): Part => ({ k: 'circ', c: [x, y], r, hole, m, d });

const hammer: Tool = { name: 'hammer', parts: [
  R(-0.014, -0.34, 0.014, -0.03, 'wood', 0.024),
  P([[-0.07, -0.005], [-0.035, 0], [0.05, 0], [0.05, -0.04], [-0.03, -0.04], [-0.075, -0.06], [-0.08, -0.05], [-0.05, -0.02]], 'steel', 0.03),
] };
const ballpeen: Tool = { name: 'ball-peen hammer', parts: [
  R(-0.012, -0.3, 0.012, -0.03, 'wood', 0.022), R(-0.045, -0.038, 0.04, 0, 'steel', 0.03), C(-0.055, -0.019, 0.02, 'steel', 0, 0.03),
] };
const mallet: Tool = { name: 'mallet', parts: [R(-0.015, -0.32, 0.015, -0.08, 'wood', 0.024), R(-0.075, -0.09, 0.075, 0, 'darkwood', 0.06)] };
const saw: Tool = { name: 'handsaw', parts: [
  P([[-0.055, -0.11], [0.06, -0.09], [0.022, -0.62], [-0.02, -0.62]], 'steel', 0.003),
  P([[-0.06, 0], [0.065, 0], [0.07, -0.1], [0.02, -0.13], [-0.06, -0.12]], 'wood', 0.022),
] };
const square: Tool = { name: 'try square', parts: [R(-0.11, -0.035, 0.07, 0, 'darkwood', 0.02), R(0.02, -0.26, 0.065, -0.035, 'steel', 0.003)] };
const screwdriver = (m: string, len = 1): Tool => ({ name: 'screwdriver', parts: [
  R(-0.016, -0.1, 0.016, 0, m, 0.03), R(-0.005, -0.1 - 0.15 * len, 0.005, -0.1, 'steel', 0.01),
] });
const chisel: Tool = { name: 'chisel', parts: [R(-0.015, -0.11, 0.015, 0, 'wood', 0.028), P([[-0.008, -0.11], [0.008, -0.11], [0.014, -0.24], [-0.014, -0.24]], 'steel', 0.008)] };
const level: Tool = { name: 'spirit level', parts: [
  R(-0.028, -0.62, 0.028, 0, 'yellow', 0.022), C(0, -0.31, 0.016, 'green', 0, 0.024), C(0, -0.07, 0.012, 'green', 0, 0.024), C(0, -0.55, 0.012, 'green', 0, 0.024),
] };
const pliers = (m: string): Tool => ({ name: 'pliers', parts: [
  P([[-0.012, 0], [0.012, 0], [0.016, -0.06], [-0.016, -0.06]], 'steel', 0.012),
  P([[-0.016, -0.06], [-0.002, -0.06], [-0.022, -0.2], [-0.04, -0.2]], m, 0.014),
  P([[0.002, -0.06], [0.016, -0.06], [0.04, -0.2], [0.022, -0.2]], m, 0.014),
] });
const adjustable: Tool = { name: 'adjustable wrench', parts: [
  R(-0.014, -0.27, 0.014, -0.05, 'steel', 0.01),
  P([[-0.035, 0], [-0.012, 0], [-0.012, -0.03], [0.012, -0.03], [0.012, 0], [0.035, -0.005], [0.03, -0.065], [-0.03, -0.065]], 'steel', 0.014),
] };
const wrench = (size: number): Tool => ({ name: 'spanner', parts: [
  R(-0.009 * size, -0.2 * size, 0.009 * size, -0.03 * size, 'steel', 0.007),
  C(0, -0.02 * size, 0.024 * size, 'steel', 0.012 * size, 0.008),
  P([[-0.022 * size, -0.2 * size], [0.022 * size, -0.2 * size], [0.024 * size, -0.245 * size], [0.008 * size, -0.245 * size], [0.008 * size, -0.22 * size], [-0.008 * size, -0.22 * size], [-0.008 * size, -0.245 * size], [-0.024 * size, -0.245 * size]], 'steel', 0.008),
] });
const hacksaw: Tool = { name: 'hacksaw', parts: [
  R(-0.17, -0.016, 0.13, 0, 'blue', 0.012), R(-0.17, -0.1, -0.156, 0, 'blue', 0.012), R(-0.17, -0.1, 0.13, -0.09, 'steel', 0.003),
  P([[0.11, 0], [0.17, 0], [0.19, -0.13], [0.14, -0.14], [0.13, -0.1], [0.11, -0.1]], 'black', 0.024),
] };
const tape: Tool = { name: 'tape measure', parts: [C(0, -0.045, 0.045, 'yellow', 0, 0.035), C(0, -0.045, 0.02, 'black', 0, 0.037), R(0.03, -0.095, 0.06, -0.08, 'steel', 0.02)] };
const clamp: Tool = { name: 'G-clamp', parts: [
  P([[-0.06, 0], [0.05, 0], [0.05, -0.03], [-0.035, -0.03], [-0.035, -0.15], [0.05, -0.15], [0.05, -0.18], [-0.06, -0.18]], 'red', 0.02),
  R(0.02, -0.26, 0.032, -0.1, 'steel', 0.012), R(-0.005, -0.27, 0.057, -0.258, 'steel', 0.008),
] };
const ratchet: Tool = { name: 'ratchet', parts: [R(-0.01, -0.16, 0.01, -0.03, 'steel', 0.01), C(0, -0.022, 0.024, 'steel', 0, 0.02), R(-0.014, -0.27, 0.014, -0.16, 'black', 0.024)] };
const tyreIron: Tool = { name: 'wheel brace', parts: [R(-0.012, -0.36, 0.012, 0, 'steel', 0.02), R(-0.18, -0.192, 0.18, -0.168, 'steel', 0.02), C(0, -0.18, 0.025, 'steel', 0, 0.024)] };
const oilcan: Tool = { name: 'oil can', parts: [P([[-0.05, -0.2], [0.05, -0.2], [0.05, -0.13], [0.012, -0.09], [0.006, 0], [-0.006, 0], [-0.012, -0.09], [-0.05, -0.13]], 'red', 0.08)] };
// Garden.
const trowel: Tool = { name: 'trowel', parts: [R(-0.014, -0.12, 0.014, 0, 'green', 0.028), R(-0.005, -0.16, 0.005, -0.12, 'steel', 0.01), P([[-0.038, -0.16], [0.038, -0.16], [0.03, -0.27], [0, -0.31], [-0.03, -0.27]], 'steel', 0.006)] };
const handfork: Tool = { name: 'hand fork', parts: [
  R(-0.014, -0.12, 0.014, 0, 'green', 0.028), R(-0.035, -0.17, 0.035, -0.12, 'steel', 0.008),
  R(-0.035, -0.29, -0.022, -0.17, 'steel', 0.008), R(-0.006, -0.29, 0.006, -0.17, 'steel', 0.008), R(0.022, -0.29, 0.035, -0.17, 'steel', 0.008),
] };
const pruners: Tool = { name: 'secateurs', parts: [
  P([[-0.006, 0], [0.02, -0.01], [0.018, -0.075], [-0.014, -0.075]], 'steel', 0.01),
  P([[-0.016, -0.075], [0, -0.075], [-0.018, -0.21], [-0.04, -0.21]], 'red', 0.016), P([[0.002, -0.075], [0.018, -0.075], [0.04, -0.21], [0.02, -0.21]], 'red', 0.016),
] };
const shears: Tool = { name: 'hedge shears', parts: [
  P([[-0.07, 0], [-0.045, 0], [0.012, -0.3], [-0.012, -0.3]], 'steel', 0.006), P([[0.07, 0], [0.045, 0], [-0.012, -0.3], [0.012, -0.3]], 'steel', 0.008),
  P([[-0.014, -0.3], [0.006, -0.3], [-0.06, -0.52], [-0.085, -0.52]], 'wood', 0.024), P([[-0.006, -0.3], [0.014, -0.3], [0.085, -0.52], [0.06, -0.52]], 'wood', 0.024),
] };
const spade: Tool = { name: 'spade', parts: [
  P([[-0.055, 0], [0.055, 0], [0.04, -0.07], [-0.04, -0.07]], 'wood', 0.026), R(-0.015, -0.62, 0.015, -0.06, 'wood', 0.028),
  P([[-0.085, -0.62], [0.085, -0.62], [0.08, -0.88], [0, -0.92], [-0.08, -0.88]], 'steel', 0.006),
] };
const rake: Tool = { name: 'rake', parts: [
  R(-0.19, -0.03, 0.19, 0, 'steel', 0.012),
  ...Array.from({ length: 9 }, (_, i) => R(-0.185 + i * 0.045, 0.0 - 0.09, -0.175 + i * 0.045, -0.03, 'steel', 0.01)),
  R(-0.014, -0.92, 0.014, -0.03, 'wood', 0.026),
] };
const hoe: Tool = { name: 'hoe', parts: [R(-0.014, -0.92, 0.014, 0, 'wood', 0.026), P([[-0.014, -0.02], [-0.1, -0.02], [-0.1, -0.11], [-0.014, -0.06]], 'steel', 0.006)] };
const hose: Tool = { name: 'hose', parts: [C(0, -0.17, 0.17, 'green', 0.1, 0.07), C(0, -0.17, 0.15, 'hose', 0.11, 0.09), R(0.06, -0.42, 0.085, -0.3, 'brass', 0.03)] };
const gloves: Tool = { name: 'gloves', parts: [P([[-0.05, 0], [0.05, 0], [0.06, -0.12], [0.075, -0.2], [0.03, -0.24], [-0.04, -0.24], [-0.06, -0.14]], 'yellow', 0.02)] };
const dibber: Tool = { name: 'dibber', parts: [R(-0.04, -0.03, 0.04, 0, 'wood', 0.03), P([[-0.015, -0.03], [0.015, -0.03], [0.004, -0.26], [-0.004, -0.26]], 'wood', 0.028)] };
// Plumbing.
const pipeWrench: Tool = { name: 'pipe wrench', parts: [
  R(-0.016, -0.4, 0.016, -0.09, 'red', 0.022),
  P([[-0.03, 0], [0.045, 0], [0.045, -0.035], [0.01, -0.035], [0.01, -0.06], [0.04, -0.06], [0.04, -0.095], [-0.03, -0.095]], 'steel', 0.026),
] };
const plunger: Tool = { name: 'plunger', parts: [
  R(-0.012, -0.36, 0.012, 0, 'wood', 0.024),
  P([[-0.03, -0.36], [0.03, -0.36], [0.07, -0.42], [0.075, -0.47], [-0.075, -0.47], [-0.07, -0.42]], 'rubber', 0.13),
] };
const basinWrench: Tool = { name: 'basin wrench', parts: [
  R(-0.007, -0.36, 0.007, -0.03, 'steel', 0.012), R(-0.07, -0.375, 0.07, -0.36, 'steel', 0.012),
  P([[-0.007, -0.04], [-0.007, 0], [0.05, 0], [0.06, -0.045], [0.045, -0.05], [0.038, -0.018]], 'steel', 0.014),
] };
const coil = (m: string, r: number): Tool => ({ name: 'coil', parts: [C(0, -r, r, m, r * 0.72, 0.04)] });
const torch: Tool = { name: 'blowtorch', parts: [
  R(-0.036, -0.3, 0.036, -0.1, 'blue', 0.07), R(-0.012, -0.1, 0.012, -0.05, 'brass', 0.024),
  P([[-0.012, -0.05], [0.012, -0.05], [0.07, -0.01], [0.062, 0.0]], 'brass', 0.02),
] };
const tubeCutter: Tool = { name: 'tube cutter', parts: [
  P([[-0.04, 0], [0.04, 0], [0.04, -0.03], [-0.015, -0.03], [-0.015, -0.085], [0.04, -0.085], [0.04, -0.11], [-0.04, -0.11]], 'red', 0.022),
  C(0.02, -0.058, 0.02, 'steel', 0, 0.01), R(-0.008, -0.17, 0.008, -0.11, 'steel', 0.012), R(-0.03, -0.185, 0.03, -0.17, 'black', 0.016),
] };

export const TRADES = {
  carpentry: [saw, hammer, level, square, mallet, chisel, screwdriver('red'), screwdriver('yellow', 0.7), clamp, tape, pliers('red'), hacksaw, chisel, screwdriver('wood', 1.2)],
  garden: [spade, rake, hoe, shears, hose, trowel, handfork, pruners, gloves, dibber, trowel, coil('twine', 0.07)],
  plumbing: [pipeWrench, plunger, basinWrench, hacksaw, coil('copper', 0.15), torch, adjustable, pliers('blue'), tubeCutter, coil('white', 0.045), pipeWrench, coil('steel', 0.11)],
  mechanic: [wrench(1.5), wrench(1.35), wrench(1.2), wrench(1.08), wrench(0.96), wrench(0.85), wrench(0.75), wrench(0.65), ratchet, ballpeen, tyreIron, hacksaw,
    screwdriver('red', 1.2), screwdriver('red'), screwdriver('red', 0.7), screwdriver('black', 0.5), pliers('red'), adjustable, oilcan],
} as const;

export function extent(tool: Tool) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
  for (const part of tool.parts) {
    const pts = part.k === 'poly' ? part.pts : [[part.c[0] - part.r, part.c[1] - part.r], [part.c[0] + part.r, part.c[1] + part.r]];
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }
  }
  return { x0, x1, height: -y0 };
}
