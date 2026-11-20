// The turn: one scene holds both worlds, the card model at night and the house in daylight, built from the same parts.
// A front expands from the lamp's bulb. Card draws only outside it, the real house only inside it,
// and a red line runs where the front crosses a surface (it fades out right in front of the lens, so the passage is not a red wash). So the change travels through the world, not across the screen.
//
// Each side also keeps its own light: the card is lit by the lamp, the moon and a dim fill, the house by the sun,
// the daylight sky and the lamps inside. Three.js lights are global, so every lit material scales each light's
// contribution by a per-side weight (the light loops are patched below).
// Light order this relies on: directional [sun, moon, fill] (the sun casts shadows, so three sorts it first),
// hemisphere [night, day] in the order they were added to the scene.
import * as THREE from 'three';

export const SWEEP = {
  C: { value: new THREE.Vector3() },   // centre: the lamp's bulb
  R: { value: 0 },                     // radius of the front
  W: { value: 0.20 },                  // width of the red line
  glow: { value: 0 },
  col: { value: new THREE.Color(1.55, 0.09, 0.13) },
};
const SIDE = {
  card: { dirK: { value: [0, 1, 1] }, hemiK: { value: [1, 0] }, spotK: { value: 1 }, pointK: { value: 0 } },
  real: { dirK: { value: [1, 0, 0] }, hemiK: { value: [0, 1] }, spotK: { value: 0 }, pointK: { value: 1 } },
};

const LIGHTS = THREE.ShaderChunk.lights_fragment_begin
  .replace('getPointLightInfo( pointLight, geometryPosition, directLight );', 'getPointLightInfo( pointLight, geometryPosition, directLight );\n\t\tdirectLight.color *= uPointK;')
  .replace('getSpotLightInfo( spotLight, geometryPosition, directLight );', 'getSpotLightInfo( spotLight, geometryPosition, directLight );\n\t\tdirectLight.color *= uSpotK;')
  .replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= uDirK[ i ];')
  .replace('irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );', 'irradiance += uHemiK[ i ] * getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );');

const PARS = `
varying vec3 vSweepW;
uniform vec3 uSweepC, uSweepCol;
uniform float uSweepR, uSweepW, uSweepGlow, uSweepClamp, uSeamK, uSpotK, uPointK;
#if NUM_DIR_LIGHTS > 0
uniform float uDirK[ NUM_DIR_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
uniform float uHemiK[ NUM_HEMI_LIGHTS ];
#endif
`;
// Distances beyond 66 units (outside the house and immediate garden) are compressed so the studio walls,
// giant desk props and the far land sweep in one continuous wave right after the house without leaving a black wedge.
const MAP_D = `
float rawSweepD = distance( vSweepW, uSweepC );
float compSweepD = rawSweepD < 66.0 ? rawSweepD : 66.0 + ( rawSweepD - 66.0 ) * 0.22;
compSweepD += max( 0.0, vSweepW.x - 41.5 ) * 2.5 + max( 0.0, vSweepW.z - 22.5 ) * 2.5;
float sweepD = min( compSweepD, uSweepClamp );
`;
const CUT = (side) => `
${MAP_D}
${side === 'card' ? 'if ( uSeamK > 0.0 && sweepD < uSweepR ) discard;' : 'if ( sweepD > uSweepR ) discard;'}
float dSeam = abs( sweepD - uSweepR );
// close to the lens the line is drawn fine: where the front runs nearly along a slope it would otherwise flood it
float sweepWv = uSweepW * mix( 0.22, 1.0, smoothstep( 3.0, 24.0, distance( vSweepW, cameraPosition ) ) );
float coreLine = exp( -pow( dSeam / sweepWv, 2.0 ) );
float echoLine = 0.36 * exp( -pow( ( dSeam - sweepWv * 2.6 ) / ( sweepWv * 0.75 ), 2.0 ) );
float softBand = 0.03 * exp( -pow( dSeam / ( sweepWv * 4.5 ), 2.0 ) );
float gridEnv = exp( -pow( dSeam / ( sweepWv * 24.0 ), 1.6 ) );
// height lines every 0.5 m. Not on level surfaces: a floor that lies exactly on a line would turn red all over
float sweepGy = vSweepW.y * 2.0 + 0.5;
float cY = ( 1.0 - smoothstep( 0.0, 0.06, abs( fract( sweepGy ) - 0.5 ) ) ) * smoothstep( 0.0006, 0.004, fwidth( sweepGy ) );
float cX = 1.0 - smoothstep( 0.0, 0.045, abs( fract( vSweepW.x + 0.5 ) - 0.5 ) );
float cZ = 1.0 - smoothstep( 0.0, 0.045, abs( fract( vSweepW.z + 0.5 ) - 0.5 ) );
float cadGrid = max( cY * 0.8, max( cX, cZ ) * 0.6 ) * gridEnv * ${side === 'real' ? '1.0' : '0.22'}; // the grid belongs to what has just been scanned
float sweepFade = uSweepGlow * uSeamK * smoothstep( 98.0, 72.0, compSweepD );
float sweepFar = smoothstep( 3.0, 11.0, distance( vSweepW, cameraPosition ) ); // close to the lens only the line itself is drawn
float sweepSeam = sweepFade * ( coreLine * 1.15 + ( echoLine + softBand + cadGrid ) * sweepFar );
float sweepCore = sweepFade * coreLine;
`;

