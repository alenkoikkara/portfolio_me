import React, { useLayoutEffect, useMemo, useRef } from 'react'
import { Html, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { constellationLayout } from './constellationLayout'
import { MILESTONES } from './about/timeline'
import { CONTENT_ORDER } from './aboutLayout'

/*
 * Ink on the page: the stars are the `--stage-ink` of the light theme, and the
 * faint ones fade toward the page colour rather than toward transparency — see
 * the ambient stars below.
 */
const INK = '#111827'
const PAGE = '#faf9f6'
/** Sizes on screen, in CSS px. */
const CORE_RADIUS = 3
const HALO_RADIUS = 7
const HALO_ALPHA = 0.12
const LINE_ALPHA = 0.45

/*
 * The reveal, in seconds from the moment the about key is pressed. The glass
 * comes up first (AboutView.jsx), the bio arrives at 0.22 s (AboutPanel.jsx),
 * then the ambient stars, then the milestones one by one in date order. Each
 * of the figure's lines draws once both its stars are out, from the earlier
 * toward the later, and the figure's name comes up under it last. It runs on
 * past the glass's arrival on purpose: the mode commits early so Escape works
 * at once, while the drawing finishes.
 */
const AMBIENT_AT = 0.35
const AMBIENT_FADE = 0.6
const starAt = (i) => 0.5 + i * 0.14
const STAR_POP = 0.35
const lineAt = (later) => starAt(later) + 0.06
const LINE_DRAW = 0.45
const labelAt = (i) => starAt(i) + 0.1
const LABEL_FADE = 0.3
const nameAt = (count) => starAt(count - 1) + 0.3
/** Leaving, everything fades together, inside the glass's own fade. */
const OUT_SECONDS = 0.3
/** Longest frame the reveal will act on, so one stalled frame cannot skip a beat. */
const MAX_STEP = 0.1

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
// A pop: overshoots a touch and settles, so a star reads as appearing rather
// than fading up.
const easeOutBack = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2

const prefersReducedMotion = () =>
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

const circle = new THREE.CircleGeometry(1, 24)

/*
 * Every material here is drawn after the glass with depth testing off, so the
 * device under the glass can never cut into a star or a line.
 */
const onGlass = { transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }

/**
 * The constellation: the milestones from `about/timeline.js` as the stars of a
 * real constellation with as many stars as there are milestones, joined by that
 * constellation's own lines and named underneath, among ambient stars — drawn
 * in ink on the about view's glass beside the bio.
 *
 * Laid out in screen pixels (constellationLayout.js) on a plane in front of the
 * glass; the group below is scaled so a unit is a pixel there, which keeps stars
 * and line widths the same size on every window and lets the labels sit at
 * exactly their CSS size.
 */
export default function Constellation({ layout, present }) {
  const plan = useMemo(() => constellationLayout(layout, MILESTONES), [layout])

  const materials = useMemo(() => {
    const make = () => new THREE.MeshBasicMaterial({ color: INK, ...onGlass })
    return {
      ambient: new THREE.MeshBasicMaterial(onGlass),
      cores: MILESTONES.map(make),
      halos: MILESTONES.map(make),
    }
  }, [])
  useLayoutEffect(() => () => {
    materials.ambient.dispose()
    for (const m of [...materials.cores, ...materials.halos]) m.dispose()
  }, [materials])

  /*
   * The ambient stars are one instanced mesh, not forty: they never move or
   * change on their own, so a draw call each would buy nothing. Their
   * faintness goes into each instance's colour — ink mixed toward the page, so
   * a faint star is a pale one, which on a light page reads as fainter — and
   * leaves the material's opacity free for the fade.
   */
  const ambientRef = useRef()
  useLayoutEffect(() => {
    const mesh = ambientRef.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const page = new THREE.Color(PAGE)
    const ink = new THREE.Color(INK)
    const c = new THREE.Color()
    plan.ambient.forEach((s, i) => {
      m.makeScale(s.radius, s.radius, 1).setPosition(s.x, -s.y, 0)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, c.copy(page).lerp(ink, s.alpha))
    })
    mesh.count = plan.ambient.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [plan])

  const starRefs = useRef([])
  const lineRefs = useRef([])
  const labelRefs = useRef([])
  const elapsed = useRef(0)
  const out = useRef(1)
  // What each line was last drawn to, so its geometry is only rebuilt while it
  // is actually growing.
  const drawn = useRef([])
  const planRef = useRef(plan)
  useLayoutEffect(() => { planRef.current = plan }, [plan])

  /*
   * Each line's starting points, kept stable across renders. drei rewrites a
   * line's geometry from `points` whenever that array is a new one — and the
   * mode changing from OPENING_ABOUT to ABOUT re-renders this component — so
   * fresh arrays every render would snap every half-drawn line back to nothing.
   * A line starts at whichever of its stars comes out first.
   */
  const lineStarts = useMemo(
    () => plan.edges.map(([a, b]) => {
      const s = plan.stars[Math.min(a, b)]
      return [[s.x, -s.y, 0], [s.x, -s.y, 0]]
    }),
    [plan],
  )
  const nameRef = useRef()

  useFrame((_, delta) => {
    const instant = prefersReducedMotion()
    const step = Math.min(delta, MAX_STEP)
    if (present) {
      elapsed.current = instant ? Infinity : elapsed.current + step
      out.current = 1
    } else {
      out.current = instant ? 0 : Math.max(0, out.current - step / OUT_SECONDS)
    }
    const t = elapsed.current
    const fade = out.current
    const { stars, edges } = planRef.current

    materials.ambient.opacity = clamp01((t - AMBIENT_AT) / AMBIENT_FADE) * fade

    stars.forEach((star, i) => {
      const local = clamp01((t - starAt(i)) / STAR_POP)
      const group = starRefs.current[i]
      if (group) group.scale.setScalar(local === 0 ? 0.0001 : easeOutBack(local))
      const shown = clamp01((t - starAt(i)) / (STAR_POP * 0.7)) * fade
      materials.cores[i].opacity = shown
      materials.halos[i].opacity = shown * HALO_ALPHA

      const label = labelRefs.current[i]
      if (label) label.style.opacity = String(clamp01((t - labelAt(i)) / LABEL_FADE) * fade)
    })

    /*
     * Each line grows from one star toward the next — only its length changes,
     * never its colour, so it reads as being drawn rather than as an effect.
     * Driven from here, not from React state: a state update per line per frame
     * would re-render the constellation sixty times a second.
     */
    edges.forEach(([first, second], i) => {
      const line = lineRefs.current[i]
      if (!line) return
      const from = Math.min(first, second)
      const to = Math.max(first, second)
      const p = easeInOut(clamp01((t - lineAt(to)) / LINE_DRAW))
      const a = stars[from]
      const b = stars[to]
      const key = `${p}|${a.x}|${a.y}|${b.x}|${b.y}`
      if (drawn.current[i] !== key) {
        drawn.current[i] = key
        line.geometry.setPositions([a.x, -a.y, 0, a.x + (b.x - a.x) * p, -(a.y + (b.y - a.y) * p), 0])
      }
      line.material.opacity = (p > 0 ? LINE_ALPHA : 0) * fade
    })

    if (nameRef.current) nameRef.current.style.opacity = String(clamp01((t - nameAt(stars.length)) / LABEL_FADE) * fade)
  })

  const { content } = layout

  return (
    <>
      {/* The content plane: origin at the window's top-left pixel, a unit to a pixel. */}
      <group position={content.origin} scale={content.pixel}>
        <instancedMesh
          ref={ambientRef}
          args={[circle, materials.ambient, plan.ambient.length]}
          renderOrder={CONTENT_ORDER}
          frustumCulled={false}
        />

        {plan.stars.map((star, i) => (
          <group key={star.id} position={[star.x, -star.y, 0]} ref={(g) => { starRefs.current[i] = g }} scale={0.0001}>
            <mesh geometry={circle} material={materials.halos[i]} scale={HALO_RADIUS} renderOrder={CONTENT_ORDER} />
            <mesh geometry={circle} material={materials.cores[i]} scale={CORE_RADIUS} renderOrder={CONTENT_ORDER} />
          </group>
        ))}

        {plan.edges.map(([a, b], i) => (
          <Line
            key={`line-${a}-${b}`}
            ref={(l) => { lineRefs.current[i] = l }}
            points={lineStarts[i]}
            color={INK}
            lineWidth={1}
            renderOrder={CONTENT_ORDER}
            {...onGlass}
          />
        ))}
      </group>

      {/*
        * The labels, as one DOM layer on the same plane, scaled one CSS pixel
        * to one screen pixel there. Its anchor is the window's top-left, so
        * each label is placed at its star's own pixel position.
        */}
      <group position={content.origin}>
        <Html
          transform
          sprite
          distanceFactor={content.distanceFactor}
          pointerEvents="none"
          zIndexRange={[9, 0]}
        >
          <div className={`constellation constellation--${layout.layout}${plan.compact ? ' constellation--compact' : ''}`}>
            {plan.stars.map((star, i) => {
              const m = MILESTONES[i]
              return (
                <div
                  key={m.id}
                  ref={(el) => { labelRefs.current[i] = el }}
                  className={`milestone milestone--${star.label}`}
                  style={{ left: star.x, top: star.y, opacity: 0 }}
                >
                  <div className="milestone__year">{m.year}</div>
                  <div className="milestone__title">{m.title}</div>
                  {m.subtitle && <div className="milestone__sub">{m.subtitle}</div>}
                </div>
              )
            })}
            <div
              ref={nameRef}
              className={`constellation__name constellation__name--${plan.name.kind}`}
              style={{ left: plan.name.x, top: plan.name.y, opacity: 0 }}
            >
              {plan.name.text}
            </div>
          </div>
        </Html>
      </group>
    </>
  )
}
