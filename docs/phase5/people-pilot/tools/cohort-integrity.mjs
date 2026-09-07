/**
 * Admission spacing is a selection heuristic, not permission to retain a
 * false birth date. A reviewed correction must name the exact existing pair,
 * dates and source record. Current spacing remains visible as a variance.
 */
export function inspectCohortSpacing(people, corrections, baseline, minimumDays = 365) {
  const bySlug = new Map(people.map((person) => [person.slug, person]));
  const published = new Map((baseline?.people ?? []).map((person) => [person.slug, person.birthDate]));
  const invalid = [];
  const permitted = new Map();
  for (const correction of corrections) {
    const variance = correction.retainedSelectionVariance;
    if (!variance) continue;
    const pair = variance.pair ?? [];
    const dates = variance.dates ?? [];
    const members = pair.map((slug) => bySlug.get(slug));
    const gap = dates.length === 2
      ? Math.abs(Date.parse(dates[1]) - Date.parse(dates[0])) / 86_400_000 : NaN;
    const ok = correction.schema === 'zodiacs.phase5.factual-correction.v1'
      && correction.id === 'sun-yat-sen-2026-09-07'
      && correction.subjectSlug === 'sun-yat-sen'
      && correction.decision === 'corrected'
      && correction.previousRelease === baseline?.sourceCommit
      && correction.previousRelease === '3ce109d2b36985d7f0463f1748f8aca7f5541615'
      && correction.sources?.length >= 2
      && correction.sources.every((source) => source.title?.length && source.supports?.length
        && /^https:\/\/(?:www\.)?(?:wikidata\.org|yatsen\.gov\.tw)\//u.test(source.url ?? ''))
      && pair.length === 2 && new Set(pair).size === 2 && dates.length === 2
      && pair.includes(correction.subjectSlug)
      && correction.previous?.birthDate !== correction.corrected?.birthDate
      && correction.previous?.birthDate === published.get(correction.subjectSlug)
      && dates[pair.indexOf(correction.subjectSlug)] === correction.corrected?.birthDate
      && members.every((person, index) => person
        && published.has(person.slug)
        && (person.slug === correction.subjectSlug || published.get(person.slug) === dates[index])
        && person.birthDate.computedGregorianDate === dates[index]
        && person.sunSign.slug === variance.sign)
      && gap === variance.actualGapDays && gap < minimumDays
      && variance.admissionMinimumGapDays === minimumDays;
    const key = [...pair].sort().join('|');
    if (!ok || permitted.has(key)) invalid.push(correction.id ?? 'unnamed correction');
    else permitted.set(key, correction.id);
  }
  const rows = [];
  const unexplained = [];
  const reviewed = [];
  for (const sign of new Set(people.map((person) => person.sunSign.slug))) {
    const group = people.filter((person) => person.sunSign.slug === sign)
      .sort((a, b) => a.birthDate.computedGregorianDate.localeCompare(b.birthDate.computedGregorianDate));
    let minGapDays = Infinity;
    let closest = '';
    // Inspect every violating pair, not just the nearest one: an exception
    // must never mask a second close admission in the same sign.
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i]; const b = group[j];
        const gapDays = (Date.parse(b.birthDate.computedGregorianDate)
          - Date.parse(a.birthDate.computedGregorianDate)) / 86_400_000;
        if (gapDays < minGapDays) { minGapDays = gapDays; closest = `${a.slug} / ${b.slug}`; }
        if (gapDays >= minimumDays) break;
        const key = [a.slug, b.slug].sort().join('|');
        const row = { sign, pair: [a.slug, b.slug], gapDays, correction: permitted.get(key) ?? null };
        (row.correction ? reviewed : unexplained).push(row);
      }
    }
    rows.push({ sign, count: group.length, minGapDays, closest });
  }
  return { rows, reviewed, unexplained, invalid };
}
