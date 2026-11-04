import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { sky } from '../story/sky'

/*
 * The page behind the canvas is the sky's gradient (story/sky.js), and the
 * canvas is transparent over it, so wherever it is not fully covered the glass
 * has to see the sky through it, the same as the eye does — at the height of
 * the pixel, since the sky is a gradient. Both ends are kept here as raw sRGB
 * channels, as the canvas stores them: the sample's colours are linear.
 */
const SKY_TOP = { r: 0, g: 0, b: 0 }
const SKY_BOTTOM = { r: 0, g: 0, b: 0 }
function readSky() {
  sky.sample.bgTop.getRGB(SKY_TOP, THREE.SRGBColorSpace)
  sky.sample.bgBottom.getRGB(SKY_BOTTOM, THREE.SRGBColorSpace)
}
/** The sky's sRGB channel `c` at height `t`, 0 at the bottom of the canvas and 1 at the top. */
const skyAt = (c, t) => SKY_BOTTOM[c] + (SKY_TOP[c] - SKY_BOTTOM[c]) * t

/** Room outside the pill for its shadow, in CSS px. */
const SHADOW_SPREAD = 18
/** Room outside the pill copied for the frost's taps, in CSS px. */
const COPY_MARGIN = 8
/** The copied texture grows in steps of this many device px, so a word or two more does not reallocate it. */
const TEXTURE_STEP = 64
/** How fast the glass follows the pill when its text changes width: a liquid morph rather than a snap. */
const MORPH_RATE = 14
const FADE_SECONDS = 0.3
/** Longest frame either ease will act on, so one stalled frame cannot skip it. */
const MAX_STEP = 0.1
/** How often, in frames, the content behind the pill is measured for its tone. */
const MEASURE_EVERY = 10
/*
 * The words turn white below the first average luminance and back to ink above
 * the second. The gap between them is what stops a print that sits right at
 * the boundary from flickering the words back and forth.
 */
const LIGHT_TEXT_BELOW = 0.45
const DARK_TEXT_ABOVE = 0.55
const TONE_RATE = 10

/*
 * The quad covers only the pill and its shadow, placed straight in clip space:
 * it is screen chrome, not part of the world, so it needs neither a camera nor
 * a depth.
 */
const vertexShader = /* glsl */ `
  uniform vec2 uQuadCenter;
  uniform vec2 uQuadHalf;
  void main() {
    gl_Position = vec4(uQuadCenter + position.xy * 2.0 * uQuadHalf, 0.0, 1.0);
  }
`

/*
 * Apple's Liquid Glass, in the order light goes through it. Everything is in
 * device pixels from gl_FragCoord; `uDpr` turns the authored CSS sizes into them.
 *
 *   Lens      — the pill is a slab whose edge rounds over like a dome, so
 *               what is behind is magnified toward the rim: each pixel samples
 *               from nearer the middle, by the slope of that rounded edge. Red
 *               and blue bend a little differently, for the faint fringe real
 *               glass shows. This is most of what makes it read as liquid.
 *   Clarity   — Apple's clear glass: barely a pixel of blur and a touch of
 *               saturation, so the middle of the pill is nearly see-through.
 *   Tone      — the glass stays clear and the words adapt instead, as Apple's
 *               do: each dark over light content, white over dark (see
 *               `measure` below). The glass only leans a breath the other way, white
 *               under dark words and shade under light ones.
 *   Rim       — a hairline of light along the edge, brightest where the edge
 *               faces the light (top left), with a fainter reflection on the
 *               opposite side, and a soft glow inside the rounded rim.
 *   Shadow    — outside the pill, faint and soft, a little lower than it.
 */
