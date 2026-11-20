// The house, as a list of parts: Haus Passepartout, a white frame of two storeys, open to the south.
// 1 unit = 1 metre of house. On the desk that is 1 cm, so the desk is built a hundred times its size
// and this file never has to know it is a model.
// x runs from the north wall (5) to the glass (16.85); the frame of roof, floor and side walls reaches on to 18.4.
// y up, z across the house (it spans z -7 to 3). Levels: garden -3.00, ground -0.20, ground floor 0.00, upper floor +3.10, roof +6.20.
// Upstairs is a floor with a hole in it: the living room keeps its full height behind the tall glass (x 12.6 to 16.7, z -2.2 to 2.7).
// Phases: 1 footings, 3 slabs and terrace, 4 walls, 5 upper floor and stairs, 6 roof, 7 glass, 8 fit out.

export function makeRnd(s) {
  let seed = s;
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const G = -0.2;   // the ground the house stands on
export const L1 = 3.1;   // the upper floor
export const TOP = 5.9;  // underside of the roof
// the big door: two glass leaves that part in the middle, each sliding by `slide`
export const DOOR = { x: 17.0, z0: -1.3, zm: 0.2, z1: 1.7, h: 2.6, slide: 1.0 };
// the garden steps, from the terrace down to where the little figure stands, a low kerb on either side
export const STEPS = { x0: 21.75, run: 0.75, rise: 0.2, n: 14, z0: 3.6, z1: 5.2 };

export function houseParts(rnd = makeRnd(11)) {
  const P = [];
  const box = (x0, y0, z0, x1, y1, z1, m, k = 'struct', ph = 2, o = null) => { const p = { b: [x0, y0, z0, x1, y1, z1], m, k, ph }; if (o) Object.assign(p, o); P.push(p); };
  const carve = (a0, a1, b0, b1, holes) => {
    const cuts = [...new Set([a0, a1, ...holes.flatMap((h) => [h[0], h[1]])].filter((v) => v >= a0 && v <= a1))].sort((p, q) => p - q);
    const out = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const p0 = cuts[i], p1 = cuts[i + 1], mid = (p0 + p1) / 2;
      const hs = holes.filter((h) => h[0] < mid && h[1] > mid).map((h) => [h[2], h[3]]).sort((p, q) => p[0] - q[0]);
      let y = b0;
      for (const [q0, q1] of hs) { if (q0 > y) out.push([p0, p1, y, q0]); y = Math.max(y, q1); }
      if (y < b1) out.push([p0, p1, y, b1]);
    }
    return out;
  };
  // a wall: axis 'x' is thick along x and spans (z, y); axis 'z' is thick along z and spans (x, y).
  // every hole gets a steel frame and a pane
  const wall = (axis, t0, t1, a0, a1, b0, b1, holes, m, ph) => {
    for (const [p0, p1, q0, q1] of carve(a0, a1, b0, b1, holes)) axis === 'x' ? box(t0, q0, p0, t1, q1, p1, m, 'struct', ph) : box(p0, q0, t0, p1, q1, t1, m, 'struct', ph);
    const tm = (t0 + t1) / 2, f = 0.05;
    const bar = (a, b, c, d) => (axis === 'x' ? box(tm - 0.04, c, a, tm + 0.04, d, b, 'steel', 'frame', 7) : box(a, c, tm - 0.04, b, d, tm + 0.04, 'steel', 'frame', 7));
    for (const h of holes) {
      bar(h[0], h[1], h[2], h[2] + f); bar(h[0], h[1], h[3] - f, h[3]); bar(h[0], h[0] + f, h[2], h[3]); bar(h[1] - f, h[1], h[2], h[3]);
      if (h[1] - h[0] > 3) { const c = (h[0] + h[1]) / 2; bar(c - 0.03, c + 0.03, h[2], h[3]); }
      if (h[3] - h[2] > 3.4) { const c = (h[2] + h[3]) / 2; bar(h[0], h[1], c - 0.03, c + 0.03); }
      axis === 'x' ? box(tm - 0.01, h[2], h[0], tm + 0.01, h[3], h[1], 'glass', 'glass', 7) : box(h[0], h[2], tm - 0.01, h[1], h[3], tm + 0.01, 'glass', 'glass', 7);
    }
  };

  // footing, ground slab, and the terrace the frame stands on (it runs on past the east wall to the garden steps)
  box(5, -0.8, -7, 17, G, 3, 'conc', 'struct', 1);
  box(5, G, -7, 17, 0, 3, { all: 'conc', top: 'floorD' }, 'struct', 3);
  box(17, G, -7, 21.2, 0, 5.6, { all: 'conc', top: 'pave' }, 'struct', 3);
  for (let k = 0; k < STEPS.n; k++) {
    const top = G - STEPS.rise * k + 0.03, x0 = k === 0 ? 21.2 : STEPS.x0 + k * STEPS.run;
    const x1 = STEPS.x0 + (k + 1) * STEPS.run + 0.02;
    box(x0, top - 0.45, STEPS.z0, x1, top, STEPS.z1, 'pave', 'struct', 3);
    box(x0, top - 0.45, STEPS.z0 - 0.16, x1, top + 0.16, STEPS.z0, 'pave', 'struct', 3);
    box(x0, top - 0.45, STEPS.z1, x1, top + 0.16, STEPS.z1 + 0.16, 'pave', 'struct', 3);
  }
  // the upper floor: everything but the void over the living room and the stair hole
  const SU = { all: 'plaster', top: 'oakD', bot: 'plaster' };
  box(5.3, 2.8, -6.7, 16.7, L1, -2.2, SU, 'struct', 5);
  box(5.3, 2.8, -2.23, 12.6, L1, 1.7, SU, 'struct', 5);      // each piece reaches 3 cm into its neighbour:
  box(10.5, 2.8, 1.67, 12.6, L1, 2.7, SU, 'struct', 5);      // no light leaks along the joints
  box(5.3, 2.8, 1.67, 5.7, L1, 2.7, SU, 'struct', 5);
  box(16.7, 2.8, -6.7, 18.4, L1, -2.2, { all: 'plaster', top: 'pave', bot: 'plaster' }, 'struct', 5); // the balcony of the study
  // the roof, with a rooflight over the void, and its parapet
  const RF = { all: 'plaster', top: 'gravel', bot: 'plaster' };
  const RL = [13.4, 15.9, -1.3, 1.8];
  box(5, TOP, -7, RL[0], 6.2, 3, RF, 'struct', 6);
  box(RL[1], TOP, -7, 18.4, 6.2, 3, RF, 'struct', 6);
  box(RL[0] - 0.03, TOP, -7, RL[1] + 0.03, 6.2, RL[2], RF, 'struct', 6);   // these two reach 3 cm under their neighbours:
  box(RL[0] - 0.03, TOP, RL[3], RL[1] + 0.03, 6.2, 3, RF, 'struct', 6);    // no light leaks along the joints
  box(5, 6.2, -7, 18.4, 6.5, -6.8, 'plaster', 'struct', 6); box(5, 6.2, 2.8, 18.4, 6.5, 3, 'plaster', 'struct', 6);
  box(5, 6.2, -6.8, 5.2, 6.5, 2.8, 'plaster', 'struct', 6); box(18.2, 6.2, -6.8, 18.4, 6.5, 2.8, 'plaster', 'struct', 6);
  box(RL[0] - 0.1, 6.2, RL[2] - 0.1, RL[1] + 0.1, 6.42, RL[2], 'steel', 'frame', 7); box(RL[0] - 0.1, 6.2, RL[3], RL[1] + 0.1, 6.42, RL[3] + 0.1, 'steel', 'frame', 7);
  box(RL[0] - 0.1, 6.2, RL[2], RL[0], 6.42, RL[3], 'steel', 'frame', 7); box(RL[1], 6.2, RL[2], RL[1] + 0.1, 6.42, RL[3], 'steel', 'frame', 7);
  box(RL[0], 6.36, RL[2], RL[1], 6.39, RL[3], 'glass', 'glass', 7);

  // north wall: the entrance from the forecourt, two windows upstairs
  wall('x', 5, 5.3, -7, 3, 0, TOP, [[-1.6, -0.5, 0, 2.3], [-5.6, -3.4, 4.0, 5.3], [0.4, 1.6, 4.0, 5.3]], 'plaster', 4);
  // the two side walls run out past the glass and make the frame
  wall('z', -7, -6.7, 5.3, 18.4, 0, TOP, [[6.6, 10.6, 1.05, 2.0], [6.8, 9.6, 4.0, 5.3]], 'plaster', 4);
  wall('z', 2.7, 3, 5.3, 18.4, 0, TOP, [[14.9, 16.1, 0.45, 5.45], [6.3, 9.9, 4.0, 5.3]], 'plaster', 4);
  // upstairs, the wall between the rooms and the gallery
  wall('x', 11.6, 11.75, -6.7, 2.7, L1, TOP, [], 'plaster', 4);

  // the south glass, x = 16.85: two storeys of it on the west, one tall sheet in front of the void
  const GX = 16.85;
  const glassRun = (y0, y1, z0, z1, zs) => {
    box(GX - 0.02, y0, z0, GX + 0.02, y1, z1, 'glass', 'glass', 7);
    for (const z of zs) box(GX - 0.06, y0, Math.max(z0, z - 0.04), GX + 0.06, y1, Math.min(z1, z + 0.04), 'steel', 'frame', 7);
    box(GX - 0.06, y0, z0, GX + 0.06, y0 + 0.06, z1, 'steel', 'frame', 7); box(GX - 0.06, y1 - 0.06, z0, GX + 0.06, y1, z1, 'steel', 'frame', 7);
  };
  glassRun(0, 2.8, -6.7, -2.2, [-6.7, -5.2, -3.7]);
  glassRun(L1, TOP, -6.7, -2.2, [-6.7, -5.2, -3.7]);
  const D = DOOR;
  box(GX - 0.02, 0, -2.2, GX + 0.02, D.h, D.z0, 'glass', 'glass', 7); box(GX - 0.02, 0, D.z1, GX + 0.02, D.h, 2.7, 'glass', 'glass', 7);
  box(GX - 0.02, D.h + 0.1, -2.2, GX + 0.02, TOP, 2.7, 'glass', 'glass', 7);
  for (const z of [-2.2, D.z0, D.z1, 2.66]) box(GX - 0.06, 0, z - 0.04, GX + 0.06, TOP, z + 0.04, 'steel', 'frame', 7);
  box(GX - 0.06, D.h, -2.2, GX + 0.06, D.h + 0.1, 2.7, 'steel', 'frame', 7);
  box(GX - 0.06, TOP - 0.06, -2.2, GX + 0.06, TOP, 2.7, 'steel', 'frame', 7);
  box(GX - 0.06, D.h + 0.1, D.zm - 0.03, GX + 0.06, TOP, D.zm + 0.03, 'steel', 'frame', 7);
  box(GX - 0.06, 0, -2.2, GX + 0.06, 0.06, D.z0, 'steel', 'frame', 7); box(GX - 0.06, 0, D.z1, GX + 0.06, 0.06, 2.7, 'steel', 'frame', 7);
  // the door: two leaves in red frames on a track in front of the glass. They carry `leaf` (-1 slides west, 1 east)
  box(D.x - 0.05, D.h, -2.4, D.x + 0.05, D.h + 0.08, 2.7, 'steel', 'frame', 7);
  for (const [z0, z1, id] of [[D.z0, D.zm, -1], [D.zm, D.z1, 1]]) {
    const f = 0.07, x = D.x, o = { leaf: id };
    box(x - 0.035, 0.02, z0, x + 0.035, 0.02 + f, z1, 'red', 'door', 7, o); box(x - 0.035, D.h - f, z0, x + 0.035, D.h, z1, 'red', 'door', 7, o);
    box(x - 0.035, 0.02, z0, x + 0.035, D.h, z0 + f, 'red', 'door', 7, o); box(x - 0.035, 0.02, z1 - f, x + 0.035, D.h, z1, 'red', 'door', 7, o);
    box(x - 0.012, 0.02 + f, z0 + f, x + 0.012, D.h - f, z1 - f, 'glass', 'doorglass', 7, o);
    const hz = id < 0 ? z1 - f - 0.09 : z0 + f + 0.06; // a pull by the meeting stile
    box(x + 0.035, 0.95, hz, x + 0.075, 1.4, hz + 0.03, 'steel', 'doorfit', 8, o);
  }
  // balustrades: glass and a steel rail. The study's edge, the gallery walk, the balcony
  const rail = (x0, z0, x1, z1, y) => {
    const alongX = x1 - x0 > z1 - z0;
    if (alongX) { box(x0, y, z0 - 0.02, x1, y + 1.05, z0 + 0.02, 'glass', 'glass', 7); box(x0, y + 1.05, z0 - 0.04, x1, y + 1.1, z0 + 0.04, 'steel', 'frame', 7); for (let x = x0 + 0.02; x <= x1 + 1e-3; x += (x1 - x0 - 0.04) / Math.round((x1 - x0) / 1.4)) box(x - 0.02, y, z0 - 0.03, x + 0.02, y + 1.06, z0 + 0.03, 'steel', 'fit', 8); }
    else { box(x0 - 0.02, y, z0, x0 + 0.02, y + 1.05, z1, 'glass', 'glass', 7); box(x0 - 0.04, y + 1.05, z0, x0 + 0.04, y + 1.1, z1, 'steel', 'frame', 7); for (let z = z0 + 0.02; z <= z1 + 1e-3; z += (z1 - z0 - 0.04) / Math.round((z1 - z0) / 1.4)) box(x0 - 0.03, y, z - 0.02, x0 + 0.03, y + 1.06, z + 0.02, 'steel', 'fit', 8); }
  };
  rail(12.6, -2.2, 16.7, -2.2, L1);
  rail(12.6, -2.2, 12.6, 2.7, L1);
  rail(18.36, -6.7, 18.36, -2.2, L1);
  rail(16.95, -2.2, 18.4, -2.2, L1);

  // the stair: one straight flight along the east wall, sixteen risers
  const n = 16, run = 4.8 / n, rise = L1 / n;
  for (let i = 0; i < n; i++) {
    const t = (i + 1) * rise;
    box(5.7 + i * run, Math.max(0, t - 0.45), 1.7, 5.7 + (i + 1) * run, t, 2.7, { all: 'plaster', top: 'oakD' }, 'stair', 5);
  }

  // furniture
  const F = (x0, y0, z0, x1, y1, z1, m, o) => box(x0, y0, z0, x1, y1, z1, m, 'furn', 8, o);
  // living room, under the void: a sofa with its back to the dining table, a low table, a sideboard on the east wall
  F(12.9, 0, -2.0, 16.1, 0.015, 2.2, 'rug');
  F(13.0, 0, -2.0, 15.8, 0.42, -1.1, 'fabric'); F(13.0, 0.42, -2.0, 15.8, 0.84, -1.76, 'fabric');
  F(13.0, 0.42, -1.76, 13.24, 0.62, -1.1, 'fabric'); F(15.56, 0.42, -1.76, 15.8, 0.62, -1.1, 'fabric');
  F(13.28, 0.42, -1.72, 14.38, 0.56, -1.14, 'linen'); F(14.42, 0.42, -1.72, 15.52, 0.56, -1.14, 'linen');
  F(13.7, 0.3, -0.75, 15.1, 0.36, -0.05, 'black'); F(13.9, 0, -0.6, 14.9, 0.3, -0.2, 'black');
  F(12.9, 0, 2.25, 14.6, 0.5, 2.7, 'black'); F(12.88, 0.5, 2.23, 14.62, 0.53, 2.7, 'stone');
  // dining, under the study
  F(12.75, 0.72, -5.05, 15.55, 0.77, -3.95, 'black');
  for (const [lx, lz] of [[12.85, -4.95], [15.45, -4.95], [12.85, -4.05], [15.45, -4.05]]) F(lx - 0.03, 0, lz - 0.03, lx + 0.03, 0.72, lz + 0.03, 'black');
  // kitchen: tall units on the north wall, a counter under the west window, an island.
  // Beside the tall units an open bookcase for the living room (the staging fills it)
  F(5.3, 0, -6.7, 5.95, 2.4, -4.45, 'black');
  F(5.3, 0, -4.35, 5.68, 2.4, -2.35, 'black', { shelf: true });
  F(5.95, 0, -6.7, 10.9, 0.9, -6.08, 'black'); F(5.95, 0.9, -6.7, 10.92, 0.94, -6.04, 'stone');
  F(7.6, 0, -4.9, 10.4, 0.9, -3.95, 'black'); F(7.55, 0.9, -4.95, 10.45, 0.94, -3.9, 'stone');
  F(5.3, 0, 0.1, 5.75, 0.45, 1.5, 'black');
  // the study: the desk, and a bookcase on the wall behind it
  F(13.2, 3.82, -5.55, 15.4, 3.87, -4.65, 'desk');
  F(13.3, L1, -5.5, 13.35, 3.82, -4.7, 'steel'); F(15.25, L1, -5.5, 15.3, 3.82, -4.7, 'steel');
  F(11.75, L1, -6.5, 12.13, 5.7, -3.3, 'black', { shelf: true });
  for (let s = 0; s < 6; s++) {
    const y = L1 + 0.08 + s * 0.42;
    let z = -6.44;
    while (z < -3.42) { const w = 0.03 + rnd() * 0.05, h = 0.22 + rnd() * 0.14; if (Math.abs(z + 4.9) > 0.08 && rnd() < 0.82) F(11.8, y + 0.028, z, 12.08, y + 0.028 + h, z + w, 'book' + Math.floor(rnd() * 5)); z += w + 0.005; }
  }
  // paving: the forecourt on the north side
  box(0.4, G, -3.6, 5.0, G + 0.03, 1.4, 'pave', 'land', 8);
  return P;
}

// scale figures on the model, [x, y, z, rotation]; y null stands on the land
export const PEOPLE = [[19.6, 0, -3.4, -1.2], [17.7, L1, -4.4, -0.3], [1.2, null, -1.1, 2.6], [27.2, null, -4.6, 0.9]];
// trees, [kind, x, z]: a red maple by the house and one in the garden, a row of poplars behind, round crowns between
export const TREES = [
  ['maple', 14.8, 7.6], ['maple', 29.6, 12.9],
  ['poplar', -9.5, -15], ['poplar', -6, -15.9], ['poplar', -2.5, -16.5], ['poplar', 1, -16.9], ['poplar', 4.5, -17.1],
  ['round', 26.5, -12.5], ['round', 31.5, -9.2], ['round', 36.8, -13.6], ['round', 34.5, -8.8], ['round', 25.5, 13.0], ['round', 22, 9.6],
  ['round', -8.5, 6.5], ['round', -3.5, 10.5], ['round', -10.5, -3.8], ['poplar', 37.5, -3.4], ['round', 22.5, -10.5],
];
