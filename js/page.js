// Desk at Night, the whole page: the loader, the hero building itself on the desk, the dive to eye height,
// the turn (the card becomes the house, the lamp becomes the sun), the walk in through the big door and up to the study, and back to the desk.
// Everything on screen is a function of two numbers: t (seconds since the page started) and the scroll.
// Live, t is the clock. With ?rec the recorder sets both, one frame at a time (window.__rig.frame).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as D from './desk.js';
import * as RW from './real.js';
import { SWEEP, sweepSide, sweepMaterial } from './sweep.js';
import { DOOR } from './house.js';

const Q = new URLSearchParams(location.search);
const REC = Q.has('rec');
const L = window.__loader;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const sstep = (t) => t * t * (3 - 2 * t);
const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const eio4 = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2);
const eout = (t) => 1 - (1 - t) ** 3;
const eout4 = (t) => 1 - (1 - t) ** 4;
const eback = (t) => { const c = 1.6; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const pw = (x, pts) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 0; i < pts.length - 1; i++) { const [a, ya] = pts[i], [b, yb] = pts[i + 1]; if (x <= b) return lerp(ya, yb, sstep((x - a) / (b - a))); } return pts[pts.length - 1][1]; };
// a smooth curve through timing points that never runs backwards and never stops on the way (monotone cubic)
const mono = (pts) => {
  const n = pts.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 2 * d[i - 1] * d[i] / (d[i - 1] + d[i]);
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1]; if (x >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0; while (x > pts[i + 1][0]) i++;
    const h = pts[i + 1][0] - pts[i][0], t = (x - pts[i][0]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * pts[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * pts[i + 1][1] + (t3 - t2) * h * m[i + 1];
  };
};
const CAMQ = Q.get('cam') ? Q.get('cam').split(',').map(Number) : null;
const step = (p) => { if (!REC) L.target = Math.max(L.target, p); };

let phone = innerWidth < 760 || innerWidth / innerHeight < 0.8;

// ---------------------------------------------------------------- renderer and scene
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: REC });
let dpr = Q.has('dpr') ? +Q.get('dpr') : REC ? devicePixelRatio : Math.min(devicePixelRatio, phone ? 2 : 1.75);
renderer.setPixelRatio(dpr);
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
D.setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
step(0.3);

await Promise.all(['500 20px "IBM Plex Mono"', '600 20px "Chakra Petch"'].map((f) => document.fonts.load(f).catch(() => {})));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0c);
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const M = D.makeMaterials(env);
// a copy of the card materials for the little model on the study desk, which lives in the daylight world
const keep = (m) => { const c = m.clone(); c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey; return c; };
const Mtiny = {};
for (const k of ['card', 'cardPlain', 'acetate', 'board', 'burn', 'figure', 'mat', 'rule', 'lamp', 'lampInner', 'lampRim', 'bulb', 'spring']) Mtiny[k] = keep(M[k]);
step(0.42);

const desk = D.deskProps(M);
const house = D.cardHouse(M);
const layers = D.contourLayers(M);
const trees = D.modelTrees(M);
const figs = D.modelFigures(M);
scene.add(desk.group, house, ...layers, ...trees, ...figs);
step(0.52);

// the daylight world
const skyEnv = RW.skyEnv(renderer);
const R = RW.realMaterials(skyEnv);
for (const k in Mtiny) { Mtiny[k].envMap = skyEnv; }
const real = RW.realHouse(R);
const land = RW.terrain(R, phone);
const rtrees = RW.realTrees(R, phone);
const stage = RW.staging(R, Mtiny);
const sky = RW.skyDome(SWEEP);
sky.visible = false;
scene.add(real.group, land, rtrees, stage);
step(0.68);

// materials that fade in during the build get their own copies
const own = (m) => { const c = keep(m); c.userData.base = { transparent: m.transparent, opacity: m.opacity }; return c; };
for (const l of layers) l.material = l.material.map(own);
for (const c of house.children) c.material = own(c.material);
const treeMat = own(M.card);
for (const t of trees) t.material = treeMat;
const heroFig = figs[figs.length - 1];
heroFig.material = own(heroFig.material);
function fade(mat, k) {
  const b = mat.userData.base, tr = b.transparent || k < 0.999;
  if (mat.transparent !== tr) { mat.transparent = tr; mat.needsUpdate = true; }
  mat.opacity = b.opacity * k; mat.depthWrite = !b.transparent && k > 0.5;
}

// two sides of one front (see sweep.js): studio environment (walls, pinned drawings, desk props) gets seam: 0 so it never discards or draws a red ring
const studioMeshes = sweepSide(desk.group, 'card', { seam: 0 });
const cardMeshes = [house, ...layers, ...trees, ...figs].flatMap((o) => sweepSide(o, 'card'));
sweepMaterial(R.glass, 'real', { pointK: 0 }); // no pin-point reflections of the room's lamps in the panes
const realMeshes = [real.group, land, rtrees, stage].flatMap((o) => sweepSide(o, 'real'));
const buildSet = new Set([...layers, ...trees, ...figs]);
for (const o of [...cardMeshes, ...studioMeshes]) for (const m of [].concat(o.material)) m.fog = false;
scene.fog = new THREE.FogExp2(new THREE.Color(0.07, 0.07, 0.075), 0.00035);

// ---------------------------------------------------------------- light
// directional order matters (sweep.js): the sun casts shadows so it comes first, then the moon, then the fill
const lamp = desk.lamp;
SWEEP.C.value.copy(lamp.bulbPos);
const sun = new THREE.DirectionalLight(0xfff2e6, 4.0);
sun.position.copy(V(12, 1, -2)).addScaledVector(RW.SUN_DIR, 220); sun.target.position.set(12, 1, -2);
sun.castShadow = true;
sun.shadow.mapSize.set(phone ? 2048 : 4096, phone ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -46, right: 46, top: 40, bottom: -40, near: 120, far: 330 });
sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.035;
scene.add(sun, sun.target);

