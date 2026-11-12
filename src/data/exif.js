/**
 * A photo's camera settings: read from its EXIF when the wall is built, and
 * written out for the line under a print when it is opened.
 *
 * Shared by scripts/prepare-photos.mjs, which stores the raw numbers in the
 * manifest, and the overlay, which formats them — so the numbers stay exact in
 * the data and only the wording lives in one place. Plain JavaScript with no
 * imports, so the script can load it straight from Node.
 */

/**
 * The settings from an `exif-reader` result, or null if the photo carries none.
 *
 * Exports from editing apps often keep an EXIF block with every field blank,
 * so an empty block counts as none rather than as a photo with no settings.
 */
export function readExposure(exif) {
  const image = exif?.Image ?? {}
  const photo = exif?.Photo ?? {}

  const make = typeof image.Make === 'string' ? image.Make.trim() : ''
  const model = typeof image.Model === 'string' ? image.Model.trim() : ''
  // Most cameras repeat the maker in the model ("Canon EOS 700D"); naming it
  // twice would read "Canon Canon EOS 700D".
  const camera = model
    ? (make && !model.toLowerCase().includes(make.toLowerCase()) ? `${make} ${model}` : model)
    : make || null

  const rawIso = photo.ISOSpeedRatings ?? photo.PhotographicSensitivity
  const iso = Array.isArray(rawIso) ? rawIso[0] : rawIso
  const exposure = photo.ExposureTime
  const aperture = photo.FNumber

  const settings = {
    camera,
    iso: Number.isFinite(iso) && iso > 0 ? iso : null,
    exposure: Number.isFinite(exposure) && exposure > 0 ? exposure : null,
    aperture: Number.isFinite(aperture) && aperture > 0 ? aperture : null,
  }
  return Object.values(settings).some((v) => v !== null) ? settings : null
}

/**
 * The year a photo was taken, from its EXIF capture time, or null. Only the
 * year: a print's caption is a place and a year, and the GPS some photos carry
 * is deliberately not read — it would publish where each one was taken.
 */
export function readYear(exif) {
  const taken = exif?.Photo?.DateTimeOriginal ?? exif?.Image?.DateTime
  const year = taken instanceof Date ? taken.getFullYear() : Number.parseInt(String(taken ?? '').slice(0, 4), 10)
  return Number.isFinite(year) && year > 1900 ? year : null
}

/**
 * Shutter speed as a photographer writes it: a fraction of a second below one
 * second ("1/250s"), seconds above it ("2s", "1.5s").
 */
export function formatShutter(seconds) {
  if (seconds >= 1) return `${Number(seconds.toFixed(1))}s`
  return `1/${Math.round(1 / seconds)}s`
}

/** Aperture as an f-number: "ƒ/1.6", "ƒ/22". */
export function formatAperture(f) {
  return `ƒ/${Number(f.toFixed(1))}`
}

/**
 * Aperture, shutter and ISO — the order they are usually read in — leaving out
 * whatever the photo lacks. Empty when it has none of them.
 */
export function formatSettings(settings) {
  if (!settings) return ''
  return [
    settings.aperture && formatAperture(settings.aperture),
    settings.exposure && formatShutter(settings.exposure),
    settings.iso && `ISO ${settings.iso}`,
  ].filter(Boolean).join(' · ')
}

/** Everything on one line, camera first: what the photo script logs as it reads each file. */
export function formatExposure(settings) {
  if (!settings) return ''
  return [settings.camera, formatSettings(settings)].filter(Boolean).join(' · ')
}