const fragmentShader = /* glsl */ `
  uniform sampler2D tBack;
  uniform vec2 uOrigin;
  uniform vec2 uTexSize;
  uniform vec2 uCenter;
  uniform vec2 uHalf;
  uniform float uDpr;
  uniform float uRadius;
  uniform float uOpacity;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyBottom;
  uniform float uHeight;
  uniform float uTone;

  float roundRect(vec2 p, vec2 halfSize, float r) {
    vec2 q = abs(p) - halfSize + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  // What is behind, as the eye sees it: over the sky wherever the canvas is
  // not opaque, then out of sRGB so the light can be mixed in linear.
  vec3 behind(vec2 frag) {
    vec4 c = texture2D(tBack, (frag - uOrigin) / uTexSize);
    vec3 page = mix(uSkyBottom, uSkyTop, clamp(frag.y / uHeight, 0.0, 1.0));
    vec3 encoded = c.rgb + page * (1.0 - c.a);
    return sRGBTransferEOTF(vec4(encoded, 1.0)).rgb;
  }

  vec3 frosted(vec2 frag) {
    float r = 0.8 * uDpr;
    vec3 c = behind(frag) * 0.2;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853982;
      c += behind(frag + vec2(cos(a), sin(a)) * r) * 0.1;
    }
    return c;
  }

  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  void main() {
    vec2 p = gl_FragCoord.xy;
    // A capsule unless a corner radius was asked for; never rounder than one.
    float radius = uRadius > 0.0 ? min(uRadius, uHalf.y) : uHalf.y;
    float d = roundRect(p - uCenter, uHalf, radius);
    float aa = 0.75 * uDpr;
    float coverage = 1.0 - smoothstep(-aa, aa, d);

    if (coverage <= 0.0) {
      float below = roundRect(p - uCenter + vec2(0.0, 3.0 * uDpr), uHalf, radius);
      float shadow = (1.0 - smoothstep(-2.0 * uDpr, ${SHADOW_SPREAD.toFixed(1)} * uDpr, below)) * 0.1;
      if (shadow <= 0.0) discard;
      gl_FragColor = vec4(0.0, 0.0, 0.0, shadow * uOpacity);
      #include <colorspace_fragment>
      return;
    }

    // The edge's outward normal, from the distance field's gradient.
    vec2 n = normalize(vec2(dFdx(d), dFdy(d)) + 1e-6);
    // 0 at the edge, 1 once the rounded rim has given way to the flat top.
    float bevel = radius;
    float t = clamp(-d / bevel, 0.0, 1.0);
    // The slope of a rounded rim: steepest at the edge, flat at the top.
    float slope = 1.0 - sqrt(1.0 - (1.0 - t) * (1.0 - t));
    vec2 bend = -n * slope * bevel * 1.4;

    vec3 colour = frosted(p + bend);
    if (slope > 0.02) {
      colour.r = frosted(p + bend * 1.12).r;
      colour.b = frosted(p + bend * 0.88).b;
    }

    // A little more saturated than what is behind, as Apple's glass reads.
    float l = luma(colour);
    colour = max(mix(vec3(l), colour, 1.2), 0.0);

    // The faintest tint, toward whichever side the text is not: a breath of
    // white under dark words, a breath of shade under light ones.
    colour = mix(colour, vec3(1.0), 0.08 * (1.0 - uTone));
    colour *= 1.0 - 0.14 * uTone;

    // The rim: a hairline of light just inside the edge, lit from the top left.
    vec2 light = normalize(vec2(-1.0, 1.0));
    float facing = max(dot(n, light), 0.0);
    float away = max(dot(n, -light), 0.0);
    float hairline = 1.0 - smoothstep(0.4 * uDpr, 1.8 * uDpr, -d);
    colour = mix(colour, vec3(1.0), hairline * (0.3 + 0.7 * pow(facing, 1.2) + 0.5 * pow(away, 1.2)));
    // And the glow inside the rounded rim, on the same two sides.
    float glow = pow(1.0 - t, 2.5);
    colour += vec3(glow * (0.22 * facing + 0.12 * away));
    // A faint shade along the inner edge everywhere else, which is what gives
    // the slab its thickness.
    colour *= 1.0 - 0.06 * glow * (1.0 - facing) * (1.0 - away);

    gl_FragColor = vec4(colour, uOpacity * coverage);
    #include <colorspace_fragment>
  }
`

