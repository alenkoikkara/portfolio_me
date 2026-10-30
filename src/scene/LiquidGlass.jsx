import React, { useLayoutEffect, useMemo, useRef } from 'react'
import { useFBO } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLASS_ORDER } from './aboutLayout'

/*
 * What the glass sees where nothing stands behind it: the page's own colour
 * (`--stage-bg` of `.stage` in index.css). The canvas is transparent over the
 * page, so without it the scene behind the glass would be rendered over black.
 */
const PAGE = new THREE.Color('#faf9f6')

/*
 * The frost: how far the blurred scene is washed toward white. Enough that the
 * device behind reads only as soft light and shadow — the about view is meant
 * to put it out of mind, not frame it.
 */
const FROST = new THREE.Color('#ffffff')
const FROST_AMOUNT = 0.58

/*
 * The scene behind the glass is rendered at a quarter of the window's size.
 * The frost blurs it heavily anyway, so the extra resolution would be spent on
 * detail nobody can see — and a smaller buffer's mipmaps are what make the
 * blur smooth and cheap rather than grainy.
 */
const BUFFER_SCALE = 0.25

const vertexShader = /* glsl */ `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/*
 * Apple's Liquid Glass, drawn in screen space: the pane is screen-aligned and
 * fills the window, so its rounded shape and its bevel are a distance field in
 * pixels rather than geometry.
 *
 *   Frost      — the scene behind, blurred from a coarse mip of its buffer by a
 *                ring of taps, then washed toward white.
 *   Lens       — inside the bevel the glass bends what is behind it inward,
 *                as the rounded edge of a thick lens does, splitting it faintly
 *                into colour.
 *   Highlight  — a thin bright line just inside the edge, strongest along the
 *                top as if lit from above, and a soft shadow along the bottom.
 *
 * The scene behind is tone-mapped with three's own `toneMapping()`, so it is
 * treated exactly as the scene seen anywhere else, and only then washed with
 * the frost. Frosting first and tone-mapping the result, as this first did,
 * turned the white frost grey: ACES pulls white down, and the pane came out
 * darker than the page around it, which is the opposite of glass.
 *
 * Outside the edge, a soft shadow on the page underneath, so the pane reads as
 * standing off it.
 */
const fragmentShader = /* glsl */ `
  uniform sampler2D tScene;
  uniform vec2 uResolution;
  uniform float uPixelRatio;
  uniform float uInset;
  uniform float uRadius;
  uniform float uBevel;
  uniform float uOpacity;
  uniform vec3 uFrost;
  uniform float uFrostAmount;

  float roundRect(vec2 p, vec2 halfSize, float r) {
    vec2 q = abs(p) - halfSize + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  /*
   * A soft blur: the centre and two rings of taps from a coarse mip, the outer
   * ring turned half a step so the two do not line up into a pattern. Each tap
   * is capped first — the buffer is HDR, and a specular glint off a dark key
   * is bright enough to survive any average as a speck; frosted glass spreads
   * it into a glow instead.
   */
  vec3 tap(vec2 uv) {
    return min(texture2D(tScene, uv, 3.5).rgb, vec3(1.2));
  }

  vec3 frosted(vec2 uv) {
    vec2 step = 1.0 / uResolution * uPixelRatio;
    vec3 c = tap(uv) * 0.12;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853982;
      c += tap(uv + vec2(cos(a), sin(a)) * step * 18.0) * 0.06;
      c += tap(uv + vec2(cos(a + 0.3927), sin(a + 0.3927)) * step * 36.0) * 0.05;
    }
    return c;
  }

  void main() {
    vec2 size = uResolution / uPixelRatio;
    vec2 p = gl_FragCoord.xy / uPixelRatio;
    float d = roundRect(p - size * 0.5, size * 0.5 - uInset, uRadius);
    float coverage = 1.0 - smoothstep(-0.75, 0.75, d);
    if (coverage <= 0.0) {
      // The pane's shadow on the page, fading out across the margin — a
      // little heavier below, as if lit from above.
      float below = clamp(-((p.y - size.y * 0.5) / (size.y * 0.5)), 0.0, 1.0);
      float shadow = (1.0 - smoothstep(0.0, uInset, d)) * (0.05 + 0.05 * below);
      if (shadow <= 0.0) discard;
      gl_FragColor = vec4(0.0, 0.0, 0.0, shadow * uOpacity);
      #include <colorspace_fragment>
      return;
    }

    // The edge's outward normal, from the distance field's gradient.
    vec2 n = normalize(vec2(dFdx(d), dFdy(d)) + 1e-6);
    // 1 at the edge, falling to 0 a bevel's width in.
    float rim = clamp(1.0 + d / uBevel, 0.0, 1.0);
    float lens = rim * rim;

    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 bend = -n * lens * 18.0 / size;
    vec3 colour = frosted(uv + bend);
    if (lens > 0.01) {
      // The faint rainbow fringe of real glass, only where it bends.
      colour.r = frosted(uv + bend * 1.08).r;
      colour.b = frosted(uv + bend * 0.92).b;
    }
    colour = mix(toneMapping(colour), uFrost, uFrostAmount);

    // The specular edge: a bright line just inside it, brightest along the top.
    float line = smoothstep(3.0, 0.5, -d);
    float fromAbove = 0.5 + 0.5 * n.y;
    colour = mix(colour, vec3(1.0), line * (0.35 + 0.55 * fromAbove));
    colour += vec3(lens * 0.06 * max(n.y, 0.0));
    // And the bevel's underside, a touch darker along the bottom edge.
    colour -= vec3(0.06 * lens * max(-n.y, 0.0));

    gl_FragColor = vec4(colour, uOpacity * coverage);
    #include <colorspace_fragment>
  }