// make a material belong to one side of the front ('card' or 'real'). clamp: distances beyond it count as it
export function sweepMaterial(mat, side, { clamp = 1e6, seam = 1.0, pointK = null } = {}) {
  if (mat.userData.sweep) return mat;
  mat.userData.sweep = side;
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey;
  const clampU = { value: clamp };
  const seamU = { value: mat.transparent ? seam * 0.32 : seam };
  mat.userData.sweepClamp = clampU;
  mat.userData.sweepSeam = seamU;
  mat.onBeforeCompile = (s, r) => {
    if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev.call(mat, s, r);
    const S = SIDE[side];
    Object.assign(s.uniforms, { uSweepC: SWEEP.C, uSweepR: SWEEP.R, uSweepW: SWEEP.W, uSweepGlow: SWEEP.glow, uSweepCol: SWEEP.col, uSweepClamp: clampU, uSeamK: seamU, uDirK: S.dirK, uHemiK: S.hemiK, uSpotK: S.spotK, uPointK: pointK === null ? S.pointK : { value: pointK } });
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSweepW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSweepW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PARS)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + CUT(side))
      .replace('#include <lights_fragment_begin>', LIGHTS)
      // the line is laid over the surface, not added to it: on white card an added red would only turn pink
      .replace('#include <opaque_fragment>', 'float sweepNear = smoothstep( 0.9, 3.4, length( vViewPosition ) );\nfloat sweepK = clamp( sweepSeam, 0.0, 1.0 ) * sweepNear;\noutgoingLight = mix( outgoingLight, uSweepCol * ( 0.5 + 0.5 * sweepK ), sweepK * 0.92 ) + uSweepCol * sweepCore * sweepNear * 1.6 * smoothstep( 4.0, 16.0, length( vViewPosition ) );\n#include <opaque_fragment>');
  };
  const prevK = prevKey && prevKey !== THREE.Material.prototype.customProgramCacheKey ? prevKey.bind(mat) : () => '';
  mat.customProgramCacheKey = () => prevK() + '|sweep-' + side;
  mat.needsUpdate = true;
  return mat;
}

// depth materials for the shadow maps, so each light only sees the geometry on its own side
export const DEPTH = {
  card: sweepMaterial(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), 'card'),
  real: sweepMaterial(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), 'real'),
};

// put every mesh under root on one side: its materials and its shadow
export function sweepSide(root, side, opts) {
  const list = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) sweepMaterial(m, side, opts);
    if (!o.userData.noSweepDepth) o.customDepthMaterial = DEPTH[side];
    o.userData.side = side;
    list.push(o);
  });
  return list;
}