/**
 * A pill of Apple's Liquid Glass behind a DOM element — `selector` finds it —
 * drawn in the canvas so it can bend the scene behind it, which CSS cannot:
 * `backdrop-filter` blurs, but refracts only through SVG filters that Safari
 * does not run. The element keeps its words; this draws the glass under them.
 *
 * Right before the pill draws, it copies the part of the frame already drawn
 * behind it into a small texture, and refracts that. So it sees exactly what
 * the eye does — after tone mapping and colour conversion — rather than a
 * second render of the scene that would have to be graded to match.
 *
 * `show` fades it in and out; it costs nothing at zero. `radius` (CSS px)
 * rounds its corners by that much instead, for an element taller than a line:
 * a capsule around a block of text reads as a stadium, not glass.
 */
export default function GlassPill({ selector, show, radius = 0 }) {
  const gl = useThree((s) => s.gl)

  const texture = useRef(null)
  const origin = useMemo(() => new THREE.Vector2(), [])
  const elementRef = useRef(null)
  const shape = useRef(null)
  const opacity = useRef(0)
  // 0 for ink words over light content, 1 for white words over dark: the
  // glass's lean follows the pill as a whole, the words each follow their own.
  const tone = useRef(0)
  const toneTarget = useRef(0)
  // Each word's span across the row, in device px, refreshed every frame.
  const words = useRef([])
  const frame = useRef(0)
  const row = useRef(new Uint8Array(0))

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      tBack: { value: null },
      uOrigin: { value: new THREE.Vector2() },
      uTexSize: { value: new THREE.Vector2(1, 1) },
      uCenter: { value: new THREE.Vector2() },
      uHalf: { value: new THREE.Vector2() },
      uQuadCenter: { value: new THREE.Vector2() },
      uQuadHalf: { value: new THREE.Vector2() },
      uDpr: { value: 1 },
      uRadius: { value: 0 },
      uOpacity: { value: 0 },
      // The canvas stores sRGB; the page is mixed in before decoding.
      uSkyTop: { value: new THREE.Vector3() },
      uSkyBottom: { value: new THREE.Vector3() },
      uHeight: { value: 1 },
      uTone: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }), [])

  useEffect(() => () => {
    material.dispose()
    texture.current?.dispose()
  }, [material])

  const meshRef = useRef()

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const step = Math.min(delta, MAX_STEP)
    opacity.current = show
      ? Math.min(1, opacity.current + step / FADE_SECONDS)
      : Math.max(0, opacity.current - step / FADE_SECONDS)

    if (!elementRef.current?.isConnected) elementRef.current = document.querySelector(selector)
    const el = elementRef.current
    mesh.visible = opacity.current > 0 && Boolean(el)
    if (!mesh.visible) return

    const dpr = gl.getPixelRatio()
    const canvas = gl.domElement
    const bounds = canvas.getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    // In device px, y up from the bottom, as gl_FragCoord counts.
    const target = {
      x: (rect.left - bounds.left + rect.width / 2) * dpr,
      y: canvas.height - (rect.top - bounds.top + rect.height / 2) * dpr,
      w: (rect.width / 2) * dpr,
      h: (rect.height / 2) * dpr,
    }
    if (!shape.current) shape.current = { ...target }
    const k = 1 - Math.exp(-MORPH_RATE * step)
    for (const key of ['x', 'y', 'w', 'h']) shape.current[key] += (target[key] - shape.current[key]) * k
    const s = shape.current

    tone.current += (toneTarget.current - tone.current) * (1 - Math.exp(-TONE_RATE * step))
    words.current = Array.from(el.children, (child) => {
      const r = child.getBoundingClientRect()
      return { el: child, x0: (r.left - bounds.left) * dpr, x1: (r.right - bounds.left) * dpr }
    })

    const u = material.uniforms
    readSky()
    u.uSkyTop.value.set(SKY_TOP.r, SKY_TOP.g, SKY_TOP.b)
    u.uSkyBottom.value.set(SKY_BOTTOM.r, SKY_BOTTOM.g, SKY_BOTTOM.b)
    u.uHeight.value = canvas.height
    u.uOpacity.value = opacity.current
    u.uTone.value = tone.current
    u.uDpr.value = dpr
    u.uRadius.value = radius * dpr
    u.uCenter.value.set(s.x, s.y)
    u.uHalf.value.set(s.w, s.h)
    const spread = SHADOW_SPREAD * dpr
    u.uQuadCenter.value.set((s.x / canvas.width) * 2 - 1, (s.y / canvas.height) * 2 - 1)
    // Clip space is two units across the window.
    u.uQuadHalf.value.set((2 * (s.w + spread)) / canvas.width, (2 * (s.h + spread)) / canvas.height)

    // The region copied from the frame: the pill and enough around it for the frost.
    const margin = COPY_MARGIN * dpr
    const width = Math.ceil((2 * (s.w + margin)) / TEXTURE_STEP) * TEXTURE_STEP
    const height = Math.ceil((2 * (s.h + margin)) / TEXTURE_STEP) * TEXTURE_STEP
    if (!texture.current || texture.current.image.width !== width || texture.current.image.height !== height) {
      texture.current?.dispose()
      texture.current = new THREE.FramebufferTexture(width, height)
      texture.current.minFilter = THREE.LinearFilter
      texture.current.magFilter = THREE.LinearFilter
    }
    origin.set(
      Math.max(0, Math.floor(s.x - width / 2)),
      Math.max(0, Math.floor(s.y - height / 2)),
    )
    u.tBack.value = texture.current
    u.uOrigin.value.copy(origin)
    u.uTexSize.value.set(width, height)
  })

  /*
   * Drawn last (renderOrder), so by now everything behind the pill is in the
   * frame. Only from the screen itself: a pass rendering this scene into a
   * target of its own has nothing behind the pill worth copying.
   */
  const copyBehind = (renderer) => {
    if (renderer.getRenderTarget() !== null || !texture.current) return
    renderer.copyFramebufferToTexture(texture.current, origin)
    if (frame.current++ % MEASURE_EVERY === 0) measure(renderer)
  }

  /*
   * How light is what the words sit on: one row of pixels across the middle of
   * the pill, read back before the glass draws over it. A single row, a few
   * times a second, keeps the stall of reading back from the GPU negligible;
   * the words only need to know which side of the middle the content is.
   */
  const measure = (renderer) => {
    const s = shape.current
    if (!s) return
    const ctx = renderer.getContext()
    const canvas = renderer.domElement
    const x0 = Math.max(0, Math.floor(s.x - s.w))
    const x1 = Math.min(canvas.width, Math.ceil(s.x + s.w))
    const y = Math.min(canvas.height - 1, Math.max(0, Math.round(s.y)))
    const width = x1 - x0
    if (width <= 0) return
    if (row.current.length !== width * 4) row.current = new Uint8Array(width * 4)
    const px = row.current
    ctx.readPixels(x0, y, width, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px)
    const t = y / canvas.height
    const lumAt = (i) => {
      // Over the sky wherever the canvas is not opaque, as the eye sees it.
      const rest = 1 - px[i + 3] / 255
      const r = px[i] / 255 + skyAt('r', t) * rest
      const g = px[i + 1] / 255 + skyAt('g', t) * rest
      const b = px[i + 2] / 255 + skyAt('b', t) * rest
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const average = (from, to) => {
      const a = Math.max(0, Math.floor(from - x0))
      const b = Math.min(width, Math.ceil(to - x0))
      if (b <= a) return null
      let sum = 0
      for (let x = a; x < b; x++) sum += lumAt(x * 4)
      return sum / (b - a)
    }
    // Each word against what is behind it, not the pill's average: a pill
    // half over a dark print and half over the page needs both.
    const flip = (current, luminance) =>
      luminance === null ? current
        : luminance < LIGHT_TEXT_BELOW ? 'light'
          : luminance > DARK_TEXT_ABOVE ? 'dark' : current
    for (const word of words.current) {
      word.el.dataset.tone = flip(word.el.dataset.tone ?? 'dark', average(word.x0, word.x1))
    }
    toneTarget.current = flip(toneTarget.current === 1 ? 'light' : 'dark', average(x0, x1)) === 'light' ? 1 : 0
  }

  return (
    <mesh
      ref={meshRef}
      material={material}
      renderOrder={1000}
      frustumCulled={false}
      visible={false}
      // Screen chrome: the pointer belongs to the DOM element over it.
      raycast={() => null}
      onBeforeRender={copyBehind}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}