const spot = new THREE.SpotLight(0xfff3e6, 0, 0, 0.78, 0.55, 2);
spot.position.copy(lamp.bulbPos).addScaledVector(lamp.aim, 1.5);
spot.target.position.copy(lamp.aimAt);
spot.castShadow = true;
spot.shadow.mapSize.set(phone ? 2048 : 4096, phone ? 2048 : 4096);
spot.shadow.camera.near = 8; spot.shadow.camera.far = 240;
spot.shadow.bias = -0.00005; spot.shadow.normalBias = 0.025;

// Cool white moonlight from the studio window (ramps up when the desk lamp clicks off at the end)
const moon = new THREE.DirectionalLight(0xd2d9e8, 0.5);
moon.position.set(90, 110, -150); moon.target.position.set(10, -6, 0);
scene.add(moon, moon.target);

// A bounce fill from the camera's side so card cut faces and contour risers keep shadow detail
const fill = new THREE.DirectionalLight(0xfff0e4, 0);
fill.position.set(130, 42, 105); fill.target.position.set(10, -5, 0);
scene.add(fill, fill.target);

const hemi = new THREE.HemisphereLight(0x70747c, 0x8c8a88, 0.28); // night: the dark room above, the board's bounce below
const hemiDay = new THREE.HemisphereLight(0xc6cad2, 0x7c7c80, 0.38);
scene.add(hemi, hemiDay);

// the lamp's spill on the wall behind, soft and without shadows
const spill = new THREE.SpotLight(0xfff0e2, 0, 0, 0.95, 1, 2);
spill.position.copy(lamp.head); spill.target.position.set(-72, 18, -60);

// A glow inside the 1:100 card model that lights its rooms softly when the desk lamp clicks off
const cardInner = new THREE.SpotLight(0xffe9dc, 0, 22, 1.15, 0.95, 1.6);
cardInner.position.set(16.3, 5.3, 0.3);
cardInner.target.position.set(12.0, 1.0, -1.6);
const wash = new THREE.SpotLight(0xfff0e2, 0, 0, 0.9, 1, 1.6);
wash.position.set(96, 86, 44); wash.target.position.set(189, 26, 34);
scene.add(spot, spot.target, spill, spill.target, wash, wash.target, cardInner, cardInner.target);

// the low sun itself, where the daylight comes from: a small disc, there only while the whole world is the real one
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 8.6, 8.1), fog: false }));
sunDisc.position.copy(V(12, 1, -2)).addScaledVector(RW.SUN_DIR, 150);
sunDisc.visible = false;
scene.add(sunDisc);

// the lamps that are on inside the real house, the last of them the little lamp over the model on the study desk
for (const [x, y, z, i, dist] of stage.userData.lights) {
  const l = new THREE.PointLight(0xfff7f0, i, dist, 2); l.position.set(x, y, z); scene.add(l);
}

function setLamp(k, endGlow = 0) {
  spot.intensity = 6800 * k;
  spill.intensity = 2100 * k;
  M.bulb.emissiveIntensity = 16 * k;
  M.lampInner.emissiveIntensity = 0.52 * k;
  M.lampRim.emissiveIntensity = 1.65 * k;
  hemi.intensity = 0.28 + 0.34 * k;
  fill.intensity = 0.58 * k + 0.14 * endGlow;
  moon.intensity = lerp(1.38, 0.32, k);
  wash.intensity = 1500 * k;
  cardInner.intensity = 240 * endGlow * (1 - k);
  // dim studio environment reflections on acetate and metal when the desk lamp is switched off
  for (const c of house.children) {
    if (c.material && c.material.userData?.base?.transparent) c.material.envMapIntensity = 0.32 + 1.58 * k;
  }
  M.rule.envMapIntensity = 0.45 + 0.95 * k;
  M.blade.envMapIntensity = 0.5 + 1.15 * k;
}

// ---------------------------------------------------------------- the scroll, in vh
// hero 0-40, dive 40-460, the turn 460-880, the walk 880-1500 (the study holds to 1520), back to the desk 1520-1960, the end
const CH = { dive: [40, 460], turn: [460, 880], walk: [880, 1500], back: [1520, 1960], end: [1960, 2030] };
const GARDEN = D.groundAt(D.HERO_FIG[0], D.HERO_FIG[1]); // the ground the little figure stands on