`

/**
 * A pane of frosted glass filling the window, in front of the scene, over
 * everything behind it but `hide` — the things that stand on the glass, which
 * would otherwise be rendered into what the glass sees and show through it a
 * second time as blurred ghosts.
 *
 * `opacity` is a ref the owner fades; at zero the glass and its extra render
 * cost nothing. Its geometry is a plane filling the frame at `glass.depth` in
 * front of the camera — the parent group rides with the camera — and the pane's
 * shape is cut from it by the shader.
 */
const LiquidGlass = React.forwardRef(function LiquidGlass({ glass, opacity, hide, ...props }, ref) {
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)
  const bufferWidth = Math.max(1, Math.round(size.width * dpr * BUFFER_SCALE))
  const bufferHeight = Math.max(1, Math.round(size.height * dpr * BUFFER_SCALE))
  const buffer = useFBO(bufferWidth, bufferHeight, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType,
  })

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      tScene: { value: null },
      uResolution: { value: new THREE.Vector2() },
      uPixelRatio: { value: 1 },
      uInset: { value: 0 },
      uRadius: { value: 0 },
      uBevel: { value: 0 },
      uOpacity: { value: 0 },
      uFrost: { value: FROST.clone() },
      uFrostAmount: { value: FROST_AMOUNT },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }), [])
  useLayoutEffect(() => () => material.dispose(), [material])

  const meshRef = useRef()
  React.useImperativeHandle(ref, () => meshRef.current)

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    const o = opacity.current
    mesh.visible = o > 0
    if (o <= 0) return

    const { gl, scene, camera } = state
    const u = material.uniforms
    u.uOpacity.value = o
    u.uResolution.value.set(size.width * dpr, size.height * dpr)
    u.uPixelRatio.value = dpr
    u.uInset.value = glass.inset
    u.uRadius.value = glass.radius
    u.uBevel.value = glass.bevel

    /*
     * Render what the glass sees: the scene, without the glass itself or what
     * stands on it, over the page's colour. The shadow maps are already up to
     * date for this frame's main render, so this pass reuses them instead of
     * drawing every shadow a second time.
     */
    const background = scene.background
    const shadows = gl.shadowMap.autoUpdate
    mesh.visible = false
    if (hide.current) hide.current.visible = false
    scene.background = PAGE
    gl.shadowMap.autoUpdate = false
    gl.setRenderTarget(buffer)
    gl.clear()
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    gl.shadowMap.autoUpdate = shadows
    scene.background = background
    if (hide.current) hide.current.visible = true
    mesh.visible = true
    u.tScene.value = buffer.texture
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, -glass.depth]}
      material={material}
      renderOrder={GLASS_ORDER}
      visible={false}
      {...props}
    >
      <planeGeometry args={[glass.frameWidth, glass.frameHeight]} />
    </mesh>
  )
})

export default LiquidGlass
