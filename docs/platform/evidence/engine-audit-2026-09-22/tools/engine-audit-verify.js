export const meta = {
  name: 'engine-audit-phase2',
  description: 'Adversarially verify the phase-1 engine audit findings (one refuter per area over its blocking/major findings, a second independent lens on every blocking one), or run the completeness critic over all areas and verdicts',
  phases: [
    { title: 'Verify', detail: 'reproduce or refute each blocking/major finding; a second refuter on every blocking one' },
    { title: 'Critic', detail: 'what the auditors missed, where they contradict each other, what they overclaim' },
  ],
}

const ROOT = '<worktree>'
const SCRATCH = '<audit>'

const mode = (args && args.mode) || 'verify'
const manifest = (args && args.manifest) || []
if (!manifest.length) throw new Error('phase2 needs args.manifest: [{key, summary, blocking:[ids], major:[ids], other:[ids]}]')

const RULES = `
Ground rules (identical to phase 1): the worktree ${ROOT} (branch claude/eager-ramanujan-razak3 at 39b7a127; an open PR depends on it) is READ-ONLY — never modify, stage, commit, stash or push anything there; if a repo tool would write into the tree, copy the tool to scratch first. Put every script and output under ${SCRATCH}/verify/<area>/. The phase-1 auditor's full report for each area is the JSON file ${SCRATCH}/results/<area>.json (fields: summary, findings[{id, severity, title, claim, evidence, reproduction, impact, fix, files}], measurements, swissGap, notExamined); its scratch artifacts are under ${SCRATCH}/<area>/ and are referenced by path inside the evidence fields — read them. Tools on this machine: node 22 (the worktree's node_modules has astronomy-engine 2.1.19 and @zodiacs/engine 0.1.1-rc.6, whose built JS is at ${ROOT}/node_modules/@zodiacs/engine/dist/), python3.11 with pyswisseph 2.10.03 (a venv with numpy is at <swisslab>/venv/bin/python; pyerfa/jplephem venvs made by phase-1 auditors may exist under ${SCRATCH}/*/ — reuse them or pip install into a new venv under your own scratch), Swiss .se1 data at <swisslab>/ephe (planets+Moon 1800-2400; ALWAYS read the returned flag and require SWIEPH (258/260 with FLG_SWIEPH set): Swiss CANNOT read NAIF .bsp files and silently falls back to Moshier), DE440s at <swisslab>/de440s.bsp (read it with jplephem or the repo's SPK readers), satellite kernels at <satkernels>, a compiled sealed real pack at ${SCRATCH}/data-toolchain-packaging/ (look for *.zeph; another copy under ${SCRATCH}/alpha-search-partition/pack/), JPL Horizons API reachable (frugal: <= 8 requests per agent, cache under your scratch, record queries). Swiss is an instrument, never a fitting target. Keep any single computation under ~10 minutes. Your final message is data: return exactly the structured object requested.
`

const VERDICTS = {
  type: 'object',
  required: ['area', 'verdicts', 'unverified'],
  properties: {
    area: { type: 'string' },
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'verdict', 'evidence', 'reproductionRan'],
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['confirmed', 'refuted', 'adjusted', 'could-not-test'] },
          correctedSeverity: { type: 'string', enum: ['blocking', 'major', 'minor', 'note'] },
          correctedClaim: { type: 'string' },
          evidence: { type: 'string' },
          reproductionRan: { type: 'boolean' },
          artifactPath: { type: 'string' },
        },
      },
    },
    unverified: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
}

const CRITIC = {
  type: 'object',
  required: ['gaps', 'contradictions', 'overclaims', 'topTen', 'swissVerdict'],
  properties: {
    gaps: { type: 'array', items: { type: 'object', required: ['title', 'whyItMatters', 'howToClose', 'effortDays'], properties: { title: { type: 'string' }, whyItMatters: { type: 'string' }, howToClose: { type: 'string' }, effortDays: { type: 'number' } } } },
    contradictions: { type: 'array', items: { type: 'object', required: ['between', 'what', 'resolution'], properties: { between: { type: 'string' }, what: { type: 'string' }, resolution: { type: 'string' } } } },
    overclaims: { type: 'array', items: { type: 'object', required: ['finding', 'why'], properties: { finding: { type: 'string' }, why: { type: 'string' } } } },
    topTen: { type: 'array', items: { type: 'string' }, description: 'the ten findings (by id) that most determine whether the engine can exceed Swiss, in order, each with one clause of justification' },
    swissVerdict: { type: 'string', description: 'in ten sentences: what "substantially better than Swiss Ephemeris" can truthfully mean for this stack after the audit, and what it cannot mean' },
  },
}

const CAP = 8

