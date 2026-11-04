import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sky } from '../sky'
import useStoryStore from '../useStoryStore'
import useDeviceStore from '../../scene/useDeviceStore'
import { playRumble } from '../../scene/audio'
import { prefersReducedMotion } from '../environment'

/** Seconds between trains: a little irregular, like a real line. */
const MIN_GAP = 30
const MAX_GAP = 50
const PASS_SECONDS = 1.4
/** The light's strength at the middle of its pass. Physically based, so the number looks large for what it does. */
const PEAK = 0.012
const COLOR = '#ffd29a'
/** The trains run from 06:00 to midnight. */
const FIRST_TRAIN = 6
/** Only over the device at rest — home, and the contact panel beside it. */
const QUIET_MODES = new Set(['IDLE', 'CONTACT'])

/*
 * The pass runs from screen-left to screen-right as the rest camera sees it —
 * world (-X, +Z) to (+X, -Z) — a little in front of the device, so the light
 * catches the keys' faces as it goes by.
 */
const FROM = new THREE.Vector3(-0.3, 0.05, 0.36)
const TO = new THREE.Vector3(0.36, 0.05, -0.3)

/**
 * Every half-minute or so, an L train goes by outside: a warm light sweeps
 * across the device, a low rumble swells and fades, and at night a dashed ink
 * line slides along the foot of the sky (`.sky__train`, in story.css).
 *
 * Never with reduced motion, never in a section — it is the city outside the
 * room at rest, not an event to interrupt anything. (Not mounted at all on a
 * phone: LightingSetup.jsx.)
 */
export default function TrainPass() {
  const lightRef = useRef()
  const nextAt = useRef(MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP))
  const clock = useRef(0)
  const passStart = useRef(null)
  const skip = useRef(null)

  // Dev only: `window.__train()` sends the next train now, for checking it.
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    window.__train = () => { nextAt.current = clock.current }
    return () => { delete window.__train }
  }, [])

  useFrame((_, delta) => {
    const light = lightRef.current
    skip.current ??= prefersReducedMotion()
    if (skip.current) return
    clock.current += Math.min(delta, 0.1)

    if (passStart.current === null) {
      light.intensity = 0
      if (clock.current < nextAt.current) return
      const hour = ((sky.hours % 24) + 24) % 24
      const quiet = useStoryStore.getState().started && QUIET_MODES.has(useDeviceStore.getState().mode)
      if (hour < FIRST_TRAIN || !quiet) {
        nextAt.current = clock.current + MIN_GAP
        return
      }
      passStart.current = clock.current
      playRumble()
      const line = document.querySelector('.sky__train')
      if (line) {
        // Restart the slide: drop the animation, let a style pass happen, set it again.
        line.style.animation = 'none'
        void line.offsetWidth
        line.style.animation = ''
        line.classList.add('sky__train--passing')
      }
    }

    const p = (clock.current - passStart.current) / PASS_SECONDS
    if (p >= 1) {
      passStart.current = null
      light.intensity = 0
      nextAt.current = clock.current + MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP)
      return
    }
    light.position.lerpVectors(FROM, TO, p)
    light.intensity = Math.sin(p * Math.PI) * PEAK * sky.light
  })

  return <pointLight ref={lightRef} color={COLOR} intensity={0} distance={0.6} decay={2} />
}
