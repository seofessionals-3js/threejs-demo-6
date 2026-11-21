// The house itself, in daylight: the same list of parts as the card model, in white render, black oak, glass and linen,
// on land graded from the same contour lines, under the sun that was the desk lamp. Black, white, and one red.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { houseParts, makeRnd, G, L1, STEPS } from './house.js';
import { canvasTex, grain, blotches, worldUV, shiftZ, treeSpots, cardHouse, contourLayers, modelTrees, modelFigures, buildLamp, LAMP, sheetMaterial, mergeStatic, lean, QL, MAT_TOP, DESK_TOP, FALL, STEP, BENCH, SLOPE_X } from './desk.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = makeRnd(71);    // geometry: the same on every device
const trnd = makeRnd(4211); // textures
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// the sun sits where the lamp's light came from, lowered to a late afternoon
export const SUN_DIR = V(0.9456, 0.1305, 0.2981).normalize(); // 7.5 degrees up: low enough to show under the roof, from the study, through the big glass

// ---------------------------------------------------------------- land
// The contour layers are the land cut into 0.8 m steps. Undo the steps: the same lines, read as a slope,
// with a subtle memory of the 0.8 m contour benches near the house so card and land rhyme during the turn.
function noise2(x, z) { // value noise, smooth, deterministic
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const h = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return (h(xi, zi) * (1 - u) + h(xi + 1, zi) * u) * (1 - v) + (h(xi, zi + 1) * (1 - u) + h(xi + 1, zi + 1) * u) * v;
}
const fbm = (x, z) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { s += a * noise2(x * f, z * f); f *= 2.03; a *= 0.5; } return s; };

export function landAt(x, z) {
  const u = x - shiftZ(z);
  let h = G - clamp((u - (SLOPE_X - BENCH / 2)) / (FALL / STEP * BENCH)) * FALL;   // the garden slope the layers were cut from
  if (u > 38) h -= (u - 38) * 0.1 / (1 + (u - 38) / 40);                          // the lawn eases away past the edge of the board
  if (u < -14) h += Math.pow((-14 - u) / 44, 1.5) * 7;                            // the land behind keeps rising
  h += sstep(260, 720, u) * 70 * (0.6 + 0.8 * fbm(z * 0.004 + 3, u * 0.002));    // hills far off
  const r = Math.hypot(x - 12, z + 2);
  h += sstep(62, 170, r) * (fbm(x * 0.012, z * 0.012) - 0.45) * 14;               // the far land rolls
  // made ground: the terrace, the garden steps and the forecourt lie true
  const pad = (x0, x1, z0, z1, e) => sstep(x0 - e, x0, x) * (1 - sstep(x1, x1 + e, x)) * sstep(z0 - e, z0, z) * (1 - sstep(z1, z1 + e, z));
  const made = Math.max(pad(4.4, 21.4, -7.6, 5.8, 0.6), pad(21.2, STEPS.x0 + STEPS.n * STEPS.run + 0.4, STEPS.z0 - 0.3, STEPS.z1 + 0.3, 0.4), pad(-3.7, 5, -3.8, 1.6, 0.5));
  h += (fbm(x * 0.35, z * 0.35) - 0.5) * 0.12 * sstep(6, 14, r) * (1 - made);     // a little unevenness
  // a memory of the 0.4 m benches on the slope, so card and land rhyme during the turn
  const bench = Math.round((h - G) / STEP) * STEP + G;
  h = lerp(h, bench, 0.14 * sstep(14, 22, r) * (1 - sstep(32, 48, r)) * (1 - made));
  if (x > 5.1 && x < 16.9 && z > -6.9 && z < 2.9) h = Math.min(h, -0.55);         // dug out under the house
  return h;
}

function axis(c0, c1, step, far0, far1, rate) { // dense samples near, growing spacing to the far edges
  const xs = [];
  for (let x = c0; x <= c1 + 1e-6; x += step) xs.push(+x.toFixed(3));
  const grow = (from, to) => { const out = []; let x = from, d = step; while ((to > from && x < to) || (to < from && x > to)) { d *= rate; x += Math.sign(to - from) * d; out.push(x); } return out; };
  return [...grow(c0, far0).reverse(), ...xs, ...grow(c1, far1)];
}

// q: 0 phone, 1 tablet, 2 desktop
export function terrain(R, q = 2) {
  const step = [0.8, 0.65, 0.5][q], rate = [1.14, 1.11, 1.08][q];
  const xs = axis(-10, 44, step, -700, 1100, rate), zs = axis(-16, 16, step, -900, 900, rate);
  for (const v of [5.1, 16.9, 21.75, 32.25]) { xs.push(v - 0.04, v + 0.04); }
  for (const v of [-6.9, 2.9]) { zs.push(v - 0.04, v + 0.04); }
  xs.sort((a, b) => a - b); zs.sort((a, b) => a - b);
  const nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
  const c = new THREE.Color();
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = xs[i], z = zs[j], y = landAt(x, z), k = j * nx + i;
    pos.set([x, y, z], k * 3); uv.set([x, z], k * 2);
    const r = Math.hypot(x - 12, z + 2), dry = sstep(26, 150, r) * (0.45 + 0.7 * fbm(x * 0.02 + 9, z * 0.02));
    const patch = fbm(x * 0.055, z * 0.055), micro = fbm(x * 0.22 + 4.1, z * 0.22 - 2.7);
    const v = 0.86 + 0.12 * dry - 0.13 * patch + 0.05 * (micro - 0.5);
    c.setRGB(v, v, v * 1.015);
    col.set([c.r, c.g, c.b], k * 3);
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, d = a + nx, e = d + 1; idx.push(a, d, b, b, d, e); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, R.land); m.receiveShadow = true; m.castShadow = false; // the slope faces the sun: nothing on it shades itself
  return m;
}

