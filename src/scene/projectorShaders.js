import * as THREE from 'three'

/**
 * Small tiling noise texture, generated rather than loaded. It feeds both the
 * film grain on the preview and the airborne dust in the beam, so there is no
 * asset to ship and nothing to wait on before the projector can light up.
 *
 * @param {number} size edge length in pixels
 * @returns {THREE.DataTexture}
 */
export function makeNoiseTexture(size = 128) {
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const v = Math.floor(Math.random() * 256)
    data[i * 4] = v
    data[i * 4 + 1] = v
    data[i * 4 + 2] = v
    data[i * 4 + 3] = 255
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

const PREVIEW_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/*
 * The preview is projected light, not a lit surface, so it is shaded by hand:
 * a window onto the tall screenshot, grain scrolling fast enough to read as
 * film movement, a vignette for the soft edge of a real lens, and brightness
 * driven from the CPU so the boot flash and shutter flicker can drive it.
 */
const PREVIEW_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uNoise;
  uniform float uTime;
  uniform float uBrightness;
  uniform float uOpacity;
  uniform float uFlash;
  uniform vec2 uOffset;
  uniform vec2 uRepeat;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv * uRepeat + uOffset;
    vec3 color = texture2D(uMap, uv).rgb;

    float grain = texture2D(uNoise, vUv * 4.0 + uTime * 8.0).r;
    color *= 0.92 + grain * 0.16;

    float d = length(vUv - 0.5);
    color *= 1.0 - smoothstep(0.35, 0.7, d) * 0.4;

    color *= uBrightness;
    color = mix(color, vec3(1.0), uFlash);

    float alpha = max(uOpacity, uFlash);
    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * Material for the projected preview plane.
 * @param {THREE.Texture} noise shared grain texture
 */
export function makePreviewMaterial(noise) {
  return new THREE.ShaderMaterial({
    vertexShader: PREVIEW_VERTEX,
    fragmentShader: PREVIEW_FRAGMENT,
    transparent: true,
    // The lit plane is the nearest, brightest surface in the scene and must
    // occlude the beam arriving at it, so unlike most transparent materials
    // this one writes depth.
    depthWrite: true,
    side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: null },
      uNoise: { value: noise },
      uTime: { value: 0 },
      uBrightness: { value: 1 },
      uOpacity: { value: 0 },
      uFlash: { value: 0 },
      uOffset: { value: new THREE.Vector2(0, 0.7) },
      uRepeat: { value: new THREE.Vector2(1, 0.3) },
    },
  })
}

const BEAM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vLen;        // 0 = lens tip, 1 = screen end
  void main() {
    vUv = uv;
    // The cylinder is built along its local Y axis; vLen tracks progress along it.
    vLen = uv.y;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

/*
 * Realistic projector beam:
 *  - Layered dust: two octaves of scrolling noise at different scales/speeds
 *    so the motes in the air move naturally rather than in lockstep.
 *  - Fresnel: cubic falloff so the cone is bright only at the silhouette
 *    and invisible head-on, matching real volumetric light.
 *  - Radial gradient: cone is brightest near the central axis (the focal ray)
 *    and dims toward the edges, like a real lens' intensity profile.
 *  - Length falloff: bright near the lens (where the beam is densest),
 *    fading smoothly before it reaches the screen so there is no hard seam.
 *  - Color: warm-white near the lens, slightly cooler at the far end,
 *    matching the colour temperature of a real projector bulb.
 */
const BEAM_FRAGMENT = /* glsl */ `
  uniform sampler2D uNoise;
  uniform float uTime;
  uniform float uStrength;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vLen;

  void main() {
    // ── Fresnel ──────────────────────────────────────────────────────────
    // Cubic fall-off: nearly invisible head-on, bright at the silhouette.
    float nv   = abs(dot(normalize(vNormal), normalize(vViewDir)));
    float fresnel = pow(1.0 - nv, 3.0);

    // ── Radial density ──────────────────────────────────────────────────
    // vUv.x runs 0→1 around the cylinder. Map to -1…+1 to get distance
    // from the central axis as seen on the surface.
    float radial = 1.0 - pow(abs(vUv.x * 2.0 - 1.0), 0.6);

    // ── Layered dust ────────────────────────────────────────────────────
    // Two octaves at different tiling & scroll speeds so motes move naturally.
    vec2 uv1 = vec2(vUv.x * 4.0, vLen * 2.0 - uTime * 0.09);
    vec2 uv2 = vec2(vUv.x * 7.0 + 0.3, vLen * 3.5 + uTime * 0.05);
    float d1 = texture2D(uNoise, uv1).r;
    float d2 = texture2D(uNoise, uv2).r;
    float dust = d1 * 0.65 + d2 * 0.35;
    // Bias toward brighter values so the beam reads as filled with light
    dust = pow(dust, 0.6);

    // ── Length falloff ───────────────────────────────────────────────────
    // Brightest near lens (vLen ≈ 0), gone well before the screen so no seam.
    float lenFalloff = (1.0 - smoothstep(0.0, 0.55, vLen))   // main fade
                     * (1.0 - smoothstep(0.55, 0.85, vLen));  // soft tail

    // Intensity just inside the lens tip (short gap of low opacity)
    float lenRise = smoothstep(0.0, 0.08, vLen);

    // ── Colour temperature ───────────────────────────────────────────────
    // Warm white at the source, slightly bluer at the far end.
    vec3 nearCol = vec3(1.00, 0.97, 0.92);   // warm halogen
    vec3 farCol  = vec3(0.90, 0.95, 1.00);   // cool scatter
    vec3 beamCol = mix(nearCol, farCol, vLen * 0.6);

    // ── Compose ──────────────────────────────────────────────────────────
    float alpha = fresnel * dust * lenFalloff * lenRise * radial * uStrength;
    // Clamp so additive blending doesn't blow out in bright spots
    alpha = clamp(alpha * 1.2, 0.0, 0.55);

    gl_FragColor = vec4(beamCol * alpha, alpha);

    #include <colorspace_fragment>
  }
`

/**
 * Material for the cone of light between lens and preview plane.
 * @param {THREE.Texture} noise shared dust texture
 */
export function makeBeamMaterial(noise) {
  return new THREE.ShaderMaterial({
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {
      uNoise:    { value: noise },
      uTime:     { value: 0 },
      uStrength: { value: 0 },
    },
  })
}

