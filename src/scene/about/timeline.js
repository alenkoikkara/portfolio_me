/**
 * The milestones on the about view's constellation, oldest first.
 *
 * Kept apart from the scene code so dates and wording can change without
 * touching it. How many there are picks the figure: the timeline takes the
 * shape of a real constellation with exactly that many stars (see
 * constellations.generated.js), so adding one turns the whole figure into the
 * next constellation up. Between 1 and 10 — there is no figure past ten.
 *
 * The milestones go to the figure's stars from left to right in this order, so
 * the timeline still reads chronologically across the sky.
 *
 * TO CONFIRM: these entries are carried over from the brief, which gives the
 * roles from the résumé but calls the years its own best guess.
 */
export const MILESTONES = [
  { id: 'depaul', year: '2016', title: 'DePaul', subtitle: 'MS Computer Science' },
  { id: 'adons', year: '2017', title: 'Adons Softech', subtitle: 'first engineering role' },
  { id: 'fortis', year: '2019', title: 'Fortis', subtitle: 'healthcare systems' },
  { id: 'ge', year: '2021', title: 'GE HealthCare', subtitle: 'GenAI + RAG' },
  { id: 'chicago', year: '2023', title: 'Chicago', subtitle: 'move + photography' },
  { id: 'mckinsey', year: '2024', title: 'QuantumBlack', subtitle: 'current — data pipeline' },
]