if (mode === 'verify') {
  phase('Verify')
  const verified = await pipeline(
    manifest,
    async (m) => {
      const chosen = [...m.blocking, ...m.major].slice(0, CAP)
      const rest = [...m.blocking, ...m.major].slice(CAP).concat(m.other || [])
      if (!chosen.length) return { area: m.key, verdicts: [], unverified: rest, notes: 'no blocking/major findings to verify' }
      const prompt = `You are an adversarial verifier for the '${m.key}' dimension of the Zodiacs engine audit. Read ${SCRATCH}/results/${m.key}.json in full first. Your default stance is that each finding below is WRONG until you have reproduced it yourself: run the auditor's reproduction (or a better one), check the conventions (apparent vs geometric, of-date vs J2000, UT vs TT, degrees vs arcseconds, sign conventions, which Swiss backend actually answered, whether a Horizons quantity is in the frame the auditor assumed), check that the cited file:line says what the finding says, and check that the severity is earned by the rules (blocking = shipped/documented behaviour returns wrong answers or a documented guarantee/claim is unsound or false; major = an accuracy, completeness or capability gap that keeps the stack materially below Swiss, or a claim unsupported by the evidence in the tree; minor = small real defect; note = observation). Return 'confirmed' only when your own run reproduces the claim within its stated numbers; 'adjusted' when the phenomenon is real but the number, cause or severity is wrong (give the corrected claim and severity); 'refuted' when it is not real (say exactly what the auditor got wrong); 'could-not-test' only when the tools genuinely cannot reach it (say why). Set reproductionRan=true only if you actually executed something for that finding. Where a finding asserts a Swiss capability or behaviour, test it on the local pyswisseph rather than trusting either the auditor or your memory.\n${RULES}\nThe auditor's summary of the area: ${m.summary}\n\nVERIFY THESE FINDING IDS (by severity): ${chosen.join(', ')}.\nSet area to '${m.key}'. List in 'unverified' these ids you were not asked to verify: ${rest.join(', ') || '(none)'}.`
      return agent(prompt, { label: `verify:${m.key}`, phase: 'Verify', schema: VERDICTS, effort: 'high' })
        .then(v => v || { area: m.key, verdicts: [], unverified: rest, notes: 'verifier returned null' })
    },
    async (verdictSet, m) => {
      if (!m.blocking.length) return { ...verdictSet, secondLens: [] }
      const second = await agent(`Second, independent lens on the BLOCKING findings of the '${m.key}' dimension of the Zodiacs engine audit: ids ${m.blocking.join(', ')}. Read ${SCRATCH}/results/${m.key}.json first. A first verifier has already run; you do not see its result on purpose. Assume the measurement behind each finding was taken under a mismatched convention or a misread field, and try to make the finding go away: re-derive the number from scratch by a different route (a different reference, a different tool, or the closed form), and only then rule. Return the same verdict vocabulary.\n${RULES}\nSet area to '${m.key}' and leave 'unverified' empty.`,
        { label: `verify2:${m.key}`, phase: 'Verify', schema: VERDICTS, effort: 'high' })
      return { ...verdictSet, secondLens: second ? second.verdicts : [] }
    },
  )
  const verdictSets = verified.filter(Boolean)
  log(`verification done for ${verdictSets.length}/${manifest.length} areas`)
  return { verdictSets }
}

if (mode === 'critic') {
  phase('Critic')
  const verdictsPath = args.verdictsPath
  if (!verdictsPath) throw new Error('critic mode needs args.verdictsPath')
  const digest = manifest.map(m => `## ${m.key}\n${m.summary}\nblocking: ${m.blocking.join(', ') || '-'}; major: ${m.major.join(', ') || '-'}; other: ${(m.other || []).join(', ') || '-'}`).join('\n\n')
  const critic = await agent(`You are the completeness critic for a nine-dimension audit of the Zodiacs astrology engine stack (production @zodiacs/engine on astronomy-engine + site wrappers + the precision alpha on DE440s Chebyshev packs). The owner's goal is an engine substantially more accurate and more advanced than Swiss Ephemeris. Read every ${SCRATCH}/results/<area>.json (the nine areas are listed below) and the verifiers' verdicts at ${verdictsPath} in full. Your job: (1) name what NOBODY examined that bears on the goal — check the file lists in ${ROOT}/src/lib/engine, ${ROOT}/src/lib/time, ${ROOT}/examples/precision-alpha/src/core and ${ROOT}/scripts/build-*.mjs against the areas' coverage and their own notExamined lists; a modality not run; an observational anchor nobody used; a claim nobody verified — each with how to close it and an effort in days; (2) find contradictions between auditors (two different numbers for the same quantity, one calling sound what another calls unsound, an attribution one auditor makes that another's measurement contradicts) and say which is right, checking the tree or running a probe yourself when needed; (3) find overclaims — findings whose severity or wording exceeds their evidence, including verifier verdicts that confirmed without running anything (reproductionRan=false) and any finding whose Swiss comparison rests on a Moshier fallback or a mis-framed Horizons quantity; (4) rank the ten findings that most determine whether the engine can exceed Swiss; (5) write the ten-sentence Swiss verdict: what 'substantially better than Swiss Ephemeris' can truthfully mean for this stack, and what it cannot mean. Be concrete and cite finding ids.\n${RULES}\n\n# AREAS\n${digest}`,
    { label: 'critic', phase: 'Critic', schema: CRITIC, effort: 'high' })
  return { critic }
}

throw new Error(`unknown mode ${mode}`)
