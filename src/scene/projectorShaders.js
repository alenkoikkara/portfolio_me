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
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

/*
 * The beam is only visible because of what floats in it. A fresnel term makes
 * the cone bright where it is seen edge-on and clear head-on; the scrolling
 * noise is the dust. Without the noise this reads as a solid glass wedge.
 */
const BEAM_FRAGMENT = /* glsl */ `
  uniform sampler2D uNoise;
  uniform float uTime;
  uniform float uStrength;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 2.0);
    float dust = texture2D(uNoise, vec2(vUv.x * 3.0, vUv.y * 1.5 - uTime * 0.12)).r * 0.5 + 0.5;
    // Densest at the lens, thinning as the cone widens, and gone before it
    // reaches the screen: the rim of the cone passes in front of the plane
    // from this camera, and a hard edge there would read as a seam. The throw
    // is short and the device hides the first stretch of it, so what is left
    // has to carry: the room is dark now, and additive light can afford it.
    float falloff = mix(1.0, 0.45, vUv.y) * (1.0 - smoothstep(0.25, 0.6, vUv.y));
    float alpha = fresnel * dust * falloff * 0.9 * uStrength;
    gl_FragColor = vec4(uColor * alpha, alpha);

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
      uNoise: { value: noise },
      uTime: { value: 0 },
      uStrength: { value: 0 },
      uColor: { value: new THREE.Color(0.95, 0.98, 1.0) },
    },
  })
}