// ---------------------------------------------------------------- camera
// The dive: keys of position and target. The walk and the way back: keys of position and a look point,
// turned into yaw and pitch so the camera can turn round on the spot without flipping.
const EYE_Y = GARDEN + 1.62; // eye height over the ground the little figure stands on
const KEYS = {
  desk: {
    pre:  { p: V(110, 47, 94), t: V(14.5, -1.6, -2.2), f: 30 },
    hero: { p: V(67, 25.8, 54.3), t: V(7.5, -2.0, 0.2), f: 27.8, fp: V(13, 1, -1), ap: 0.00028, mb: 0.009 },
    path: [
      { p: V(67, 25.8, 54.3), t: V(7.5, -2.0, 0.2) },
      { p: V(56, 14.5, 39), t: V(8, -0.2, -0.6) },
      { p: V(49.5, 4.6, 17), t: V(10.5, 2.0, -7.5) },
      { p: V(46.5, 0.6, 10.5), t: V(11, 2.4, -4.6) },
      { p: V(42.5, -0.6, 6.4), t: V(11.4, 2.3, -0.2) },
      { p: V(38.6, EYE_Y, 4.6), t: V(11.5, 2.2, 0.4) },
    ],
    eye: { f: 40, fp: V(17, 2.5, -2), ap: 0.0004, mb: 0.006 },
    turnF: 40, walkF: [40, 58], deskF: 38, backF: 52,
  },
  phone: {
    pre:  { p: V(96, 52, 84), t: V(11.5, 1.4, -0.2), f: 48 },
    hero: { p: V(74, 36.5, 63), t: V(10, 2.4, 0.6), f: 46.5, fp: V(12, 1.5, -1), ap: 0.00026, mb: 0.009 },
    path: [
      { p: V(74, 36.5, 63), t: V(10, 2.4, 0.6) },
      { p: V(60, 18, 45), t: V(11, 2.2, -1) },
      { p: V(50, 6, 25), t: V(11.5, 2.8, -2.2) },
      { p: V(47.5, -0.1, 14.5), t: V(12, 3.4, -2.4) },
      { p: V(43.5, -0.7, 10.0), t: V(12, 3.7, -2.6) },
      { p: V(39.4, EYE_Y, 7.0), t: V(12, 3.9, -2.6) },
    ],
    eye: { f: 56, fp: V(17, 2.5, -2), ap: 0.00045, mb: 0.009 },
    turnF: 50, walkF: [50, 68], deskF: 52, backF: 68,
  },
};
// where the figure stood: the turn ends here, and the walk starts here (on a phone the lens aims further west, to hold the whole front)
const SPOT = { p: V(31.4, EYE_Y, 5.85), t: V(12, 3.6, -3.4) };
const SPOT_PH = { p: V(32.6, EYE_Y, 5.6), t: V(12, 3.3, -3.9) };
const WALK = [
  SPOT,
  { p: V(27.6, 0.1, 4.6), t: V(12.5, 2.9, -2.4) },        // onto the garden steps and up
  { p: V(23.2, 1.28, 4.35), t: V(12.5, 2.5, -1.2) },      // the last step
  { p: V(21.4, 1.62, 2.9), t: V(11.5, 2.0, -1.4) },       // on the terrace
  { p: V(18.7, 1.66, 0.2), t: V(8.5, 0.95, 0.2) },        // square in front of the open door, its two red leaves just outside the picture
  { p: V(17.7, 1.67, 0.2), t: V(8.5, 2.2, -1.0) },
  { p: V(16.9, 1.68, 0.4), t: V(8.4, 1.2, -1.6) },        // through it
  { p: V(16.4, 1.72, 0.9), t: V(9.5, 0.25, -3.6) },       // holding just inside, turned across the room: sofa, table, kitchen, the bookcase at the far wall
  { p: V(15.8, 3.0, 0.5), t: V(9.0, 3.6, -0.4) },         // rising through the void to the level of the gallery floor: the painting above it, the room below
  { p: V(15.2, 4.62, -0.9), t: V(13.6, 3.7, -5.0) },      // level with the gallery, turning to the study
  { p: V(14.9, 4.68, -2.4), t: V(14.0, 3.95, -5.2) },     // over the balustrade (its rail is at 4.20)
  { p: V(14.75, 4.45, -3.2), t: V(14.2, 3.95, -5.1) },    // to the long side of the desk
  { p: V(14.5, 4.25, -3.9), t: V(14.2, 3.97, -5.1) },     // close on the lit model, the pinned drawings behind it
  { p: V(15.2, 4.62, -3.7), t: V(12.3, 4.3, 1.4) },       // turning round by way of the void and the painting across it
  { p: V(15.8, 4.75, -4.5), t: V(60.8, 1.6, -4.5) },       // and out through the study's own glass: the balcony, the garden, the dark room the desk stands in
];
const WALK_DOOR = 4, WALK_HOLD = 7, WALK_RISE = 8, WALK_GAL = 9, WALK_DESK = 12; // the keys the walk is timed by
const BACK = [
  WALK[WALK.length - 1],
  { p: V(15.6, 4.74, -1.4), t: V(48, -1.0, 14) },         // back over the balustrade, still looking out
  { p: V(15.9, 3.3, -0.3), t: V(50, -1.5, 17) },          // down through the void
  { p: V(16.3, 2.05, 0.2), t: V(52, -2.2, 19) },
  { p: V(18.1, 1.8, 0.35), t: V(56, -2.6, 21) },          // out through the door: the garden, the studio wall
  { p: V(21.6, 2.3, 1.2), t: V(40, 0.6, 22) },            // across the terrace, starting to turn
  { p: V(25.2, 3.1, 0.2), t: V(13, 2.7, -1.7) },          // turned round: the whole front of the house
  { p: V(30, 5.6, 5.0), t: V(12.2, 2.3, -2.0) },          // pulling back, facing the house
  { p: V(44, 15, 24.5), t: V(10, 0.6, -1.6) },
  { p: V(63, 23.5, 48.5), t: V(5.5, -0.9, 0) },
];
const BACK_OUT = 4, BACK_TURNED = 6; // the keys the way back is timed by
// a shot: positions on a curve, the look as yaw and pitch on a second curve, the scroll spent by an effort
// (distance, divided by the height above the garden when it moves through scale, plus a cost for turning)
function makeShot(keys, { scale = false, turnCost = 2.2 } = {}) {
  const P = new THREE.CatmullRomCurve3(keys.map((k) => k.p), false, 'centripetal');
  let prev = null;
  const A = new THREE.CatmullRomCurve3(keys.map((k) => {
    const d = k.t.clone().sub(k.p); let yaw = Math.atan2(d.z, d.x);
    if (prev !== null) { while (yaw - prev > Math.PI) yaw -= Math.PI * 2; while (yaw - prev < -Math.PI) yaw += Math.PI * 2; }
    prev = yaw; return V(yaw, Math.atan2(d.y, Math.hypot(d.x, d.z)), 0);
  }), false, 'catmullrom', 0.5);
  const N = 800, eff = new Float32Array(N + 1);
  let p0 = P.getPoint(0), a0 = A.getPoint(0);
  for (let i = 1; i <= N; i++) {
    const p1 = P.getPoint(i / N), a1 = A.getPoint(i / N);
    const h = Math.max(0.2, (p0.y + p1.y) / 2 - GARDEN);
    eff[i] = eff[i - 1] + p1.distanceTo(p0) / (scale ? h + 3 : 1) + turnCost * Math.hypot(a1.x - a0.x, a1.y - a0.y) / (scale ? 4 : 1);
    p0 = p1; a0 = a1;
  }
  for (let i = 0; i <= N; i++) eff[i] /= eff[N];
  const uAt = (s) => { let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (eff[m] < s) lo = m; else hi = m; } return (lo + clamp((s - eff[lo]) / Math.max(1e-6, eff[hi] - eff[lo]))) / N; };
  return {
    keyS: keys.map((_, i) => eff[Math.round(i / (keys.length - 1) * N)]), // where each key sits, 0..1 of the shot
    at(s) { const u = uAt(clamp(s)), p = P.getPoint(u), a = A.getPoint(u); return { p, dir: V(Math.cos(a.y) * Math.cos(a.x), Math.sin(a.y), Math.cos(a.y) * Math.sin(a.x)) }; },
  };
}
const look = (k) => ({ p: k.p.clone(), dir: k.t.clone().sub(k.p).normalize() });
let K, pathP, pathT, turnP, turnT, effort = null, walkShot, backShot;
// The dive moves through scale, not distance: a step of the path costs its length divided by the lens height,
// so going from 32 cm to 16 cm takes as much scroll as going from 3.2 cm to 1.6 cm.
function measurePath() {
  const N = 600;
  effort = new Float32Array(N + 1);
  let prev = pathP.getPoint(0);
  for (let i = 1; i <= N; i++) {
    const q = pathP.getPoint(i / N), h = Math.max(0.2, (prev.y + q.y) / 2 - GARDEN);
    effort[i] = effort[i - 1] + q.distanceTo(prev) / (h + 3); prev = q;
  }
  for (let i = 0; i <= N; i++) effort[i] /= effort[N];
}
function pathU(d) { // d (0..1 of the dive) to the curve's own parameter
  const N = effort.length - 1;
  let lo = 0, hi = N;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (effort[m] < d) lo = m; else hi = m; }
  const f = (d - effort[lo]) / Math.max(1e-6, effort[hi] - effort[lo]);
  return (lo + clamp(f)) / N;
}
function useKeys() {
  K = phone ? KEYS.phone : KEYS.desk;
  pathP = new THREE.CatmullRomCurve3(K.path.map((k) => k.p), false, 'centripetal');
  pathT = new THREE.CatmullRomCurve3(K.path.map((k) => k.t), false, 'centripetal');
  const eyeK = K.path[K.path.length - 1];
  const midK1 = phone
    ? { p: V(37.0, EYE_Y, 6.5), t: V(11.8, 4.0, -3.0) }
    : { p: V(36.3, EYE_Y, 5.0), t: V(11.6, 2.6, -0.8) };
  const midK2 = phone
    ? { p: V(34.6, EYE_Y, 6.0), t: V(11.9, 4.2, -3.5) }
    : { p: V(33.6, EYE_Y, 5.5), t: V(11.8, 3.2, -2.2) };
  const here = phone ? SPOT_PH : SPOT;
  turnP = new THREE.CatmullRomCurve3([eyeK.p, midK1.p, midK2.p, here.p], false, 'centripetal');
  turnT = new THREE.CatmullRomCurve3([eyeK.t, midK1.t, midK2.t, here.t], false, 'centripetal');
  measurePath();
  walkShot = makeShot([here, ...WALK.slice(1)], { turnCost: 1.1 });
  backShot = makeShot([...BACK, { p: K.hero.p, t: K.hero.t }], { scale: true, turnCost: 1.8 });
}
useKeys();
const camera = new THREE.PerspectiveCamera(K.hero.f, innerWidth / innerHeight, 0.1, 4000);
camera.position.copy(K.hero.p); camera.lookAt(K.hero.t);

