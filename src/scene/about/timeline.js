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
 * `note` is the one line a milestone opens to on hover, tap or focus.
 *
 * The years and roles are from the résumé (Nov 2026); the notes are drafted
 * from it.
 */
export const MILESTONES = [
  { id: 'xavier', year: '2018', title: 'Xavier’s', subtitle: 'BE Computer Engineering', note: 'A bachelor’s in computer engineering at Xavier’s, Mumbai, 2018–2022.' },
  { id: 'adons', year: '2020', title: 'Adons', subtitle: 'Softech · first role', note: 'Software developer: product modules, ETL pipelines and a REST API layer in Python and JavaScript.' },
  { id: 'fortis', year: '2021', title: 'Fortis Healthcare', subtitle: 'senior engineer', note: 'Senior software engineer (via Vivma): event-driven services for 10+ hospital systems, 1M+ transactions a day.' },
  { id: 'depaul', year: '2023', title: 'DePaul', subtitle: 'MS CS · Chicago', note: 'Moved to Chicago for a master’s in computer science at DePaul, 2023–2025 — and started photographing the city.' },
  { id: 'ge', year: '2025', title: 'GE HealthCare', subtitle: 'GenAI + RAG', note: 'GenAI and backend systems (via Skillman): a multi-agent clinical system on LangGraph and RAG, cutting chart review time by 35%.' },
  { id: 'mckinsey', year: '2026', title: 'QuantumBlack', subtitle: 'data pipeline', note: 'Contracted with McKinsey’s QuantumBlack on a production data pipeline, June–October 2026.' },
  { id: 'housefacts', year: '2026', title: 'HouseFacts', subtitle: 'current — senior full-stack', note: 'Senior full-stack developer at HouseFacts, since October 2026.' },
]
