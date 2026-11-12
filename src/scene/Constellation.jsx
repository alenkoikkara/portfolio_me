import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Html, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { constellationLayout } from './constellationLayout'
import { MILESTONES } from './about/timeline'
import { CONTENT_ORDER } from './aboutLayout'
import { INK, ACCENT } from '../story/palette'

/*
 * An astronomer's chart in ink on white glass: solid ink dots, no glow, and
 * hairline lines between them. The ink is the page's `--ink` (palette.js), so
 * the stars match the labels beside them; the faint ambient stars are ink mixed
 * toward the white frost rather than made transparent — see below.
 */
const PAPER = new THREE.Color('#ffffff')
/** Sizes on screen, in CSS px. */
const CORE_RADIUS = 3
const RING_INNER = 5.5
const RING_OUTER = 6.5
/*
 * The current milestone — the newest, last in the timeline — wears a thin
 * amber ring, and the ring breathes between these two over a 2.5 s cycle once
 * it is out: the one thing still moving after the constellation has drawn.
 */
const BREATH_LOW = 0.5
const BREATH_HIGH = 1
const BREATH_SECONDS = 2.5
const CURRENT_ID = MILESTONES[MILESTONES.length - 1].id
const LINE_ALPHA = 0.3

/*
 * Each label on whichever side of its star constellationLayout.js found clear.
 * The 12 px offsets (8.4 on the diagonals) must match its `LABEL_OFFSET`, or a
 * label lands somewhere other than the room it was given.
 */
const LABEL_SIDE = {
  below: '[transform:translate(-50%,12px)] text-center',
  above: '[transform:translate(-50%,calc(-100%-12px))] text-center',
  right: '[transform:translate(12px,-50%)] text-left',
  left: '[transform:translate(calc(-100%-12px),-50%)] text-right',
  'below-right': '[transform:translate(8.4px,8.4px)] text-left',
  'below-left': '[transform:translate(calc(-100%-8.4px),8.4px)] text-right',
  'above-right': '[transform:translate(8.4px,calc(-100%-8.4px))] text-left',
  'above-left': '[transform:translate(calc(-100%-8.4px),calc(-100%-8.4px))] text-right',
}
/* A milestone's note hangs from the label's edge nearest its star. */
const NOTE_SIDE = {
  below: 'left-1/2 -translate-x-1/2',
  above: 'left-1/2 -translate-x-1/2',
  right: 'left-0',
  left: 'right-0',
  'below-right': 'left-0',
  'below-left': 'right-0',
  'above-right': 'left-0',
  'above-left': 'right-0',
}

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
const ring = new THREE.RingGeometry(RING_INNER, RING_OUTER, 48)

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
  // A narrow band: smaller type and no subtitle — two lines fit, three do not.
  const stacked = layout.layout === 'stacked'

  const materials = useMemo(() => ({
    ambient: new THREE.MeshBasicMaterial(onGlass),
    cores: MILESTONES.map(() => new THREE.MeshBasicMaterial({ color: INK, ...onGlass })),
    ring: new THREE.MeshBasicMaterial({ color: ACCENT, ...onGlass }),
  }), [])
  useLayoutEffect(() => () => {
    materials.ambient.dispose()
    materials.ring.dispose()
    for (const m of materials.cores) m.dispose()
  }, [materials])

  /*
   * The ambient stars are one instanced mesh, not forty: they never move or
   * change on their own, so a draw call each would buy nothing. Their
   * faintness goes into each instance's colour — ink mixed toward the white
   * frost, so a faint star is one closer to the glass — and leaves the
   * material's opacity free for the fade.
   */
  const ambientRef = useRef()
  useLayoutEffect(() => {
    const mesh = ambientRef.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const ink = new THREE.Color(INK)
    const tint = new THREE.Color()
    plan.ambient.forEach((s, i) => {
      m.makeScale(s.radius, s.radius, 1).setPosition(s.x, -s.y, 0)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, tint.copy(PAPER).lerp(ink, s.alpha))
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
  /*
   * The milestone opened to its one line: on hover, on focus, or toggled by a
   * tap, since a finger has no hover. React state is fine here — it changes on
   * a pointer event, not per frame.
   */
  const [opened, setOpened] = useState(null)

  useFrame((state, delta) => {
    const instant = prefersReducedMotion()
    const breath = instant
      ? BREATH_LOW
      : BREATH_LOW + (BREATH_HIGH - BREATH_LOW) * (0.5 - 0.5 * Math.cos((state.clock.elapsedTime * 2 * Math.PI) / BREATH_SECONDS))
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
      if (star.id === CURRENT_ID) materials.ring.opacity = shown * breath

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
            {star.id === CURRENT_ID && <mesh geometry={ring} material={materials.ring} renderOrder={CONTENT_ORDER} />}
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
          {/*
            * drei centres its child on the anchor, the window's top-left pixel,
            * so the layer is zero-sized and each label is placed at its star's
            * pixel position from there.
            */}
          <div className="relative h-0 w-0">
            {plan.stars.map((star, i) => {
              const m = MILESTONES[i]
              return (
                <button
                  type="button"
                  key={m.id}
                  ref={(el) => { labelRefs.current[i] = el }}
                  className={`absolute m-0 cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 text-(--stage-ink) pointer-events-auto focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--ink) ${LABEL_SIDE[star.label]} ${opened === m.id ? 'z-2' : ''}`}
                  style={{ left: star.x, top: star.y, opacity: 0 }}
                  aria-expanded={m.note ? opened === m.id : undefined}
                  onMouseEnter={() => setOpened(m.id)}
                  onMouseLeave={() => setOpened((o) => (o === m.id ? null : o))}
                  onFocus={() => setOpened(m.id)}
                  onBlur={() => setOpened((o) => (o === m.id ? null : o))}
                  onClick={() => setOpened((o) => (o === m.id ? null : m.id))}
                >
                  <span className={`mb-0.5 block tracking-[0.14em] text-(--stage-muted) ${stacked ? 'text-[9px]' : 'text-[10px]'}`}>{m.year}</span>
                  <span className={`block font-medium ${stacked ? 'text-[11px]' : 'text-[13px]'}`}>{m.title}</span>
                  {m.subtitle && !stacked && !plan.compact && (
                    <span className="mt-px block text-[11px] font-normal text-(--stage-muted)">{m.subtitle}</span>
                  )}
                  {m.note && opened === m.id && (
                    /* On paper under the label, above the others, so opening it never reflows the placed labels. */
                    <span className={`absolute top-[calc(100%+8px)] z-1 block w-55 whitespace-normal rounded-[10px] border border-(--rule) bg-white px-2.75 py-2 text-left text-xs leading-[1.45] text-(--stage-ink) shadow-[0_10px_24px_-16px_rgba(23,24,28,0.35)] ${NOTE_SIDE[star.label]}`}>
                      {m.note}
                    </span>
                  )}
                </button>
              )
            })}
            <div
              ref={nameRef}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] uppercase tracking-[0.22em] text-(--stage-muted)"
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
