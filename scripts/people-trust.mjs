const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/u;
const HTTPS_URL = /^https:\/\//u;
const REQUIRED_OVERRIDE_FACTS = ['birthDate', 'deathDate', 'birthPlace'];

function parseIsoDay(value) {
  if (!ISO_DAY.test(value ?? '')) return null;
  const instant = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(instant.getTime()) || instant.toISOString().slice(0, 10) !== value
    ? null
    : instant;
}

function ageOnDate(birthDate, deathDate) {
  let age = deathDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const deathMonthDay = `${String(deathDate.getUTCMonth() + 1).padStart(2, '0')}-${String(deathDate.getUTCDate()).padStart(2, '0')}`;
  const birthMonthDay = `${String(birthDate.getUTCMonth() + 1).padStart(2, '0')}-${String(birthDate.getUTCDate()).padStart(2, '0')}`;
  if (deathMonthDay < birthMonthDay) age -= 1;
  return age;
}

export function trustOverrideFor(policy, slug) {
  return policy.overrides.find((entry) => entry.slug === slug) ?? null;
}

export function selectPublishablePeople(people, policy) {
  const quarantined = new Set(policy.quarantinedProfiles.map((entry) => entry.slug));
  return people.filter((person) => !quarantined.has(person.slug));
}

export function validatePeopleTrustPolicy(policy, manifest) {
  const failures = [];
  if (policy.schema !== 'zodiacs.phase5.people-trust-policy.v1') {
    failures.push(`unsupported trust policy schema: ${policy.schema ?? 'missing'}`);
  }
  if (!Array.isArray(policy.overrides) || !Array.isArray(policy.quarantinedProfiles)) {
    failures.push('trust policy must contain overrides and quarantinedProfiles arrays');
    return failures;
  }

  const manifestBySlug = new Map(manifest.people.map((person) => [person.slug, person]));
  const seenSlugs = new Set();
  const seenQids = new Set();
  for (const override of policy.overrides) {
    const source = manifestBySlug.get(override.slug);
    if (!source) failures.push(`${override.slug}: override names an unknown profile`);
    if (source && source.qid !== override.qid) {
      failures.push(`${override.slug}: override QID ${override.qid} does not match ${source.qid}`);
    }
    if (seenSlugs.has(override.slug)) failures.push(`${override.slug}: duplicate override slug`);
    if (seenQids.has(override.qid)) failures.push(`${override.qid}: duplicate override QID`);
    seenSlugs.add(override.slug);
    seenQids.add(override.qid);

    if (!parseIsoDay(override.reviewedAtUtc?.slice(0, 10))) {
      failures.push(`${override.slug}: reviewedAtUtc is not a valid ISO instant`);
    }
    if (override.fields?.birthTimePrecision !== 'unknown') {
      failures.push(`${override.slug}: reviewed overrides may not invent a birth time`);
    }
    if (!Array.isArray(override.sources) || override.sources.length < 1) {
      failures.push(`${override.slug}: override needs at least one authoritative source`);
    }
    const supportedFacts = new Set();
    for (const exception of override.selectionExceptions ?? []) {
      if (exception.gate !== 'same-sign-separation' || !exception.reason) {
        failures.push(`${override.slug}: unsupported or incomplete selection exception`);
      }
    }
    for (const sourceRecord of override.sources ?? []) {
      if (!HTTPS_URL.test(sourceRecord.url ?? '') || !sourceRecord.publisher
          || !parseIsoDay(sourceRecord.accessedAtUtc)) {
        failures.push(`${override.slug}: authoritative source metadata is incomplete`);
      }
      if (!Array.isArray(sourceRecord.supports) || sourceRecord.supports.length < 1) {
        failures.push(`${override.slug}: authoritative source must name the facts it supports`);
      } else {
        for (const fact of sourceRecord.supports) {
          if (!REQUIRED_OVERRIDE_FACTS.includes(fact)) {
            failures.push(`${override.slug}: authoritative source names unsupported fact ${fact}`);
          } else {
            supportedFacts.add(fact);
          }
        }
      }
    }
    const missingFacts = REQUIRED_OVERRIDE_FACTS.filter((fact) => !supportedFacts.has(fact));
    if (missingFacts.length > 0) {
      failures.push(`${override.slug}: authoritative sources do not cover ${missingFacts.join(', ')}`);
    }
  }

  const quarantinedSlugs = new Set();
  for (const entry of policy.quarantinedProfiles) {
    const source = manifestBySlug.get(entry.slug);
    if (!source) failures.push(`${entry.slug}: quarantine names an unknown profile`);
    if (source && source.qid !== entry.qid) {
      failures.push(`${entry.slug}: quarantine QID ${entry.qid} does not match ${source.qid}`);
    }
    if (quarantinedSlugs.has(entry.slug)) failures.push(`${entry.slug}: duplicate quarantine entry`);
    quarantinedSlugs.add(entry.slug);
    if (!entry.reason || !parseIsoDay(entry.quarantinedAtUtc?.slice(0, 10))) {
      failures.push(`${entry.slug}: quarantine metadata is incomplete`);
    }
  }
  return failures;
}