// ---------------------------------------------------------------- textures and materials
function makeTextures() {
  const T = {};
  // Architectural board-marked concrete: pine shuttering grain, lift seams, and recessed cone tie-rod holes
  T.conc = canvasTex(1024, 1024, (g, s) => {
    g.fillStyle = '#b6b6b9'; g.fillRect(0, 0, s, s);
    blotches(g, s, 95, 'rgba(252,252,254,0.038)', 28, 130);
    blotches(g, s, 95, 'rgba(52,52,54,0.042)', 24, 120);
    const boards = 16, bh = s / boards;
    for (let b = 0; b < boards; b++) {
      const y0 = b * bh, tone = (trnd() - 0.5) * 10;
      g.fillStyle = tone > 0 ? `rgba(252,252,254,${tone * 0.004})` : `rgba(41,41,43,${-tone * 0.004})`;
      g.fillRect(0, y0, s, bh);
      // subtle horizontal wood-grain transfer from formwork boards
      for (let k = 0; k < 14; k++) {
        const y = y0 + trnd() * bh;
        g.fillStyle = trnd() < 0.5 ? 'rgba(59,59,61,0.045)' : 'rgba(244,244,246,0.035)';
        g.fillRect(0, y, s, 1 + trnd() * 1.5);
      }
      // formwork board seam fin and shadow
      g.fillStyle = 'rgba(34,34,36,0.18)'; g.fillRect(0, y0, s, 1.5);
      g.fillStyle = 'rgba(252,252,254,0.09)'; g.fillRect(0, y0 + 1.5, s, 1.2);
    }
    for (let i = 0; i < 18; i++) {
      const y = Math.floor(trnd() * boards) * bh;
      g.fillStyle = 'rgba(36,36,38,0.12)'; g.fillRect(trnd() * s, y, 1.5, bh);
    }
    // architectural formwork tie holes in regular grid rows
    for (const ry of [0.18, 0.5, 0.82]) for (const rx of [0.16, 0.5, 0.84]) {
      const x = rx * s + (trnd() - 0.5) * 6, y = ry * s + (trnd() - 0.5) * 6;
      g.fillStyle = 'rgba(48,48,50,0.42)'; g.beginPath(); g.arc(x, y, 5.2, 0, 7); g.fill();
      g.strokeStyle = 'rgba(240,240,242,0.22)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y + 0.6, 5.8, 0, 7); g.stroke();
      g.fillStyle = 'rgba(25,25,27,0.55)'; g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill();
    }
    for (let i = 0; i < 65; i++) {
      g.fillStyle = 'rgba(63,63,65,0.28)';
      g.beginPath(); g.arc(trnd() * s, trnd() * s, 0.8 + trnd() * 1.6, 0, 7); g.fill();
    }
    grain(g, s, s, 14);
  }, { tile: 2.4 });

  // Wide planks of black-stained oak, the grain a shade lighter, micro-bevel seams
  T.oak = canvasTex(1024, 1024, (g, s) => {
    const rows = 14, h = s / rows;
    for (let r = 0; r < rows; r++) {
      let x = -trnd() * s * 0.4;
      while (x < s) {
        const L = s * (0.42 + trnd() * 0.55), v = trnd();
        g.fillStyle = `hsl(240,3%,${15 + v * 6}%)`;
        g.fillRect(x, r * h, L, h);
        for (let k = 0; k < 18; k++) {
          const gy = r * h + trnd() * h;
          g.fillStyle = `rgba(59,59,61,${0.035 + trnd() * 0.065})`;
          g.fillRect(x, gy, L, 0.8 + trnd() * 1.4);
        }
        for (let k = 0; k < 6; k++) {
          g.fillStyle = `rgba(224,224,226,${0.04 + trnd() * 0.05})`;
          g.fillRect(x + trnd() * L * 0.5, r * h + trnd() * h, L * 0.4, 1);
        }
        g.fillStyle = 'rgba(31,31,33,0.28)'; g.fillRect(x, r * h, 1.5, h);
        x += L;
      }
      g.fillStyle = 'rgba(30,30,32,0.26)'; g.fillRect(0, r * h, s, 1.4);
      g.fillStyle = 'rgba(240,240,242,0.08)'; g.fillRect(0, r * h + 1.4, s, 1);
    }
    grain(g, s, s, 9);
  }, { tile: 3.6 });

  // One slab of black-stained oak for the study desk
  T.deskOak = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#1d1d20'; g.fillRect(0, 0, w, h);
    for (let b = 0; b < 4; b++) {
      const y0 = (b * h) / 4, bh = h / 4, v = (b % 2) * 0.04;
      g.fillStyle = `rgba(44,44,48,${0.25 + v})`; g.fillRect(0, y0, w, bh);
      for (let i = 0; i < 48; i++) {
        const y = y0 + trnd() * bh;
        g.fillStyle = trnd() < 0.65 ? `rgba(57,57,59,${0.03 + trnd() * 0.055})` : `rgba(219,219,221,${0.03 + trnd() * 0.04})`;
        g.fillRect(0, y, w, 0.8 + trnd() * 1.8);
      }
      g.fillStyle = 'rgba(40,40,42,0.12)'; g.fillRect(0, y0, w, 1);
    }
    grain(g, w, h, 7);
  }, { tile: 2.2 });

  // Lawn, in greys (blended at two scales in the shader)
  T.grass = canvasTex(1024, 1024, (g, s) => {
    g.fillStyle = '#5d5e62'; g.fillRect(0, 0, s, s);
    blotches(g, s, 90, 'rgba(172,172,174,0.14)', 24, 110);
    blotches(g, s, 90, 'rgba(62,62,64,0.15)', 22, 100);
    blotches(g, s, 60, 'rgba(116,116,118,0.10)', 16, 70);
    for (let i = 0; i < 28000; i++) {
      const r = trnd();
      g.fillStyle = r < 0.45 ? 'rgba(51,51,53,0.24)' : r < 0.82 ? 'rgba(178,178,180,0.19)' : 'rgba(117,117,119,0.22)';
      const x = trnd() * s, y = trnd() * s;
      g.fillRect(x, y, 1 + (r > 0.85 ? 0.6 : 0), 2.2 + trnd() * 3.2);
    }
    grain(g, s, s, 10);
  }, { tile: 6.5 });

  // Honed limestone / travertine terrace slabs in running ashlar bond (replaces 2x4 checkerboard)
  T.pave = canvasTex(1024, 1024, (g, s) => {
    g.fillStyle = '#d0d0cf'; g.fillRect(0, 0, s, s);
    const rows = 6, rh = s / rows;
    for (let r = 0; r < rows; r++) {
      const shift = (r % 2) * (s * 0.28) + (r % 3) * (s * 0.11);
      const cols = 3, cw = s / cols;
      for (let c = -1; c <= cols; c++) {
        const x0 = c * cw + (shift % cw), y0 = r * rh;
        const dv = (trnd() - 0.5) * 0.07;
        g.fillStyle = dv > 0 ? `rgba(250,250,252,${dv})` : `rgba(100,100,102,${-dv})`;
        g.fillRect(x0, y0, cw, rh);
        // subtle travertine sedimentary veins
        for (let v = 0; v < 8; v++) {
          g.fillStyle = trnd() < 0.5 ? 'rgba(117,117,119,0.045)' : 'rgba(248,248,250,0.05)';
          g.fillRect(x0 + trnd() * cw * 0.3, y0 + trnd() * rh, cw * (0.4 + trnd() * 0.5), 1.2 + trnd() * 2);
        }
        g.fillStyle = 'rgba(69,69,71,0.34)'; g.fillRect(x0, y0, 1.6, rh);
        g.fillStyle = 'rgba(252,252,254,0.18)'; g.fillRect(x0 + 1.6, y0, 1.0, rh);
      }
      g.fillStyle = 'rgba(69,69,71,0.36)'; g.fillRect(0, r * rh, s, 1.6);
      g.fillStyle = 'rgba(252,252,254,0.2)'; g.fillRect(0, r * rh + 1.6, s, 1.0);
    }
    blotches(g, s, 55, 'rgba(112,112,114,0.04)', 14, 64);
    grain(g, s, s, 9);
  }, { tile: 3.2 });

  // bark
  T.bark = canvasTex(512, 512, (g, s) => {
    g.fillStyle = '#3d3d40'; g.fillRect(0, 0, s, s);
    blotches(g, s, 50, 'rgba(127,127,129,0.12)', 14, 60);
    blotches(g, s, 50, 'rgba(29,29,31,0.16)', 12, 55);
    for (let i = 0; i < 220; i++) {
      const x = trnd() * s, y = trnd() * s, h = 25 + trnd() * 90;
      g.fillStyle = trnd() < 0.55 ? 'rgba(25,25,27,0.28)' : 'rgba(139,139,141,0.16)';
      g.fillRect(x, y, 1.5 + trnd() * 2, h);
    }
    grain(g, s, s, 14);
  }, { tile: 0.8 });

  // the painting on the gallery wall: a red sun, cut by a black arc
  T.art = canvasTex(1024, 683, (g, w, h) => {
    g.fillStyle = '#eceae6'; g.fillRect(0, 0, w, h); blotches(g, w, 40, 'rgba(142,142,144,0.06)', 30, 160);
    g.fillStyle = '#e5202e'; g.beginPath(); g.arc(w * 0.62, h * 0.46, h * 0.3, 0, 7); g.fill();
    g.strokeStyle = '#131315'; g.lineWidth = 26; g.beginPath(); g.arc(w * 0.3, h * 1.1, h * 0.75, Math.PI * 1.25, Math.PI * 1.9); g.stroke();
    g.fillStyle = 'rgba(36,36,38,0.85)'; g.fillRect(w * 0.12, h * 0.18, w * 0.05, h * 0.5);
    grain(g, w, h, 14);
  });

  // the second painting, by the dining table: a red field, a black field, one grey line
  T.art2 = canvasTex(512, 680, (g, w, h) => {
    g.fillStyle = '#eceae6'; g.fillRect(0, 0, w, h);
    blotches(g, w, 30, 'rgba(122,122,124,0.07)', 20, 110);
    g.fillStyle = '#e5202e'; g.fillRect(w * 0.16, h * 0.18, w * 0.46, h * 0.38);
    g.fillStyle = '#141416'; g.fillRect(w * 0.44, h * 0.42, w * 0.38, h * 0.4);
    g.strokeStyle = '#8d8d92'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(w * 0.16, h * 0.74); g.lineTo(w * 0.82, h * 0.24); g.stroke();
    grain(g, w, h, 12);
  });
  return T;
}

