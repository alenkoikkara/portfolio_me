import * as THREE from 'three'

/**
 * Easing functions for the insertion/ejection animation.
 */
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
function easeOutQuad(t) { return 1 - (1 - t) * (1 - t) }
function easeInQuad(t) { return t * t }

/**
 * Tween an object's position from current to target over duration ms.
 * Returns a promise that resolves when complete.
 *
 * @param {THREE.Object3D} obj - Object to animate
 * @param {THREE.Vector3} target - Target position
 * @param {number} duration - Duration in ms
 * @param {Function} easing - Easing function (0→1 input, 0→1 output)
 * @param {Function} [checkMode] - Optional guard; if it returns false, the tween aborts
 */
function tweenTo(obj, target, duration, easing, checkMode) {
  return new Promise((resolve) => {
    const start = obj.position.clone()
    const startTime = performance.now()

    function tick() {
      // Guard: abort if mode changed
      if (checkMode && !checkMode()) {
        resolve(false)
        return
      }

      const elapsed = performance.now() - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = easing(progress)

      obj.position.lerpVectors(start, target, eased)

      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        obj.position.copy(target)
        resolve(true)
      }
    }
    requestAnimationFrame(tick)
  })
}

/**
 * Tween an object's quaternion from current to target over duration ms.
 */
function tweenRotation(obj, targetQuat, duration, easing, checkMode) {
  return new Promise((resolve) => {
    const startQuat = obj.quaternion.clone()
    const startTime = performance.now()

    function tick() {
      if (checkMode && !checkMode()) {
        resolve(false)
        return
      }

      const elapsed = performance.now() - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = easing(progress)

      obj.quaternion.slerpQuaternions(startQuat, targetQuat, eased)

      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        obj.quaternion.copy(targetQuat)
        resolve(true)
      }
    }
    requestAnimationFrame(tick)
  })
}

/**
 * Multi-stage insertion animation.
 * Flies the cartridge from its carousel position into the device slot.
 *
 * @param {THREE.Object3D} cart - The cartridge object (in world space)
 * @param {THREE.Object3D} slotAnchor - The SlotAnchor empty (provides world transform)
 * @param {Function} checkMode - Returns false if mode changed unexpectedly
 * @returns {Promise<boolean>} - true if completed, false if aborted
 */
export async function insertCartridge(cart, slotAnchor, checkMode) {
  // Get slot world position
  const mouth = new THREE.Vector3()
  slotAnchor.getWorldPosition(mouth)

  // Slot direction — cartridge slides in along local -Z of the slot
  const slotQuat = new THREE.Quaternion()
  slotAnchor.getWorldQuaternion(slotQuat)
  const slotDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(slotQuat)

  // Waypoints
  const lift = mouth.clone().add(new THREE.Vector3(0, 0.05, 0.02))
  const align = mouth.clone()
  const seat = mouth.clone().add(slotDirection.clone().multiplyScalar(0.025))
  const overshoot = seat.clone().add(slotDirection.clone().multiplyScalar(0.001))

  // Also slerp rotation to match slot orientation
  const targetQuat = slotQuat.clone()

  // Stage 1: Lift up from carousel (350ms)
  let ok = await tweenTo(cart, lift, 350, easeOutCubic, checkMode)
  if (!ok) return false

  // Rotate during flight to align with slot
  tweenRotation(cart, targetQuat, 250, easeInOutCubic, checkMode)

  // Stage 2: Arc to slot mouth (250ms)
  ok = await tweenTo(cart, align, 250, easeInOutCubic, checkMode)
  if (!ok) return false

  // Stage 3: Slide into seat (200ms)
  ok = await tweenTo(cart, seat, 200, easeOutQuad, checkMode)
  if (!ok) return false

  // Stage 4: Overshoot (60ms) — the 1mm that sells the mechanical detent
  ok = await tweenTo(cart, overshoot, 60, easeInQuad, checkMode)
  if (!ok) return false

  // Stage 5: Snap back to seat (60ms)
  ok = await tweenTo(cart, seat, 60, easeOutQuad, checkMode)
  return ok
}

/**
 * Ejection animation — reverse of insertion but faster.
 *
 * @param {THREE.Object3D} cart - The cartridge object
 * @param {THREE.Vector3} targetPos - Where it should return to (carousel slot position)
 * @param {THREE.Quaternion} targetQuat - Target rotation (carousel orientation)
 * @param {Function} checkMode - Guard
 * @returns {Promise<boolean>}
 */
export async function ejectCartridge(cart, targetPos, targetQuat, checkMode) {
  // Quick pull out
  const currentPos = cart.position.clone()
  const liftOut = currentPos.clone().add(new THREE.Vector3(0, 0.03, 0.02))

  let ok = await tweenTo(cart, liftOut, 150, easeOutCubic, checkMode)
  if (!ok) return false

  // Rotate back to carousel orientation
  tweenRotation(cart, targetQuat, 200, easeInOutCubic, checkMode)

  // Fly back to carousel position
  ok = await tweenTo(cart, targetPos, 300, easeInOutCubic, checkMode)
  return ok
}