export function applyEvidenceTrustOverride(evidence, override) {
  if (!override) return evidence;
  const { fields } = override;
  const birthTime = `+${fields.birthDate}T00:00:00Z`;
  return {
    ...evidence,
    birth: {
      ...evidence.birth,
      claimCount: 1,
      distinctDayPrecisionValues: [`${birthTime}|proleptic-gregorian`],
      allValues: [{
        time: birthTime,
        precision: 11,
        calendar: 'proleptic-gregorian',
        rank: 'preferred',
      }],
      time: birthTime,
      precision: 'day',
      calendarModel: 'proleptic-gregorian',
      timeOfDay: null,
      timeOfDayEvidence: 'No reviewed authoritative source supplies a birth time.',
    },
    death: {
      time: `+${fields.deathDate}T00:00:00Z`,
      precision: 'day',
      calendarModel: 'proleptic-gregorian',
    },
    living: false,
    birthPlace: {
      entity: fields.birthPlace.entity,
      label: fields.birthPlace.entityLabel,
      entityUrl: `https://www.wikidata.org/wiki/${fields.birthPlace.entity}`,
      country: fields.birthPlace.country,
      claimCount: 1,
      coordinates: {
        sourceEntity: fields.birthPlace.coordinates.sourceEntity,
        sourceEntityLabel: fields.birthPlace.coordinates.sourceEntityLabel,
        latitude: fields.birthPlace.coordinates.latitude,
        longitude: fields.birthPlace.coordinates.longitude,
        precision: fields.birthPlace.coordinates.wikidataPrecision,
        escalationSteps: fields.birthPlace.coordinates.escalationSteps,
      },
    },
  };
}

export function applyPersonTrustOverride(person, override) {
  if (!override) return person;
  const { fields } = override;
  return {
    ...person,
    shortDescription: fields.shortDescription,
    birthDate: {
      ...person.birthDate,
      storedValue: fields.birthDate,
      displayedDate: fields.birthDate,
      computedGregorianDate: fields.birthDate,
      birthdayCrossLinkKey: fields.birthDate,
      birthdayRoute: fields.birthdayRoute,
    },
    birthTime: null,
    timeQuality: 'unknown',
    birthTimeEvidence: 'No reviewed authoritative source supplies a birth time.',
    birthPlace: structuredClone(fields.birthPlace),
    sources: {
      ...person.sources,
      authoritative: structuredClone(override.sources),
    },
    reviewedAtUtc: override.reviewedAtUtc,
  };
}