// Patch terrain material with dual-scale rotated world UV sampling + procedural hillside macro/micro modulation
function patchLand(mat) {
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLandPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLandPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLandPos;
        float lHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float lNoise(vec2 p){
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(lHash(i), lHash(i + vec2(1.0, 0.0)), f.x),
                     mix(lHash(i + vec2(0.0, 1.0)), lHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }`)
      .replace('#include <map_fragment>', `{
        vec2 uvA = vLandPos.xz * 0.16;
        vec2 uvB = (mat2(0.78, -0.62, 0.62, 0.78) * vLandPos.xz) * 0.058 + vec2(3.7, -1.9);
        vec4 texA = texture2D(map, uvA);
        vec4 texB = texture2D(map, uvB);
        float blend = smoothstep(0.28, 0.72, lNoise(vLandPos.xz * 0.085));
        vec3 grassCol = mix(texA.rgb, texB.rgb, blend);
        float meadow = lNoise(vLandPos.xz * 0.025) * 0.6 + lNoise(vLandPos.xz * 0.11) * 0.4;
        float blades = (lNoise(vLandPos.xz * 3.4) - 0.5) * 0.09;
        grassCol *= mix(vec3(0.88), vec3(1.08), meadow) + blades;
        diffuseColor.rgb *= grassCol;
      }`);
  };
  mat.customProgramCacheKey = () => 'land-dual-scale';
  return mat;
}

// Patch foliage materials with subtle per-leaf tonal variation, crown AO from vertex color, and warm sunlit subsurface scatter
function patchFoliage(mat, sssTint = [0.12, 0.12, 0.13]) {
  mat.vertexColors = true;
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLeafW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLeafW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLeafW;
        float fHash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float leafVar = fHash(floor(vLeafW * 9.0));
        diffuseColor.rgb *= mix(0.88, 1.12, leafVar);`)
      .replace('#include <opaque_fragment>', `
        vec3 sunD = normalize(vec3(0.9456, 0.1305, 0.2981));
        float backLight = pow( clamp( dot( normalize(vViewPosition), sunD ), 0.0, 1.0 ), 2.6 );
        float upRim = clamp( geometryNormal.y * 0.5 + 0.5, 0.0, 1.0 );
        outgoingLight += vec3(${sssTint.join(',')}) * (0.35 + 0.65 * backLight) * upRim * diffuseColor.rgb;
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'foliage-sss-' + sssTint[0];
  return mat;
}

export function realMaterials(env) {
  const T = makeTextures();
  const std = (o) => new THREE.MeshStandardMaterial(lean(Object.assign({ roughness: 0.88, metalness: 0, envMap: env, envMapIntensity: 0.45 }, o)));
  const R = {
    T,
    conc: std({ map: T.conc, bumpMap: T.conc, bumpScale: 0.011, roughness: 0.84 }),
    plaster: std({ color: 0xf1f0ed, roughness: 0.93 }),
    floorD: std({ color: 0x5a5a5f, roughness: 0.4, envMapIntensity: 0.6 }),
    oakD: std({ map: T.oak, bumpMap: T.oak, bumpScale: 0.005, roughness: 0.42 }),
    desk: std({ map: T.deskOak, bumpMap: T.deskOak, bumpScale: 0.004, roughness: 0.36, envMapIntensity: 0.65 }),
    gravel: std({ color: 0x77777b, roughness: 0.98 }),
    pave: std({ map: T.pave, bumpMap: T.pave, bumpScale: 0.008, roughness: 0.78 }),
    steel: std({ color: 0x151517, metalness: 0.68, roughness: 0.36, envMapIntensity: 0.85 }),
    red: std({ color: 0xc8121f, metalness: 0.2, roughness: 0.34, envMapIntensity: 0.8 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x1a1d22,
      roughness: 0.03,
      metalness: 0.0,
      ior: 1.5,
      reflectivity: 0.65,
      transparent: true,
      opacity: 0.11,
      envMap: env,
      envMapIntensity: 0.92,
      depthWrite: false,
    }),
    fabric: std({ color: 0xe9e8e5, roughness: 0.94 }),
    rug: std({ color: 0x8d8d91, roughness: 0.96 }),
    rugD: std({ color: 0x3b3b3f, roughness: 0.96 }),
    black: std({ color: 0x19191c, roughness: 0.42, envMapIntensity: 0.6 }),
    leather: std({ color: 0xb01420, roughness: 0.4, envMapIntensity: 0.65 }),
    linen: std({ color: 0xf2f1ee, roughness: 0.9 }),
    curtain: new THREE.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.92, transparent: true, opacity: 0.76, side: THREE.DoubleSide }),
    stone: std({ color: 0xdedddb, roughness: 0.28, envMapIntensity: 0.6 }),
    white: std({ color: 0xf5f4f2, roughness: 0.24 }),
    shade: std({ color: 0xfffaf2, emissive: 0xfff0e0, emissiveIntensity: 0.52, roughness: 0.75, side: THREE.DoubleSide }),
    leaf: patchFoliage(std({ color: 0x5b5d60, roughness: 0.78, envMapIntensity: 0.22 }), [0.10, 0.10, 0.11]),
    leafDS: std({ color: 0x484a4d, roughness: 0.52, side: THREE.DoubleSide, envMapIntensity: 0.4 }),
    leafDark: patchFoliage(std({ color: 0x353638, roughness: 0.82, envMapIntensity: 0.18 }), [0.06, 0.06, 0.07]),
    maple: patchFoliage(std({ color: 0xb3141f, roughness: 0.72, envMapIntensity: 0.22 }), [0.30, 0.03, 0.04]),
    bark: std({ map: T.bark, bumpMap: T.bark, bumpScale: 0.015, roughness: 0.92 }),
    land: patchLand(std({ map: T.grass, vertexColors: true, roughness: 0.96, envMapIntensity: 0.25 })),
    redC: std({ color: 0xc41824, roughness: 0.86 }),
    greyC: std({ color: 0x7e7e82, roughness: 0.86 }),
    coalC: std({ color: 0x2a2a2d, roughness: 0.86 }),
    charcoal: std({ color: 0x1c1c1f, roughness: 0.5 }),
    ceramic: std({ color: 0xecebe8, roughness: 0.3, envMapIntensity: 0.65 }),
    art: std({ map: T.art, roughness: 0.85 }),
    art2: std({ map: T.art2, roughness: 0.85 }),
    board: std({ color: 0x2b2b2e, roughness: 0.95 }),
    basket: std({ color: 0x202023, roughness: 0.85 }),
    trace: std({ color: 0xe9e8e4, roughness: 0.8 }),
    chrome: std({ color: 0xd9dadd, metalness: 0.9, roughness: 0.24, envMapIntensity: 1.0 }),
    book0: std({ color: 0xb5151f }), book1: std({ color: 0x2b2c2f }), book2: std({ color: 0xe6e4e0 }), book3: std({ color: 0x8f8f93 }), book4: std({ color: 0x151517 }),
  };
  return R;
}

// ---------------------------------------------------------------- the house
// Every face goes to the bucket of its material, so the whole house is about twenty draw calls.
// The two leaves of the big door are their own groups, so they can slide.
export function realHouse(R) {
  const buckets = new Map();
  const push = (key, g) => { if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(g); };
  const boxGeo = (b) => { const g = new THREE.BoxGeometry(b[3] - b[0], b[4] - b[1], b[5] - b[2]); g.translate((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2); worldUV(g); return g.toNonIndexed(); };
  const leafBoxes = { '-1': [], 1: [] };
  for (const p of houseParts()) {
    if (p.leaf) { leafBoxes[p.leaf].push([p.k === 'doorglass' ? 'glass' : p.m, p.b]); continue; }
    let boxes = [p.b];
    // a bookcase in the list is one solid box: build it open, so the books on its shelves show
    if (p.shelf) {
      const [x0, y0, z0, x1, y1, z1] = p.b, t = 0.028, midZ = (z0 + z1) / 2;
      boxes = [[x0, y0, z0, x0 + t, y1, z1], [x0, y0, z0, x1, y1, z0 + t], [x0, y0, z1 - t, x1, y1, z1], [x0, y1 - t, z0, x1, y1, z1], [x0, y0, z0, x1, y0 + 0.08, z1],
        [x0 + t, y0 + 0.08, midZ - 0.012, x1 - 0.02, y1 - t, midZ + 0.012]];
      for (let y = y0 + 0.5; y < y1 - 0.2; y += 0.42) boxes.push([x0, y - t, z0, x1, y, z1]);
    }
    // paving on the land gets a skirt, so it sits in the earth
    if (p.k === 'land') { const [x0, y0, z0, x1, y1, z1] = p.b; boxes = [[x0, y0 - 0.3, z0, x1, y1, z1]]; }
    for (const b of boxes) {
      const f = boxGeo(b);
      if (p.k === 'glass') { push('glass', f); continue; }
      const spec = typeof p.m === 'string' ? { all: p.m } : p.m;
      const keys = [spec.all, spec.all, spec.top || spec.all, spec.bot || spec.all, spec.all, spec.all];
      for (let i = 0; i < 6; i++) {
        const face = new THREE.BufferGeometry();
        for (const a of ['position', 'normal', 'uv']) { const src = f.attributes[a]; face.setAttribute(a, new THREE.BufferAttribute(src.array.slice(i * 6 * src.itemSize, (i + 1) * 6 * src.itemSize), src.itemSize)); }
        push(keys[i], face);
      }
    }
  }
  const group = new THREE.Group();
  for (const [key, list] of buckets) {
    if (!R[key]) console.warn('no material', key);
    const m = new THREE.Mesh(mergeGeometries(list), R[key] || R.conc);
    m.castShadow = key !== 'glass'; m.receiveShadow = true;
    if (key === 'glass') m.renderOrder = 2;
    group.add(m);
  }
  const leaves = [-1, 1].map((id) => {
    const leaf = new THREE.Group(), byKey = new Map();
    for (const [key, b] of leafBoxes[id]) { if (!byKey.has(key)) byKey.set(key, []); byKey.get(key).push(boxGeo(b)); }
    for (const [key, list] of byKey) { const m = new THREE.Mesh(mergeGeometries(list), R[key]); m.castShadow = key !== 'glass'; m.receiveShadow = true; if (key === 'glass') m.renderOrder = 2; leaf.add(m); }
    group.add(leaf);
    return leaf;
  });
  return { group, leaves };
}

// ---------------------------------------------------------------- staging: the rooms dressed, in black, white and one red
const REACH = 8.5; // how far a lamp in the house is worth computing: beyond it a pixel skips the light altogether
export function staging(R, Mcard) {
  const g = new THREE.Group();
  const lights = []; // [x, y, z, intensity, distance]: the lamps that are on, for the page to light
  const put = (geo, mat, x = 0, y = 0, z = 0, o = {}) => { if (x || y || z) geo.translate(x, y, z); const m = new THREE.Mesh(geo, mat); m.castShadow = o.cast !== false; m.receiveShadow = true; g.add(m); return m; };
  const box = (x0, y0, z0, x1, y1, z1, mat, o) => put(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, o);
  const rbox = (w, h, d, r, mat, x, y, z, ry = 0, rx = 0, rz = 0) => { // a soft cushion or mattress with rounded edges
    const geo = new THREE.BoxGeometry(w, h, d, 6, 6, 4); const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const ax = Math.abs(v.x) / (w / 2), ay = Math.abs(v.y) / (h / 2); const s = 1 - r * ax * ax * ay * ay; v.z *= 0.78 + 0.22 * (1 - ax * ax) * (1 - ay * ay); v.x *= 1 - r * 0.22 * ay * ay; v.y *= 1 - r * 0.22 * ax * ax; p.setXYZ(i, v.x * s, v.y, v.z); }
    geo.computeVertexNormals(); if (rx) geo.rotateX(rx); if (rz) geo.rotateZ(rz); if (ry) geo.rotateY(ry); return put(geo, mat, x, y, z);
  };
  const lathe = (pts, seg, mat, x, y, z, o) => put(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg), mat, x, y, z, o);

  // a chair: black-stained ash, a woven seat. ry 0 faces -z
  const addChair = (cx, cy, cz, ry = 0, seatMat = R.linen) => {
    const cg = [];
    const part = (geo, mat) => cg.push({ geo, mat });
    for (const [lx, lz, tx, tz] of [[-0.2, -0.19, -0.03, -0.03], [0.2, -0.19, 0.03, -0.03], [-0.19, 0.19, -0.02, 0.04], [0.19, 0.19, 0.02, 0.04]]) {
      const leg = new THREE.CylinderGeometry(0.014, 0.011, 0.45, 8);
      leg.translate(0, 0.225, 0); leg.rotateZ(tx); leg.rotateX(tz); leg.translate(lx, 0, lz);
      part(leg, R.black);
    }
    for (const lx of [-0.19, 0.19]) {
      const stile = new THREE.CylinderGeometry(0.012, 0.014, 0.38, 8);
      stile.translate(0, 0.19, 0); stile.rotateX(-0.1); stile.translate(lx, 0.44, 0.19);
      part(stile, R.black);
    }
    const frame = new THREE.BoxGeometry(0.42, 0.032, 0.4); frame.translate(0, 0.44, 0); part(frame, R.black);
    const seat = new THREE.BoxGeometry(0.4, 0.035, 0.38, 4, 2, 4); seat.translate(0, 0.465, -0.005); part(seat, seatMat);
    const back = new THREE.CylinderGeometry(0.22, 0.22, 0.11, 16, 1, true, -Math.PI * 0.38, Math.PI * 0.76);
    back.scale(1, 1, 0.38); back.translate(0, 0.76, 0.125);
    part(back, R.black);
    const backIn = back.clone(); backIn.scale(0.96, 1, 0.94); part(backIn, R.black);
    for (const { geo, mat } of cg) { geo.rotateY(ry); put(geo, mat, cx, cy, cz); }
  };
  // a plant in a pot: trunk, a second bough, a crown
  const plant = (x, y, z, pot, h, crown, mat, potMat = R.charcoal) => {
    lathe([[0, 0], [pot * 0.82, 0], [pot, pot * 1.5], [pot * 0.92, pot * 1.55], [0, pot * 1.4]], 32, potMat, x, y, z);
    put(gnarledBranch(V(0, pot * 1.2, 0), V(0.05, h * 0.55, -0.04), V(-0.04, h, 0.04), pot * 0.18, pot * 0.09, 7, 8), R.bark, x, y, z);
    put(gnarledBranch(V(0.01, h * 0.62, -0.01), V(0.14, h * 0.8, 0.06), V(0.22, h * 0.98, 0.1), pot * 0.09, pot * 0.045, 5, 6), R.bark, x, y, z);
    put(canopy(crown, 0.055, 0.095, Math.round(x * 10 + z * 3)), mat, x, y + h + 0.12, z, { cast: true });
  };

  // 1. The terrace: two loungers in the sun, a side table between them
  for (const lz of [-5.9, -4.5]) {
    box(18.9, 0.22, lz - 0.34, 20.83, 0.27, lz - 0.30, R.black);
    box(18.9, 0.22, lz + 0.30, 20.83, 0.27, lz + 0.34, R.black);
    box(18.9, 0.22, lz - 0.34, 18.95, 0.27, lz + 0.34, R.black);
    box(20.78, 0.22, lz - 0.34, 20.83, 0.27, lz + 0.34, R.black);
    for (const [lx, zOff] of [[18.99, -0.31], [18.99, 0.31], [20.71, -0.31], [20.71, 0.31]]) box(lx - 0.025, 0, lz + zOff - 0.02, lx + 0.025, 0.22, lz + zOff + 0.02, R.black);
    for (let sx = 19.55; sx <= 20.75; sx += 0.075) box(sx, 0.265, lz - 0.31, sx + 0.052, 0.28, lz + 0.31, R.black);
    const backFrame = new THREE.BoxGeometry(0.68, 0.04, 0.64); backFrame.rotateZ(-0.52); put(backFrame, R.black, 19.23, 0.45, lz);
    rbox(1.22, 0.075, 0.62, 0.2, R.linen, 20.17, 0.31, lz);
    rbox(0.64, 0.075, 0.62, 0.2, R.linen, 19.26, 0.49, lz, 0, 0, -0.52);
    rbox(0.16, 0.14, 0.46, 0.35, lz < -5.2 ? R.redC : R.greyC, 19.13, 0.61, lz, 0, 0, -0.52);
  }
  put(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 28), R.stone, 19.5, 0.36, -5.2);
  put(new THREE.CylinderGeometry(0.16, 0.19, 0.34, 20), R.black, 19.5, 0.17, -5.2);
  lathe([[0, 0], [0.045, 0], [0.055, 0.09], [0.045, 0.09], [0, 0.01]], 18, R.ceramic, 19.47, 0.375, -5.23);
  box(19.43, 0.375, -5.13, 19.61, 0.40, -4.99, R.book0);

  // 2. The living room, under the void
  // floor lamp by the sideboard
  put(new THREE.CylinderGeometry(0.014, 0.014, 1.52, 10), R.chrome, 14.82, 0.76, 2.4);
  put(new THREE.CylinderGeometry(0.16, 0.26, 0.32, 28, 1, true), R.shade, 14.82, 1.55, 2.4, { cast: false });
  put(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24), R.steel, 14.82, 0.01, 2.4);
  lights.push([14.82, 1.45, 2.3, 4.0, REACH]);
  // cushions on the sofa, a red throw over its arm
  rbox(0.62, 0.5, 0.18, 0.35, R.linen, 13.5, 0.78, -1.6, 0, -0.25);
  rbox(0.58, 0.48, 0.18, 0.35, R.redC, 14.15, 0.77, -1.58, 0.12, -0.28);
  rbox(0.6, 0.5, 0.18, 0.35, R.greyC, 14.95, 0.78, -1.6, -0.08, -0.25);
  rbox(0.5, 0.42, 0.16, 0.35, R.coalC, 15.38, 0.74, -1.56, 0.2, -0.3);
  rbox(0.4, 0.06, 0.7, 0.25, R.redC, 15.68, 0.645, -1.44);
  rbox(0.1, 0.36, 0.5, 0.25, R.redC, 15.82, 0.47, -1.46);
  // the red leather lounge chair, turned to the sofa
  {
    const cx = 15.5, cz = 1.25, ry = 0.66;
    const lpart = (geo, mat) => { geo.rotateY(ry); put(geo, mat, cx, 0, cz); };
    for (const sx of [-0.36, 0.36]) {
      const legF = new THREE.BoxGeometry(0.035, 0.38, 0.045); legF.rotateX(0.14); legF.translate(sx, 0.19, -0.26); lpart(legF, R.black);
      const legB = new THREE.BoxGeometry(0.035, 0.42, 0.045); legB.rotateX(-0.22); legB.translate(sx, 0.20, 0.26); lpart(legB, R.black);
      const arm = new THREE.BoxGeometry(0.055, 0.032, 0.58); arm.rotateX(-0.06); arm.translate(sx, 0.52, 0.02); lpart(arm, R.black);
    }
    const shell = new THREE.BoxGeometry(0.74, 0.04, 0.62); shell.rotateX(-0.12); shell.translate(0, 0.34, 0); lpart(shell, R.black);
    const seatC = new THREE.BoxGeometry(0.68, 0.11, 0.58, 4, 3, 4); seatC.rotateX(-0.12); seatC.translate(0, 0.41, -0.02); lpart(seatC, R.leather);
    const backC = new THREE.BoxGeometry(0.68, 0.48, 0.11, 4, 4, 3); backC.rotateX(-0.34); backC.translate(0, 0.64, 0.24); lpart(backC, R.leather);
    const headC = new THREE.BoxGeometry(0.52, 0.14, 0.08, 4, 2, 2); headC.rotateX(-0.28); headC.translate(0, 0.88, 0.32); lpart(headC, R.leather);
  }
  put(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32), R.stone, 14.75, 0.55, 1.45);
  put(new THREE.CylinderGeometry(0.02, 0.02, 0.54, 8), R.chrome, 14.75, 0.27, 1.45);
  // on the low table: monographs, a bowl, maple twigs in a white vessel
  box(13.82, 0.36, -0.62, 14.27, 0.41, -0.27, R.book2); box(13.85, 0.41, -0.59, 14.22, 0.45, -0.29, R.book4); box(13.88, 0.45, -0.57, 14.19, 0.48, -0.32, R.book0);
  lathe([[0, 0], [0.12, 0.005], [0.18, 0.06], [0.2, 0.09], [0.185, 0.09], [0.165, 0.05], [0, 0.04]], 32, R.charcoal, 14.86, 0.36, -0.3);
  lathe([[0, 0], [0.07, 0], [0.1, 0.08], [0.09, 0.22], [0.045, 0.32], [0.05, 0.36], [0.04, 0.36], [0, 0.34]], 28, R.ceramic, 14.56, 0.36, -0.52);
  for (let i = 0; i < 6; i++) {
    const L = 0.6 + rnd() * 0.35, a = i * 1.05, t = 0.18 + rnd() * 0.12;
    const b = new THREE.CylinderGeometry(0.004, 0.006, L, 5); b.translate(0, L / 2, 0); b.rotateZ(Math.cos(a) * t); b.rotateX(Math.sin(a) * t); put(b, R.bark, 14.56, 0.68, -0.52);
    for (let k = 0; k < 7; k++) {
      const lf = new THREE.SphereGeometry(0.032, 6, 4); lf.scale(0.8, 0.32, 1.65);
      const h = L * (0.4 + k * 0.08);
      put(lf, R.maple, 14.56 + Math.sin(Math.cos(a) * t) * -h + (rnd() - 0.5) * 0.05, 0.68 + h, -0.52 + Math.sin(Math.sin(a) * t) * h + (rnd() - 0.5) * 0.05, { cast: false });
    }
  }
  // on the sideboard: two vessels and books
  lathe([[0, 0], [0.09, 0], [0.13, 0.12], [0.12, 0.3], [0.06, 0.42], [0.065, 0.48], [0, 0.48]], 28, R.ceramic, 13.3, 0.53, 2.47);
  lathe([[0, 0], [0.07, 0], [0.11, 0.1], [0.09, 0.2], [0.05, 0.24], [0, 0.24]], 28, R.charcoal, 13.62, 0.53, 2.5);
  box(13.95, 0.53, 2.32, 14.4, 0.59, 2.64, R.book1); box(13.99, 0.59, 2.34, 14.35, 0.64, 2.62, R.book2);
  // the painting, on the gallery wall where the tall glass shows it to the garden
  box(11.75, 3.5, -1.33, 11.79, 5.6, 1.83, R.charcoal);
  put(new THREE.PlaneGeometry(3.04, 1.99).rotateY(Math.PI / 2), R.art, 11.795, 4.55, 0.25, { cast: false });
  // the door to the rooms behind it
  box(11.75, L1, 1.95, 11.772, 5.25, 2.62, R.black); box(11.772, L1 + 1.0, 2.0, 11.8, L1 + 1.04, 2.14, R.chrome);
  // a tree in a pot in the corner of the glass, a fig by the stair
  plant(16.2, 0, 2.2, 0.36, 1.9, [[0, 0, 0, 0.56, 0.46, 0.54, 220], [0.18, 0.28, 0.08, 0.42, 0.36, 0.4, 130]], R.leaf, R.conc);
  lathe([[0, 0], [0.22, 0], [0.26, 0.5], [0.24, 0.52], [0, 0.48]], 32, R.charcoal, 11.0, 0, 1.15);
  put(gnarledBranch(V(0, 0.4, 0), V(-0.05, 1.1, 0.04), V(0.04, 1.95, -0.03), 0.032, 0.014, 7, 7), R.bark, 11.0, 0, 1.15);
  put(gnarledBranch(V(-0.02, 1.0, 0.02), V(0.16, 1.45, 0.14), V(0.24, 1.8, 0.2), 0.02, 0.01, 5, 6), R.bark, 11.0, 0, 1.15);
  for (let i = 0; i < 42; i++) {
    const wL = 0.14 + rnd() * 0.07, hL = wL * 1.45;
    const lf = new THREE.PlaneGeometry(wL, hL, 3, 5);
    const pos = lf.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const lx = pos.getX(k), ly = pos.getY(k) + hL * 0.5;
      const u = ly / hL;
      const violin = Math.sin(u * Math.PI) * (0.82 + 0.24 * Math.sin(u * Math.PI * 2.5));
      const cup = Math.abs(lx / (wL * 0.5)) * 0.022 - u * u * 0.055;
      pos.setXYZ(k, lx * violin, ly, cup);
    }
    lf.computeVertexNormals();
    const a = i * 2.399 + (rnd() - 0.5) * 0.25, r = 0.08 + Math.sqrt(i / 42) * 0.36, y = 0.95 + (i / 42) * 1.32;
    lf.rotateX(0.55 + rnd() * 0.55); lf.rotateY(a + Math.PI * 0.5);
    put(lf, R.leafDS, 11.0 + Math.cos(a) * r, y, 1.15 + Math.sin(a) * r, { cast: true });
  }

  // 3. Dining, under the study: six chairs, three pendants, a painting on the west wall, sheer curtains by the glass
  box(12.25, 0, -5.95, 16.05, 0.012, -3.05, R.rugD, { cast: false });
  for (const cx of [13.25, 14.15, 15.05]) {
    addChair(cx, 0, -5.41, Math.PI + (rnd() - 0.5) * 0.08, R.linen);
    addChair(cx, 0, -3.59, (rnd() - 0.5) * 0.08, R.linen);
    put(new THREE.CylinderGeometry(0.004, 0.004, 0.84, 6), R.steel, cx, 2.38, -4.5, { cast: false });
    put(new THREE.CylinderGeometry(0.03, 0.04, 0.05, 12), R.chrome, cx, 1.95, -4.5, { cast: false });
    put(new THREE.SphereGeometry(0.13, 22, 14), R.shade, cx, 1.81, -4.5, { cast: false });
  }
  lights.push([14.15, 1.62, -4.5, 3.0, REACH]);
  lathe([[0, 0], [0.14, 0.005], [0.22, 0.05], [0.2, 0.06], [0, 0.02]], 28, R.stone, 13.9, 0.77, -4.52);
  lathe([[0, 0], [0.05, 0], [0.075, 0.12], [0.04, 0.24], [0, 0.24]], 22, R.charcoal, 14.5, 0.77, -4.42);
  box(12.65, 0.75, -6.7, 14.15, 2.69, -6.66, R.charcoal);
  put(new THREE.PlaneGeometry(1.41, 1.86), R.art2, 13.4, 1.72, -6.655, { cast: false });
  for (const [cz, y0] of [[-6.62, 0], [-2.72, 0], [-6.62, L1]]) {
    for (let f = 0; f < 5; f++) {
      const dr = new THREE.CylinderGeometry(0.045, 0.055, 2.72, 10, 1, true, 0, Math.PI);
      dr.rotateY(f % 2 ? 0.3 : -0.3);
      put(dr, R.curtain, 16.64 - (f % 2) * 0.03, y0 + 1.38, cz + f * 0.07, { cast: false });
    }
  }

  // 4. The kitchen: stools at the island, two pendants over it, things on the counters
  for (const cx of [8.2, 9.0, 9.8]) {
    put(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 24), R.linen, cx, 0.68, -3.62);
    put(new THREE.CylinderGeometry(0.015, 0.015, 0.66, 8), R.chrome, cx, 0.33, -3.62);
    put(new THREE.TorusGeometry(0.15, 0.008, 8, 24).rotateX(Math.PI / 2), R.chrome, cx, 0.24, -3.62);
  }
  for (const cx of [8.3, 9.7]) {
    put(new THREE.CylinderGeometry(0.004, 0.004, 0.8, 6), R.steel, cx, 2.4, -4.42, { cast: false });
    put(new THREE.CylinderGeometry(0.11, 0.16, 0.2, 24, 1, true), R.shade, cx, 1.92, -4.42, { cast: false });
  }
  lights.push([9.0, 1.7, -4.42, 3.2, REACH]);
  box(7.8, 0.94, -4.75, 8.15, 1.02, -4.4, R.book2);
  lathe([[0, 0], [0.12, 0], [0.16, 0.05], [0, 0.04]], 24, R.ceramic, 9.9, 0.94, -4.3);
  lathe([[0, 0], [0.06, 0], [0.085, 0.1], [0.06, 0.22], [0.03, 0.26], [0, 0.26]], 22, R.charcoal, 6.6, 0.94, -6.36);
  box(9.6, 0.94, -6.5, 10.3, 0.98, -6.2, R.black);
  // the handrail up the stair wall
  {
    const rail = new THREE.CylinderGeometry(0.018, 0.018, 5.72, 10);
    rail.rotateZ(-Math.atan2(4.8, L1));
    put(rail, R.black, 8.1, 2.45, 2.62);
    for (let i = 0; i < 4; i++) { const f = (i + 0.5) / 4, bx = 5.7 + f * 4.8, by = f * L1 + 0.9; box(bx - 0.015, by - 0.045, 2.61, bx + 0.015, by - 0.015, 2.7, R.chrome); }
  }

  // 5. The study (+3.10): pinboard, reading corner, and on the desk the model again
  box(12.7, 3.95, -6.7, 16.25, 4.9, -6.67, R.board);
  [['section', false], ['plan', true], ['elev', false], ['upper', false]].forEach(([kind, trace], i) => {
    const m = sheetMaterial(kind, trace, 'house');
    const w = 0.84 + (i % 2) * 0.12; const sh = new THREE.PlaneGeometry(w, w / 1.414); sh.rotateZ((rnd() - 0.5) * 0.04);
    put(sh, m, 13.2 + i * 0.86, 4.42 + (i % 2) * 0.05, -6.662, { cast: false });
    for (const dx of [-w * 0.42, w * 0.42]) put(new THREE.SphereGeometry(0.012, 8, 6), R.red, 13.2 + i * 0.86 + dx, 4.42 + (i % 2) * 0.05 + w / 2.828 - 0.03, -6.658, { cast: false });
  });
  // a basket of rolled drawings by the bookcase
  const bx = 12.08, bz = -2.92;
  lathe([[0, 0], [0.17, 0], [0.19, 0.46], [0.18, 0.46], [0.16, 0.02], [0, 0.02]], 28, R.basket, bx, L1, bz);
  for (let i = 0; i < 6; i++) {
    const L = 0.68 + rnd() * 0.26, a = i * 1.08, r = 0.026 + (i % 2) * 0.006;
    const tx = (rnd() - 0.5) * 0.18, tz = (rnd() - 0.5) * 0.18;
    const outer = new THREE.CylinderGeometry(r, r, L, 16, 1, true);
    const inner = new THREE.CylinderGeometry(r * 0.72, r * 0.72, L * 1.01, 14, 1, true);
    const band = new THREE.CylinderGeometry(r * 1.03, r * 1.03, 0.018, 16, 1, true);
    for (const gRoll of [outer, inner, band]) { gRoll.rotateZ(tx); gRoll.rotateX(tz); }
    const matRoll = i % 2 === 0 ? R.trace : R.linen;
    const rx = bx + Math.cos(a) * 0.075, ry = L1 + 0.04 + L / 2, rz = bz + Math.sin(a) * 0.075;
    put(outer, matRoll, rx, ry, rz);
    put(inner, matRoll, rx, ry, rz);
    put(band, R.red, rx, ry, rz);
  }
  // a tree in a pot by the balustrade, a chair to read in by the balcony glass, its lamp
  plant(16.3, L1, -3.7, 0.2, 1.05, [[0, 0, 0, 0.4, 0.5, 0.4, 140]], R.leaf, R.ceramic);
  rbox(0.82, 0.42, 0.84, 0.18, R.linen, 15.95, L1 + 0.21, -6.0);
  rbox(0.82, 0.54, 0.22, 0.22, R.linen, 15.95, L1 + 0.68, -6.32, 0, 0.12);
  rbox(0.14, 0.26, 0.82, 0.2, R.linen, 15.59, L1 + 0.52, -6.0);
  rbox(0.14, 0.26, 0.82, 0.2, R.linen, 16.31, L1 + 0.52, -6.0);
  rbox(0.48, 0.38, 0.15, 0.35, R.redC, 15.95, L1 + 0.62, -6.14, 0, 0.2);
  put(new THREE.CylinderGeometry(0.012, 0.012, 1.45, 8), R.chrome, 16.5, L1 + 0.72, -5.3);
  put(new THREE.CylinderGeometry(0.13, 0.2, 0.26, 24, 1, true), R.shade, 16.5, L1 + 1.5, -5.3, { cast: false });
  lights.push([16.4, L1 + 1.42, -5.35, 2.0, REACH]);
  // the desk: a rug, the chair pushed aside so the view to the model is open
  box(12.6, L1, -6.05, 16.0, L1 + 0.01, -3.55, R.rug, { cast: false });
  addChair(13.62, L1, -4.2, -0.42, R.leather);

  // the lamp on the model's own desk is switched on
  if (Mcard.bulb) { Mcard.bulb.emissiveIntensity = 0.42; }
  if (Mcard.lampInner) { Mcard.lampInner.emissiveIntensity = 0.2; }
  if (Mcard.lampRim) { Mcard.lampRim.emissiveIntensity = 0.4; }

  // the desk set: mat, model, lamp, rule and pencil, built round the middle of the mat and then turned to face the room
  const desk = new THREE.Group();
  const DT = 3.87;
  desk.position.set(14.25, DT, -5.1); desk.rotation.y = -1.16;
  const mat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.003, 0.5), Mcard.mat);
  mat.position.set(0, 0.0015, 0);
  desk.add(mat);
  const miniRule = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.0012, 0.028), Mcard.rule || R.steel);
  miniRule.position.set(0.04, 0.0036, 0.3); miniRule.rotation.y = 0.05;
  desk.add(miniRule);
  const miniPencil = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.17, 6).rotateZ(Math.PI / 2), R.red);
  miniPencil.position.set(0.42, 0.004, 0.16); miniPencil.rotation.y = -0.38;
  desk.add(miniPencil);
  const miniScale = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.26, 3).rotateZ(Math.PI / 2), R.white);
  miniScale.position.set(-0.44, 0.006, 0.2); miniScale.rotation.y = 0.24;
  desk.add(miniScale);

  const tiny = new THREE.Group(), TD = QL.low ? 0.34 : 0.5; // a model 54 cm wide: a third of the outline points is plenty
  tiny.add(cardHouse(Mcard));
  for (const l of contourLayers(Mcard)) tiny.add(l);
  for (const tr of modelTrees(Mcard, TD)) tiny.add(tr);
  for (const fg of modelFigures(Mcard, 0.5)) tiny.add(fg);
  tiny.scale.setScalar(0.01);
  tiny.position.set(-0.13, 0.003 - MAT_TOP * 0.01, 0.03);
  desk.add(tiny);

  const lamp = buildLamp(Mcard, LAMP, 0.5).group;
  const lampRot = Math.PI + 0.5, lampAt = V(-0.34, 0, -0.3); // where its base stands, and how it is turned to reach over the model
  lamp.scale.setScalar(0.01);
  lamp.rotation.y = lampRot;
  const off = V(LAMP.base.x * 0.01, 0, LAMP.base.z * 0.01).applyAxisAngle(V(0, 1, 0), lampRot);
  lamp.position.set(lampAt.x - off.x, -DESK_TOP * 0.01, lampAt.z - off.z);
  desk.add(lamp);
  desk.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  desk.updateMatrixWorld(true);
  const lampHeadW = lamp.localToWorld(LAMP.head.clone().addScaledVector(LAMP.aimAt.clone().sub(LAMP.head).normalize(), 17));
  // its light sits a hand's breadth below the shade: inside it, the white lining would burn out
  const head = lampHeadW;
  lights.push([head.x, head.y, head.z, 0.8, 2.5]);
  mergeStatic(desk);
  for (const c of [...desk.children]) if (!c.isMesh) desk.remove(c);

  // everything but the desk is static: one mesh per material
  const byMat = new Map();
  for (const m of [...g.children]) {
    if (!m.isMesh) continue;
    m.updateMatrix();
    const geo = m.geometry.clone().applyMatrix4(m.matrix);
    const q = geo.index ? geo.toNonIndexed() : geo;
    if (!q.attributes.uv) q.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(q.attributes.position.count * 2), 2));
    if (m.material.vertexColors && !q.attributes.color) {
      const cols = new Float32Array(q.attributes.position.count * 3).fill(1);
      q.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    }
    for (const a of Object.keys(q.attributes)) {
      if (!['position', 'normal', 'uv', ...(m.material.vertexColors ? ['color'] : [])].includes(a)) q.deleteAttribute(a);
    }
    const k = m.material.uuid;
    if (!byMat.has(k)) byMat.set(k, { mat: m.material, list: [], cast: m.castShadow });
    byMat.get(k).list.push(q);
    g.remove(m);
  }
  for (const { mat: mMat, list, cast } of byMat.values()) {
    const m = new THREE.Mesh(mergeGeometries(list), mMat);
    m.castShadow = cast; m.receiveShadow = true;
    g.add(m);
  }
  g.add(desk);
  g.userData.lights = lights;
  return g;
}

// ---------------------------------------------------------------- trees and grass tufts
// Smooth curved tubular branch along a quadratic Bezier curve with natural taper
function gnarledBranch(p0, p1, p2, r0, r1, segs = 7, radSegs = 7) {
  const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
  const pts = curve.getPoints(segs), frames = curve.computeFrenetFrames(segs, false);
  const pos = [], norm = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const v = i / segs, r = lerp(r0, r1, Math.pow(v, 0.85));
    const P = pts[i], N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radSegs; j++) {
      const u = j / radSegs, a = u * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const nx = N.x * ca + B.x * sa, ny = N.y * ca + B.y * sa, nz = N.z * ca + B.z * sa;
      const flute = 1 + 0.08 * Math.sin(a * 3 + v * 5);
      pos.push(P.x + nx * r * flute, P.y + ny * r * flute, P.z + nz * r * flute);
      norm.push(nx, ny, nz);
      uv.push(u, v * 2.5);
    }
  }
  const stride = radSegs + 1;
  for (let i = 0; i < segs; i++) for (let j = 0; j < radSegs; j++) {
    const a = i * stride + j, b = a + 1, c = a + stride, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g.toNonIndexed();
}

// Botanical foliage canopy with smooth leaf-cluster geometry, outward-blended crown normals, and vertex-color crown AO
// The sprig is the unit of cost: 36 triangles on a desktop, 20 on a tablet, 8 on a phone (a few less of them, each a little larger).
// The crown's normals point outwards as a whole, so it shades as one cloud at every level.
const SPRIG = [[4, 2, 0.8, 1.15], [5, 3, 0.9, 1.06], [6, 4, 1, 1]];
export function canopy(clusters, s0, s1, seed = 1) {
  const list = [], r = makeRnd(9000 + seed * 131);
  const [sw, sh, nK, sK] = SPRIG[QL.lod ?? 2];
  const baseSprig = new THREE.SphereGeometry(1, sw, sh).toNonIndexed();
  const bPos = baseSprig.attributes.position, bNorm = baseSprig.attributes.normal;
  // sculpt base sprig into a ruffled 3-lobed botanical leaf cluster
  for (let i = 0; i < bPos.count; i++) {
    const vx = bPos.getX(i), vy = bPos.getY(i), vz = bPos.getZ(i);
    const ang = Math.atan2(vz, vx);
    const lobe = 0.86 + 0.22 * Math.cos(ang * 3);
    bPos.setXYZ(i, vx * lobe, vy * 0.56, vz * lobe);
  }
  baseSprig.computeVertexNormals();
  const nVerts = bPos.count;

  for (const [cx, cy, cz, rx, ry, rz, n] of clusters) {
    const count = Math.max(14, Math.round(n * 0.62 * nK));
    for (let i = 0; i < count; i++) {
      let x, y, z;
      do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1; } while (x * x + y * y + z * z > 1);
      // bias slightly toward the outer shell of the sub-crown for a crisp botanical silhouette
      const d = Math.hypot(x, y, z) || 1;
      const shell = lerp(0.52 + 0.48 * Math.cbrt(r()), 0.82 + 0.18 * r(), 0.55) / d;
      const lx = x * shell * rx, ly = y * shell * ry, lz = z * shell * rz;
      const px = cx + lx, py = cy + ly, pz = cz + lz;
      const sc = (s0 + r() * (s1 - s0)) * 1.18 * sK;

      const g = baseSprig.clone();
      g.scale(sc * (0.9 + 0.25 * r()), sc * (0.85 + 0.25 * r()), sc * (0.9 + 0.25 * r()));
      g.rotateX((r() - 0.5) * 1.3);
      g.rotateY(r() * Math.PI * 2);
      g.rotateZ((r() - 0.5) * 1.3);
      g.translate(px, py, pz);

      // blend normals 68% toward outward sub-crown vector so the canopy reads as a lush botanical cloud, not individual balls
      const gp = g.attributes.position, gn = g.attributes.normal;
      const cols = new Float32Array(nVerts * 3);
      const shadeVar = 0.9 + 0.2 * r();
      for (let v = 0; v < nVerts; v++) {
        const vx = gp.getX(v), vy = gp.getY(v), vz = gp.getZ(v);
        let ox = (vx - cx) / Math.max(0.2, rx), oy = (vy - cy) / Math.max(0.2, ry) + 0.25, oz = (vz - cz) / Math.max(0.2, rz);
        const ol = Math.hypot(ox, oy, oz) || 1;
        ox /= ol; oy /= ol; oz /= ol;
        const nx = lerp(gn.getX(v), ox, 0.68), ny = lerp(gn.getY(v), oy, 0.68), nz = lerp(gn.getZ(v), oz, 0.68);
        const nl = Math.hypot(nx, ny, nz) || 1;
        gn.setXYZ(v, nx / nl, ny / nl, nz / nl);

        // hemispherical crown ambient occlusion + sunlit crown top warmth
        const hNorm = clamp((vy - (cy - ry)) / Math.max(0.3, ry * 2), 0, 1);
        const radNorm = clamp(Math.hypot((vx - cx) / rx, (vy - cy) / ry, (vz - cz) / rz), 0, 1.2);
        const ao = (0.48 + 0.52 * hNorm) * (0.72 + 0.28 * radNorm) * shadeVar;
        cols[v * 3] = ao * (0.96 + 0.08 * hNorm);
        cols[v * 3 + 1] = ao;
        cols[v * 3 + 2] = ao * (0.94 - 0.04 * hNorm);
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      list.push(g);
    }
  }
  return mergeGeometries(list);
}

function treeParts(kind, x, y, z, k, out, seed = 1) {
  const T = (geo, key) => { geo.translate(x, y, z); out[key].push(geo); };
  if (kind === 'poplar') {
    // a poplar: a tall, narrow flame built from tiered upward plumes
    const tiers = [
      [0, 2.1, 0, 0.56, 1.2, 0.56, Math.round(110 * k)],
      [0, 3.8, 0, 0.66, 1.5, 0.66, Math.round(140 * k)],
      [0, 5.5, 0, 0.54, 1.4, 0.54, Math.round(120 * k)],
      [0, 6.9, 0, 0.34, 1.05, 0.34, Math.round(80 * k)],
      [0, 7.8, 0, 0.16, 0.6, 0.16, Math.round(40 * k)],
    ];
    const c = canopy(tiers, 0.11 / Math.sqrt(k), 0.19 / Math.sqrt(k), seed);
    T(c, 'leafDark');
    T(gnarledBranch(V(0, -0.1, 0), V(0.03, 1.3, -0.02), V(0, 3.0, 0), 0.15, 0.07, 6, 7), 'bark');
    return;
  }
  const olive = kind === 'maple'; // (the wide, low crown: here the maple, the only colour in the garden)
  // a trunk and its boughs
  const lean = olive ? (rnd() - 0.3) * 0.28 : (rnd() - 0.5) * 0.12;
  const topX = lean * 1.4, topY = olive ? 1.85 : 2.15, topZ = (rnd() - 0.5) * 0.24;
  T(gnarledBranch(V(0, -0.12, 0), V(lean * 0.6, topY * 0.52, topZ * 0.5), V(topX, topY, topZ), olive ? 0.23 : 0.21, olive ? 0.12 : 0.13, 7, 8), 'bark');

  const boughs = olive
    ? [
        [V(topX, topY - 0.15, topZ), V(topX - 0.45, topY + 0.55, topZ + 0.1), V(-0.65, 2.85, 0.15), 0.095, 0.042],
        [V(topX, topY - 0.1, topZ), V(topX + 0.5, topY + 0.6, topZ + 0.2), V(0.92, 3.15, 0.32), 0.088, 0.038],
        [V(topX, topY - 0.08, topZ), V(topX - 0.12, topY + 0.75, topZ - 0.32), V(-0.22, 3.45, -0.45), 0.082, 0.035],
        [V(topX - 0.3, topY + 0.4, topZ + 0.08), V(-0.85, 2.75, -0.25), V(-1.15, 3.05, -0.38), 0.052, 0.022],
      ]
    : [
        [V(topX, topY - 0.15, topZ), V(topX - 0.4, topY + 0.7, topZ + 0.25), V(-0.6, 3.35, 0.4), 0.095, 0.042],
        [V(topX, topY - 0.1, topZ), V(topX + 0.42, topY + 0.85, topZ + 0.2), V(0.65, 3.95, 0.32), 0.09, 0.04],
        [V(topX, topY - 0.12, topZ), V(topX + 0.05, topY + 0.75, topZ - 0.45), V(0.1, 3.55, -0.65), 0.082, 0.036],
      ];
  for (const [p0, p1, p2, r0, r1] of boughs) T(gnarledBranch(p0, p1, p2, r0, r1, 6, 6), 'bark');

  const cl = olive
    ? [
        [-0.55, 2.95, 0.08, 1.55, 0.78, 1.38, 280],
        [0.88, 3.3, 0.3, 1.15, 0.66, 1.05, 190],
        [-0.22, 3.68, -0.42, 1.08, 0.58, 1.02, 160],
        [-1.1, 3.12, -0.32, 0.78, 0.48, 0.75, 95],
      ]
    : [
        [-0.35, 3.45, 0.2, 1.45, 1.25, 1.38, 280],
        [0.55, 4.25, 0.28, 1.18, 0.95, 1.12, 210],
        [0.08, 3.65, -0.48, 1.22, 1.05, 1.15, 180],
      ];
  const c = canopy(cl.map((q) => [...q.slice(0, 6), Math.round(q[6] * k)]), (olive ? 0.1 : 0.12) / Math.sqrt(k), (olive ? 0.17 : 0.21) / Math.sqrt(k), seed);
  T(c, olive ? 'maple' : 'leaf');
}

// grass tufts on the garden slope and round the trees
function buildMeadowTufts(outAt) {
  const bladeBase = new THREE.PlaneGeometry(0.055, 0.38, 1, 3).toNonIndexed();
  const bp = bladeBase.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const y = bp.getY(i) + 0.19, u = y / 0.38;
    bp.setXYZ(i, bp.getX(i) * (1 - u * 0.82), y, u * u * 0.11);
  }
  bladeBase.computeVertexNormals();
  const nV = bp.count;

  // place tufts around the foreground slope, scale figure spot, terrace edges, and close tree bases
  const spots = [];
  for (let i = 0; i < 165; i++) {
    const x = 21.6 + rnd() * 19, z = -11 + rnd() * 23;
    // keep the garden steps and the place where the figure stands clear
    if (x < STEPS.x0 + STEPS.n * STEPS.run + 2.6 && z > STEPS.z0 - 0.5 && z < STEPS.z1 + 0.5) continue;
    spots.push([x, z, 0.75 + rnd() * 0.65]);
  }
  for (const [ , tx, tz] of treeSpots()) {
    if (tx > 15 && tx < 42 && Math.abs(tz) < 16) {
      for (let k = 0; k < 5; k++) {
        const a = rnd() * Math.PI * 2, rad = 0.25 + rnd() * 0.9;
        spots.push([tx + Math.cos(a) * rad, tz + Math.sin(a) * rad, 0.8 + rnd() * 0.5]);
      }
    }
  }
  for (const [tx, tz, sc] of spots) {
    const ty = landAt(tx, tz);
    const blades = 5 + Math.floor(rnd() * 4);
    const useDark = rnd() < 0.45;
    for (let b = 0; b < blades; b++) {
      const g = bladeBase.clone();
      const hSc = sc * (0.7 + rnd() * 0.55);
      g.scale(sc, hSc, sc);
      g.rotateX(0.18 + rnd() * 0.35);
      g.rotateY((b / blades) * Math.PI * 2 + rnd() * 0.4);
      g.translate(tx + (rnd() - 0.5) * 0.14, ty - 0.03, tz + (rnd() - 0.5) * 0.14);
      const cols = new Float32Array(nV * 3);
      const gp = g.attributes.position, gn = g.attributes.normal;
      for (let v = 0; v < nV; v++) {
        const u = clamp((gp.getY(v) - ty) / (0.38 * hSc), 0, 1);
        const ao = 0.52 + 0.52 * u;
        cols[v * 3] = ao * (0.95 + 0.12 * u);
        cols[v * 3 + 1] = ao;
        cols[v * 3 + 2] = ao * (0.85 - 0.08 * u);
        gn.setXYZ(v, 0, 0.92, 0.38);
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      outAt(tx, tz)[useDark ? 'leafDark' : 'leaf'].push(g);
    }
  }
}

// The trees are cut into five groups by where they stand, so the ones behind the camera are not drawn at all:
// from the living room only the garden to the south and east is in the picture, not the poplars behind the house.
const chunkOf = (x, z) => (x > 20 ? (z < 0 ? 'en' : 'es') : x < 0 ? (z < -10 ? 'n' : 'w') : z > 3 ? 's' : 'n');
export function realTrees(R) {
  const chunks = {};
  const outAt = (x, z) => (chunks[chunkOf(x, z)] ||= { leafDark: [], leaf: [], maple: [], bark: [] });
  // the twins of the card trees, where they stood on the model
  treeSpots().forEach(([kind, x, z], i) => treeParts(kind, x, landAt(x, z), z, 1, outAt(x, z), i + 1));
  // grass tufts on the slope
  buildMeadowTufts(outAt);
  // more poplars behind the house, beyond the edge of the model (still inside the scan)
  const far = [];
  for (let i = 0; i < 9; i++) far.push(['poplar', -30 - (i % 3) * 3.2, -38 + i * 4.6 + (rnd() - 0.5)]);
  for (let i = 0; i < 7; i++) far.push(['poplar', -12 + i * 3.6, -25 - (rnd() * 1.5)]);
  far.forEach(([kind, x, z], i) => treeParts(kind, x, landAt(x, z), z, 0.38, outAt(x, z), 40 + i));
  const g = new THREE.Group();
  for (const c in chunks) for (const key in chunks[c]) {
    if (!chunks[c][key].length) continue;
    const m = new THREE.Mesh(mergeGeometries(chunks[c][key]), R[key]); m.castShadow = true; m.receiveShadow = true; m.name = 'trees-' + c + '-' + key; g.add(m);
  }
  return g;
}

// ---------------------------------------------------------------- the sky
// Seen from the garden and from inside the house once the front has taken the studio away, and in every reflection.
// Colours are linear and go through the renderer's tone mapping like everything else.
export const SKY = {
  sunDir: { value: SUN_DIR },
  zen: { value: new THREE.Color(0.36, 0.42, 0.52) },   // overhead
  hor: { value: new THREE.Color(0.98, 0.96, 0.93) },   // the haze at the horizon
  sun: { value: new THREE.Color(1.35, 1.22, 1.05) },   // the horizon under the sun, and its glow
  low: { value: new THREE.Color(0.62, 0.62, 0.62) },   // below the horizon, where the land would be
};
const SKY_GLSL = `
  uniform vec3 sunDir, zen, hor, sun, low;
  vec3 skyColor(vec3 d) {
    float h = d.y;
    float sd = max(dot(d, sunDir), 0.), toward = pow(max(dot(normalize(d.xz + 1e-4), normalize(sunDir.xz)), 0.), 2.);
    vec3 col = mix(mix(hor, sun, toward * 0.6), zen, pow(clamp(h, 0., 1.), 0.46));
    col = mix(col, low, smoothstep(0.0, -0.10, h));
    col += sun * (pow(sd, 7.) * 0.22 + pow(sd, 120.) * 0.7);
    col += sun * 18. * smoothstep(0.99955, 0.9998, sd);
    return col;
  }`;
export function skyDome() {
  const mat = new THREE.ShaderMaterial({
    uniforms: SKY,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 vDir; ${SKY_GLSL}
      void main(){ gl_FragColor = vec4(skyColor(normalize(vDir)), 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 12), mat);
  m.frustumCulled = false; m.renderOrder = 1; // after everything solid, so it only fills what is left open
  return m;
}
export function skyEnv(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    uniforms: SKY, side: THREE.BackSide,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec3 vDir; ${SKY_GLSL} void main(){ vec3 c = skyColor(normalize(vDir)); gl_FragColor = vec4(min(c, vec3(4.5)), 1.); }`,
  })));
  // the ground half of the environment, for the reflections in the glass
  const gnd = new THREE.Mesh(new THREE.CircleGeometry(49, 32), new THREE.MeshBasicMaterial({ color: SKY.low.value.clone().multiplyScalar(0.45) }));
  gnd.rotation.x = -Math.PI / 2; gnd.position.y = -5; s.add(gnd);
  const gen = new THREE.PMREMGenerator(renderer), tex = gen.fromScene(s, 0.025).texture;
  gen.dispose();
  return tex;
}