// ---------------------------------------------------------------- post
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: phone ? 0 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(dpr);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
let gtao = null;
const glassy = [house.children[1], ...real.group.children.filter((m) => m.material === R.glass), ...real.leaves.flatMap((l) => l.children.filter((m) => m.material === R.glass)), sky];
if (!phone && !Q.has('noao')) {
  gtao = new GTAOPass(scene, camera, innerWidth * dpr, innerHeight * dpr);
  gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.6, thickness: 1.4, scale: 1.15, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  gtao.blendIntensity = 0.95;
  const r0 = gtao.render.bind(gtao);
  gtao.render = (...a) => { const v = glassy.map((m) => m.visible); glassy.forEach((m) => (m.visible = false)); r0(...a); glassy.forEach((m, i) => (m.visible = v[i])); };
  composer.addPass(gtao);
}
const bokeh = new BokehPass(scene, camera, { focus: 140, aperture: 0.0005, maxblur: 0.01 });
composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.34, 0.48, 2.15);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(innerWidth, innerHeight) }, seed: { value: 0 }, vig: { value: 0.52 }, grainK: { value: 0.02 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform float seed, vig, grainK; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 q = vUv - .5; q.x *= res.x / res.y;
      c *= mix(1., 1. - smoothstep(.30, 1.10, length(q)), vig);
      float l = dot(c, vec3(.299, .587, .114));
      c += vec3(-.003, -.001, .006) * (1. - l);
      c += (hash(floor(vUv * res) + seed) - .5) * grainK;
      gl_FragColor = vec4(c, 1.);
    }`,
});
composer.addPass(grade);
step(0.82);

// compile both worlds now, behind the loader, so the first frames of the turn do not stall
SWEEP.R.value = 60;
renderer.compile(scene, camera);
renderer.shadowMap.needsUpdate = true;
composer.render();
SWEEP.R.value = 0;
step(1);

// ---------------------------------------------------------------- the DOM
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const hud = {
  top: $('.top'), lines: $$('.hero h1 .ln > span'), sub: $('.hero .sub'), hero: $('.hero'),
  hint: $('.hint'), hintText: $('.hint b'), alt: $('.alt'), altMark: $('.alt .mark'), altCm: $('.alt .cm'), altM: $('.alt .m'),
  drift: $('.drift'), chip: $('.chip'), scrim: $('.scrim'),
  turnChip: $('.turn-chip'), scanR: $('.turn-chip .scan-r'), turnLine: $('.turn-line'), turnLines: $$('.turn-line .ln > span'),
  rooms: $$('.room'), backLine: $('.back-line'), end: $('.end'), endLines: $$('.end h2 .ln > span'), endRest: $$('.end .rise'),
};
const css = (el, o) => { for (const k in o) el.style[k] = o[k]; };
const show = (el, k, dy = 14) => css(el, { opacity: k, transform: `translate3d(0, ${(1 - k) * dy}px, 0)` });

// ---------------------------------------------------------------- the hero builds itself
// tb: seconds since the scalpel finished its line.
const LOAD_REC = 2.3; // how long the loader runs in a recording
const layerFrom = 13;
let shadowKey = '';
function heroBuild(tb) {
  // the loader: scalpel lifts, the card parts smoothly along its scored line
  const lift = seg(tb, 0, 0.38), open = seg(tb, 0.28, 1.36);
  L.paint(1, eout(lift), eio4(open));
  // the lamp clicks on, the filament ramping up
  let k = 0;
  if (tb >= 1.48) k = eout(seg(tb, 1.48, 1.82));
  // the contour layers drop in, one by one, from the base board up
  let moving = false;
  layers.forEach((l, i) => {
    const t0 = 2.0 + i * 0.13, s = seg(tb, t0, t0 + 0.42), u = seg(tb, t0 + 0.42, t0 + 0.6);
    const y = s < 1 ? layerFrom * (1 - s * s) : layerFrom * 0.02 * Math.sin(Math.PI * u);
    l.position.y = y; l.visible = tb > t0;
    for (const m of l.material) fade(m, sstep(seg(s, 0, 0.4)));
    if (tb > t0 && u < 1) moving = true;
  });
  // the house slots into its cut-out, placed by hand: slow at the end
  {
    const t0 = 3.55, s = seg(tb, t0, t0 + 1.3);
    house.position.y = 15 * (1 - eout(s));
    house.rotation.y = 0.045 * (1 - eout(s));
    house.position.x = 0.5 * (1 - eout(s));
    house.visible = tb > t0;
    for (const c of house.children) fade(c.material, sstep(seg(s, 0, 0.3)));
    if (tb > t0 && s < 1) moving = true;
  }
  // trees and figures stand up
  trees.forEach((m, i) => { const t0 = 4.45 + i * 0.045, s = seg(tb, t0, t0 + 0.45); m.scale.set(1, Math.max(1e-3, eback(s)), 1); m.visible = s > 0; if (s > 0 && s < 1) moving = true; });
  figs.forEach((m, i) => { const t0 = 4.9 + i * 0.07, s = seg(tb, t0, t0 + 0.4); m.scale.set(1, Math.max(1e-3, eback(s)), 1); m.visible = s > 0; if (s > 0 && s < 1) moving = true; });
  return { k, moving, key: layers.map((l) => (l.visible ? l.position.y.toFixed(3) : 'x')).join() + (house.visible ? house.position.y.toFixed(3) : 'x') + trees.map((m) => m.scale.y.toFixed(3)).join() + figs.map((m) => m.scale.y.toFixed(3)).join() };
}
// the headline lands line by line, in masked slides, then the rest of the page chrome
function heroCopy(tb, out) {
  hud.lines.forEach((el, i) => {
    const s = eout4(seg(tb, 5.1 + i * 0.14, 6.1 + i * 0.14));
    el.style.transform = `translate3d(0, ${(1 - s) * 125}%, 0)`;
    el.style.opacity = s > 0.005 ? '1' : '0';
  });
  const sub = eout(seg(tb, 5.75, 6.6));
  css(hud.sub, { opacity: sub * (1 - out), transform: `translate3d(0, ${(1 - sub) * 12}px, 0)` });
  css(hud.top, { opacity: eout(seg(tb, 5.4, 6.3)) });
  css(hud.hero, { opacity: tb > 5.05 ? 1 - out : 0, transform: `translate3d(0, ${-out * 40}px, 0)` });
}

// ---------------------------------------------------------------- the camera, chapter by chapter
const VH = () => innerHeight / 100;
let exact = 0, smooth = 0; // the scroll in vh, and its smoothed copy that drives everything
const readScroll = () => scrollY / VH();
const fwd = new THREE.Vector3();
function setFocus(fp, ap, mb) {
  camera.getWorldDirection(fwd);
  bokeh.uniforms.focus.value = Math.max(1, fp.clone().sub(camera.position).dot(fwd));
  bokeh.uniforms.aperture.value = ap * (phone ? 0.8 : 1);
  bokeh.uniforms.maxblur.value = mb;
  bokeh.enabled = ap > 1e-6;
}
function place(p, dir, fov) {
  if (CAMQ) { p = V(CAMQ[0], CAMQ[1], CAMQ[2]); dir = V(CAMQ[3], CAMQ[4], CAMQ[5]).sub(p).normalize(); fov = CAMQ[6]; }
  camera.position.copy(p); camera.lookAt(p.clone().add(dir)); camera.fov = fov; camera.updateProjectionMatrix();
}
function diveCamera(tb, d, t) {
  const H = K.hero;
  // the build's slow push-in from further back, then the dive along the path
  const pin = eio(seg(tb, 1.3, 6.6));
  const de = lerp(d, sstep(d), 0.5);
  const u = pathU(de);
  const p = d > 0 ? pathP.getPoint(u) : K.pre.p.clone().lerp(H.p, pin);
  const tg = d > 0 ? pathT.getPoint(u) : K.pre.t.clone().lerp(H.t, pin);
  // a slow breath while the hero waits
  const idle = 1 - sstep(seg(d, 0, 0.12));
  p.x += Math.sin(t * 0.37) * 0.9 * idle; p.y += Math.sin(t * 0.29 + 1) * 0.5 * idle; p.z += Math.cos(t * 0.31) * 0.9 * idle;
  const fu = sstep(seg(de, 0.4, 0.97));
  place(p, tg.clone().sub(p).normalize(), lerp(d > 0 ? H.f : lerp(K.pre.f, H.f, pin), K.eye.f, fu));
  // focus: on the house all the way, and the blur eases as the scale grows
  const a = sstep(seg(de, 0.15, 0.95));
  setFocus(H.fp.clone().lerp(K.eye.fp, sstep(seg(de, 0.2, 1))), lerp(H.ap, K.eye.ap, a), lerp(H.mb, K.eye.mb, a));
  return { ao: 0.95, aoR: lerp(0.9, 0.35, a) };
}
function turnCamera(tau) {
  // glide along a continuous multi-key Catmull-Rom curve from EYE() through the low-angle garden approach into SPOT
  const u = lerp(tau, sstep(tau), 0.55);
  const p = turnP.getPoint(u), tg = turnT.getPoint(u);
  const fovBreath = 2.0 * Math.sin(Math.PI * sstep(seg(tau, 0.02, 0.88)));
  place(p, tg.sub(p).normalize(), lerp(K.eye.f, K.turnF, u) - fovBreath);
  setFocus(K.eye.fp, K.eye.ap * (1 - sstep(seg(tau, 0, 0.07))), K.eye.mb);
  return { ao: 0.95 * (1 - sstep(seg(tau, 0, 0.12))) + 0.95 * sstep(seg(tau, 0.95, 1)), aoR: lerp(0.35, 0.6, sstep(seg(tau, 0.88, 1))) };
}
function walkCamera(w) {
  // the walk is at the door a fifth of the way in, then rests twice: just inside (the scroll from 0.27 to 0.435
  // barely moves it) and at the desk. The lens opens as we enter, and closes a little for the model
  const sO = walkShot.keyS[WALK_DOOR], sH = walkShot.keyS[WALK_HOLD], sD = walkShot.keyS[WALK_DESK];
  const sR = walkShot.keyS[WALK_RISE], sG = walkShot.keyS[WALK_GAL];
  const wu = pw(w, [[0, 0], [0.2, sO], [0.27, sH - 0.008], [0.42, sH + 0.012], [0.52, sR], [0.63, sG], [0.78, sD - 0.004], [0.87, sD + 0.004], [1, 1]]);
  const s = walkShot.at(wu);
  const fIn = lerp(K.walkF[0], K.walkF[1], sstep(seg(w, 0.17, 0.3)));
  place(s.p, s.dir, lerp(fIn, K.deskF, sstep(seg(w, 0.6, 0.78)) * (1 - sstep(seg(w, 0.87, 0.97)))));
  setFocus(K.eye.fp, 0, 0.01);
  return { ao: 0.95, aoR: 0.6 };
}
let backAt = null;
function backCamera(r, t, e) {
  // out of the door by r 0.23 (still looking out), turned round to the house by 0.41, then the long pull back
  if (!backAt) backAt = mono([[0, 0], [0.23, backShot.keyS[BACK_OUT]], [0.41, backShot.keyS[BACK_TURNED]], [0.64, Math.max(0.668, backShot.keyS[BACK_TURNED] + 0.12)], [1, 1]]);
  const s = backShot.at(backAt(r));
  const idle = sstep(seg(r, 0.96, 1));
  s.p.x += Math.sin(t * 0.37) * 0.9 * idle; s.p.y += Math.sin(t * 0.29 + 1) * 0.5 * idle; s.p.z += Math.cos(t * 0.31) * 0.9 * idle;
  // the end: the lens drifts off the model, so it stands clear of the words
  const pan = sstep(seg(e, 0.15, 0.7));
  if (pan > 0) {
    const [yaw, pitch] = phone ? [0, -0.125] : [0.085, 0.045];
    const side = V(-s.dir.z, 0, s.dir.x).normalize();
    s.dir.applyAxisAngle(side, pitch * pan).applyAxisAngle(V(0, 1, 0), yaw * pan);
  }
  place(s.p, s.dir, lerp(K.backF, K.hero.f, sstep(seg(r, 0.38, 0.92))));
  const a = sstep(seg(r, 0.78, 1));
  setFocus(K.hero.fp, K.hero.ap * a, K.hero.mb);
  return { ao: 0.95 * (1 - sstep(seg(r, 0.04, 0.12))) + 0.95 * sstep(seg(r, 0.86, 0.9)), aoR: lerp(0.6, 0.9, sstep(seg(r, 0.8, 1))) };
}
// the front's compressed radius from the bulb (see sweep.js): 43 reaches the lens, 47 the figure,
// 50 to 66 the house in true 1:1 metres, and 66 to 72.8 completes the garden and trees while keeping the dark studio environment
const DOOR_W = [0.07, 0.18], DOOR_R = [0.26, 0.38]; // when the door opens (of the walk) and closes (of the way back)
const R_MAX = 72.8;
const turnR = (tau) => pw(tau, [[0, 38], [0.10, 47.5], [0.40, 56.5], [0.68, 66.5], [0.88, 71.2], [1, R_MAX]]);
const backR = (r) => pw(r, [[0, R_MAX], [0.44, R_MAX], [0.58, 66.5], [0.7, 56.5], [0.78, 45], [0.88, 0]]);

// ---------------------------------------------------------------- the frame
let t0 = performance.now() / 1000, loadDone = REC ? LOAD_REC : -1, lastT = 0;
function update(t, dt) {
  // live: the loader follows real progress (painted by the inline script) until the line is finished
  if (!REC && loadDone < 0) { if (L.done) loadDone = t; else return false; }
  if (REC && t < LOAD_REC) { L.paint(eio(clamp(t / LOAD_REC)), 0, 0); }
  const tb = t - loadDone;
  let build = { k: 0, moving: true, key: 'pre' };
  if (tb < 0) { layers.forEach((l) => (l.visible = false)); house.visible = false; trees.forEach((m) => (m.visible = false)); figs.forEach((m) => (m.visible = false)); }
  else build = heroBuild(tb);
  if (tb > 1.25) document.body.classList.remove('locked');
  exact = readScroll();
  smooth = REC && dt === 0 ? exact : smooth + (exact - smooth) * (1 - Math.exp(-3.4 * dt));
  if (Math.abs(exact - smooth) < 1e-3) smooth = exact;
  const y = smooth, T = Math.max(0, tb);
  const d = seg(y, ...CH.dive), tau = seg(y, ...CH.turn), w = seg(y, ...CH.walk), r = seg(y, ...CH.back), e = seg(y, ...CH.end);

  // the camera
  let cam;
  if (y < CH.turn[0]) cam = diveCamera(T, d, t);
  else if (y < CH.walk[0]) cam = turnCamera(tau);
  else if (y < CH.back[0]) cam = walkCamera(w);
  else cam = backCamera(r, t, e);
  // while the front passes the lens its red must not flood the frame: the bloom steps back for that moment
  bloom.strength = 0.34 * (1 - 0.75 * sstep(seg(y, CH.turn[0], CH.turn[0] + 12)) * (1 - sstep(seg(tau, 0.14, 0.3))));
  if (gtao) { gtao.blendIntensity = cam.ao; gtao.enabled = cam.ao > 0.01; gtao.updateGtaoMaterial({ radius: cam.aoR }); }

  // smoothly fade the foreground scale figure as we step into its exact position at the start of the turn
  if (tb > 5.4) fade(heroFig.material, 1 - sstep(seg(tau, 0.01, 0.14)) * (1 - sstep(seg(r, 0.78, 0.88))));

  // the front, and which world is drawn
  const Rv = y < CH.turn[0] ? 0 : y < CH.walk[0] ? turnR(tau) : y < CH.back[0] ? R_MAX : backR(r);
  SWEEP.R.value = Rv;
  SWEEP.glow.value = sstep(seg(Rv, 36, 41)) * (1 - 0.85 * sstep(seg(Rv, 70.5, 72.75)));
  for (const m of realMeshes) m.visible = Rv > 32;
  sunDisc.visible = Rv > R_MAX - 0.05;
  const cardOn = Rv < R_MAX - 0.3;
  for (const m of cardMeshes) m.visible = buildSet.has(m) ? m.visible && cardOn : cardOn; // the build decides first, the front second
  // cross-fade the lamp's light into a low white sun as the sweep passes over the camera and the house
  const dayK = sstep(seg(Rv, 42, 66));
  sun.intensity = lerp(2.85, 4.15, dayK);
  hemiDay.intensity = lerp(0.25, 0.40, dayK);
  renderer.toneMappingExposure = lerp(1.02, 1.06, dayK);
  // the two leaves part as we come up onto the terrace, and close behind us on the way out
  const door = DOOR.slide * sstep(seg(w, DOOR_W[0], DOOR_W[1])) * (y < CH.back[0] ? 1 : 1 - sstep(seg(r, DOOR_R[0], DOOR_R[1])));
  real.leaves[0].position.z = -door; real.leaves[1].position.z = door;

  // the lamp: on through the build and the whole journey, then clicks off once, decaying into moonlight
  let k = build.k;
  const endGlow = sstep(seg(e, 0.2, 0.45));
  if (e > 0.2) k *= 1 - eout(seg(e, 0.2, 0.38));
  setLamp(k, endGlow);

  // shadows redraw when something that casts one has moved (a jump in time included)
  const key = build.key + '|' + Rv.toFixed(2) + '|' + door.toFixed(3);
  if (build.moving || key !== shadowKey) { renderer.shadowMap.needsUpdate = true; shadowKey = key; }

  heroCopy(T, sstep(seg(d, 0, 0.07)));
  copy(T, y, d, tau, w, r, e);
  grade.uniforms.seed.value = (t * 60) % 97;
  return true;
}

function copy(tb, y, d, tau, w, r, e) {
  // the dive: lens height, the drifting sentence, eye height
  const h = camera.position.y - GARDEN;
  const altOn = sstep(seg(d, 0.03, 0.12)) * (1 - sstep(seg(tau, 0.04, 0.14))) + sstep(seg(r, 0.5, 0.58)) * (1 - sstep(seg(r, 0.9, 0.98)));
  css(hud.alt, { opacity: y > CH.walk[0] && y < CH.back[0] ? 0 : altOn });
  hud.altCm.textContent = h.toFixed(1) + ' cm';
  hud.altM.textContent = h.toFixed(1) + ' m';
  hud.altMark.style.transform = `translate3d(0, ${(1 - clamp(h / 60)) * 100}%, 0)`;
  const dr = seg(d, 0.16, 0.62);
  const dop = sstep(seg(dr, 0, 0.18)) * (1 - sstep(seg(dr, 0.78, 1)));
  const driftX = phone ? lerp(3, -3, dr) : lerp(10, -10, dr);
  css(hud.drift, { opacity: dop, transform: `translate3d(${driftX}vw, 0, 0)` });
  show(hud.chip, sstep(seg(d, 0.92, 0.98)) * (1 - sstep(seg(tau, 0, 0.03))), 10);
  // the turn
  if (hud.scanR) hud.scanR.textContent = `SCAN R ${SWEEP.R.value.toFixed(1)}M`;
  show(hud.turnChip, sstep(seg(tau, 0.03, 0.10)) * (1 - sstep(seg(tau, 0.965, 1))), 10);
  const tl = sstep(seg(tau, 0.34, 0.48)) * (1 - sstep(seg(tau, 0.84, 0.95)));
  hud.turnLines.forEach((el, i) => { const s = eout4(seg(tau, 0.32 + i * 0.03, 0.46 + i * 0.03)); el.style.transform = `translate3d(0, ${(1 - s) * 112}%, 0)`; });
  css(hud.turnLine, { opacity: tl });
  hud.scrim.style.opacity = Math.max(dop, tl * 0.8);
  // the rooms
  show(hud.rooms[0], sstep(seg(w, 0.29, 0.35)) * (1 - sstep(seg(w, 0.54, 0.6))));
  show(hud.rooms[1], sstep(seg(w, 0.74, 0.8)) * (1 - sstep(seg(w, 0.88, 0.93))));
  // back to the desk
  show(hud.backLine, sstep(seg(r, 0.6, 0.68)) * (1 - sstep(seg(r, 0.84, 0.9))), 18);
  // the end: the lamp goes off, and the studio says what it does
  const en = sstep(seg(e, 0.4, 0.62));
  hud.end.style.opacity = en > 0 ? 1 : 0;
  hud.end.classList.toggle('live', en > 0.5);
  hud.endLines.forEach((el, i) => { const s = eout4(seg(e, 0.42 + i * 0.05, 0.66 + i * 0.05)); el.style.transform = `translate3d(0, ${(1 - s) * 112}%, 0)`; });
  hud.endRest.forEach((el, i) => show(el, eout(seg(e, 0.58 + i * 0.05, 0.8 + i * 0.05)), 16));
  // the hint
  const hint = eout(seg(tb, 6.6, 7.4));
  hud.hintText.textContent = d > 0.9 ? 'Zum Hineingehen scrollen' : 'Scrollen zum Verkleinern';
  css(hud.hint, { opacity: hint * (d < 0.06 ? 1 - d / 0.06 : d > 0.9 && tau <= 0 ? sstep(seg(d, 0.93, 1)) : 0) });
}
function render() { composer.render(); }

addEventListener('resize', () => {
  const was = phone; phone = innerWidth < 760 || innerWidth / innerHeight < 0.8;
  if (was !== phone) { useKeys(); backAt = null; }
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth / 2, innerHeight / 2);
  grade.uniforms.res.value.set(innerWidth, innerHeight);
  bokeh.uniforms.aspect.value = innerWidth / innerHeight;
});

const raf = () => new Promise((r) => requestAnimationFrame(r));
window.__rig = {
  ready: true, camera, scene, D, RW, phone: () => phone, CH, shots: () => ({ walk: walkShot, back: backShot }), real, stage, land, rtrees,
  // the recorder's frame: t in seconds since start, y in vh of scroll
  async frame(t, y, o = {}) {
    if (y != null) window.scrollTo(0, y * VH());
    const dt = t < lastT || o.snap ? 0 : Math.min(0.1, t - lastT);
    if (t < lastT || o.snap) smooth = readScroll();
    lastT = t;
    update(t, dt); render();
    await raf(); await raf();
    return { t, y: +smooth.toFixed(1), R: +SWEEP.R.value.toFixed(1), fov: +camera.fov.toFixed(2), cam: camera.position.toArray().map((v) => +v.toFixed(2)) };
  },
  // design aid (with ?rec): how close any surface comes to the lens over the whole scroll.
  // Exact distance from the eye to every triangle that is drawn on the lens's side of the front. Returns the worst, and every sample under `warn`.
  clear(warn = 0.4, stepVh = 5, y0 = CH.dive[0], y1 = CH.back[1]) {
    const pack = (m) => {
      m.updateWorldMatrix(true, false);
      const g = m.geometry, p = g.attributes.position, ix = g.index, n = ix ? ix.count / 3 : p.count / 3;
      const T = new Float32Array(n * 13), a = V(), b = V(), c = V();
      for (let i = 0; i < n; i++) {
        a.fromBufferAttribute(p, ix ? ix.getX(i * 3) : i * 3).applyMatrix4(m.matrixWorld);
        b.fromBufferAttribute(p, ix ? ix.getX(i * 3 + 1) : i * 3 + 1).applyMatrix4(m.matrixWorld);
        c.fromBufferAttribute(p, ix ? ix.getX(i * 3 + 2) : i * 3 + 2).applyMatrix4(m.matrixWorld);
        const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
        T.set([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, cx, cy, cz, Math.max(a.distanceTo(V(cx, cy, cz)), b.distanceTo(V(cx, cy, cz)), c.distanceTo(V(cx, cy, cz)))], i * 13);
      }
      return T;
    };
    const moving = new Set(real.leaves.flatMap((l) => l.children));
    const cache = new Map();
    const tri = new THREE.Triangle(), q = V(), out = { worst: 9, at: 0, near: [] };
    for (let y = y0; y <= y1 + 1e-6; y += stepVh) {
      window.scrollTo(0, y * VH()); update(lastT = 30, 0);
      const e = camera.position, side = SWEEP.R.value > 45 ? 'real' : 'card';
      let best = 9, where = null;
      for (const m of side === 'real' ? realMeshes : [...cardMeshes, ...studioMeshes]) {
        if (!m.visible || (m === heroFig && m.material.opacity < 0.05)) continue;
        let T = cache.get(m);
        if (!T || moving.has(m)) { T = pack(m); cache.set(m, T); }
        for (let i = 0; i < T.length; i += 13) {
          const dx = T[i + 9] - e.x, dy = T[i + 10] - e.y, dz = T[i + 11] - e.z;
          if (Math.sqrt(dx * dx + dy * dy + dz * dz) - T[i + 12] > best) continue;
          tri.a.set(T[i], T[i + 1], T[i + 2]); tri.b.set(T[i + 3], T[i + 4], T[i + 5]); tri.c.set(T[i + 6], T[i + 7], T[i + 8]);
          const d = tri.closestPointToPoint(e, q).distanceTo(e);
          if (d < best) { best = d; where = q.toArray().map((v) => +v.toFixed(2)); }
        }
      }
      if (best < out.worst) { out.worst = +best.toFixed(3); out.at = y; }
      if (best < warn) out.near.push({ y, d: +best.toFixed(3), eye: e.toArray().map((v) => +v.toFixed(2)), where });
    }
    return out;
  },
  // honest frame cost: reading one pixel back makes the GPU finish each frame
  bench(n = 60) { const gl = renderer.getContext(), px = new Uint8Array(4); const t0 = performance.now(); for (let i = 0; i < n; i++) { render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return +((performance.now() - t0) / n).toFixed(2); },
  info() { renderer.info.autoReset = false; renderer.info.reset(); render(); const i = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, tex: renderer.info.memory.textures, geo: renderer.info.memory.geometries, progs: renderer.info.programs.length }; renderer.info.autoReset = true; return i; },
};

if (!REC) {
  let last = performance.now() / 1000, slow = 0;
  const loop = () => {
    const now = performance.now() / 1000, dt = Math.min(1 / 30, now - last); last = now;
    if (!document.hidden && innerWidth > 0 && innerHeight > 0) {
      if (update(now - t0, dt)) render();
      // quality governor: a lower render size if frames run long for two seconds
      slow = dt > 0.03 ? slow + dt : Math.max(0, slow - dt * 0.5);
      if (slow > 2 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); composer.setPixelRatio(dpr); composer.setSize(innerWidth, innerHeight); slow = 0; }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