export function validatePersonTrustFacts({
  slug,
  birthDate,
  deathDate = null,
  living = false,
  birthPlace,
}, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const failures = [];
  const birth = parseIsoDay(birthDate);
  const death = deathDate ? parseIsoDay(deathDate) : null;
  const current = parseIsoDay(today);
  if (!birth) failures.push('birth date is not a real ISO calendar day');
  if (deathDate && !death) failures.push('death date is not a real ISO calendar day');
  if (!current) failures.push('validation date is not a real ISO calendar day');
  if (birth && current && birth > current) failures.push('birth date is in the future');
  if (death && current && death > current) failures.push('death date is in the future');
  if (birth && death && death < birth) failures.push('death date precedes birth date');
  if (birth && death) {
    const age = ageOnDate(birth, death);
    if (age < 10 || age > 115) failures.push(`age at death ${age} is outside the 10–115 review boundary`);
  }
  if (!living && !deathDate) failures.push('deceased profile has no death date');
  if (living && deathDate) failures.push('living profile carries a death date');

  const country = birthPlace?.country ?? null;
  if (!birthPlace?.entity || !birthPlace?.coordinates) {
    failures.push('birthplace or coordinates are missing');
  } else if (country && birthPlace.entity === country.entity) {
    failures.push('birthplace resolves to the country entity');
  }
  if (country && birthPlace?.coordinates?.sourceEntity === country.entity) {
    failures.push('birthplace coordinates resolve to a country centroid');
  }
  const labelParts = (birthPlace?.normalisedLabel ?? '')
    .split(',').map((part) => part.trim().toLocaleLowerCase('en')).filter(Boolean);
  if (labelParts.length > 1 && new Set(labelParts).size !== labelParts.length) {
    failures.push('birthplace label repeats the same place and country');
  }
  return failures.map((failure) => `${slug}: ${failure}`);
}

export function materializeTrustedPerson({ source, computed, copy, override, similarity }) {
  const trusted = applyPersonTrustOverride(source, override);
  const longitude = computed.computation.longitude;
  const offset = computed.computation.utcOffsetMinutesAtBirth;
  const rawMeridianResidualMinutes = (longitude / 15) * 60 - offset;
  const meridianResidualMinutes = Number(rawMeridianResidualMinutes.toFixed(2));
  return {
    ...trusted,
    shortDescription: override?.fields.shortDescription ?? copy.identity,
    birthDate: {
      ...trusted.birthDate,
      storedValue: computed.storedDate,
      displayedDate: computed.displayedDate,
      computedGregorianDate: computed.gregorianDate,
      birthdayCrossLinkKey: computed.birthdayCrossLinkKey,
    },
    birthPlace: {
      ...trusted.birthPlace,
      timeZone: computed.computation.timeZone,
    },
    computation: {
      ...computed.computation,
      meridianResidualMinutes,
      meridianResidualMoonDegrees: Number((Math.abs(rawMeridianResidualMinutes) / 60 * 0.55).toFixed(4)),
    },
    sunSign: {
      slug: computed.sun.sign,
      name: computed.sun.signName,
      degree: computed.sun.degree,
      determinable: !computed.cusp.ambiguous,
      cuspCheck: computed.cusp,
    },
    moon: computed.moon,
    unknownTimeErrorBandDegrees: computed.unknownTimeErrorBandDegrees,
    placements: computed.placements,
    aspectsStableAcrossCivilDay: computed.aspectsStableAcrossCivilDay,
    patterns: computed.patterns,
    contentDepth: override ? {
      originalWords: copy.measurements.originalWords,
      substantiveStatements: copy.measurements.substantiveStatements,
      highestPairwiseSimilarity: similarity,
    } : trusted.contentDepth,
    copy: {
      title: copy.title,
      metaDescription: copy.metaDescription,
      lede: copy.lede,
      ledeFact: copy.ledeFact,
      blocks: copy.blocks,
      birthdayLink: copy.birthdayLink,
      signLink: copy.signLink,
      measurements: copy.measurements,
    },
  };
}
