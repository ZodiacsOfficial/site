// Human context for the twelve Registry profiles. The People slugs are checked
// against src/data/people.json by build-sign-pages.mjs before any page is
// written, so a broken or misclassified profile fails the build.
export const SIGN_PROFILE_PEOPLE = Object.freeze({
  aries: ['aretha-franklin', 'maya-angelou', 'charlie-chaplin', 'vincent-van-gogh'],
  taurus: ['audrey-hepburn', 'ella-fitzgerald', 'karl-marx', 'sigmund-freud'],
  gemini: ['marilyn-monroe', 'prince', 'judy-garland', 'walt-whitman'],
  cancer: ['alan-turing', 'frida-kahlo', 'nelson-mandela', 'george-orwell'],
  leo: ['alfred-hitchcock', 'amelia-earhart', 'andy-warhol', 'coco-chanel'],
  virgo: ['freddie-mercury', 'amy-winehouse', 'mary-shelley', 'michael-faraday'],
  libra: ['john-lennon', 'mahatma-gandhi', 'luciano-pavarotti', 'eleanor-roosevelt'],
  scorpio: ['marie-curie', 'pablo-picasso', 'bill-gates', 'leonardo-dicaprio'],
  sagittarius: ['bruce-lee', 'jane-austen', 'mark-twain', 'tina-turner'],
  capricorn: ['david-bowie', 'elvis-presley', 'martin-luther-king-jr', 'stephen-hawking'],
  aquarius: ['bob-marley', 'charles-darwin', 'rosa-parks', 'wolfgang-amadeus-mozart'],
  pisces: ['albert-einstein', 'alexander-graham-bell', 'gabriel-garcia-marquez', 'yuri-gagarin'],
});

// One short line of sign pride for each Registry profile. These are rally
// lines, not factual personality claims, so they stay concise and clearly
// editorial rather than pretending to describe every person born under a sign.
export const SIGN_PROFILE_RALLY_LINES = Object.freeze({
  aries: 'Aries does not wait for permission.',
  taurus: 'Taurus knows what is worth holding onto.',
  gemini: 'Gemini is never only one thing.',
  cancer: 'Cancer remembers who showed up.',
  leo: 'Leo refuses to disappear into the background.',
  virgo: 'Virgo sees the difference between finished and done right.',
  libra: 'Libra knows that choosing is a form of courage.',
  scorpio: 'Scorpio has never needed to be understood by everyone.',
  sagittarius: 'Sagittarius was never made for one horizon.',
  capricorn: 'Capricorn respects the climb more than the applause.',
  aquarius: 'Aquarius would rather be early than ordinary.',
  pisces: 'Pisces notices what the room is not saying.',
});

export const SIGN_PROFILE_PERSON_ROLES = Object.freeze({
  'aretha-franklin': 'Singer', 'maya-angelou': 'Poet and writer', 'charlie-chaplin': 'Actor and filmmaker', 'vincent-van-gogh': 'Painter',
  'audrey-hepburn': 'Actor', 'ella-fitzgerald': 'Singer', 'karl-marx': 'Philosopher and economist', 'sigmund-freud': 'Psychoanalyst',
  'marilyn-monroe': 'Actor', prince: 'Musician', 'judy-garland': 'Actor and singer', 'walt-whitman': 'Poet',
  'alan-turing': 'Mathematician and computer scientist', 'frida-kahlo': 'Painter', 'nelson-mandela': 'Statesman', 'george-orwell': 'Writer',
  'alfred-hitchcock': 'Filmmaker', 'amelia-earhart': 'Aviator', 'andy-warhol': 'Artist', 'coco-chanel': 'Fashion designer',
  'freddie-mercury': 'Singer', 'amy-winehouse': 'Singer and songwriter', 'mary-shelley': 'Novelist', 'michael-faraday': 'Scientist',
  'john-lennon': 'Musician', 'mahatma-gandhi': 'Independence leader', 'luciano-pavarotti': 'Opera singer', 'eleanor-roosevelt': 'Diplomat',
  'marie-curie': 'Physicist', 'pablo-picasso': 'Painter', 'bill-gates': 'Computer scientist and philanthropist', 'leonardo-dicaprio': 'Actor and producer',
  'bruce-lee': 'Martial artist and actor', 'jane-austen': 'Novelist', 'mark-twain': 'Writer', 'tina-turner': 'Singer',
  'david-bowie': 'Musician', 'elvis-presley': 'Singer and actor', 'martin-luther-king-jr': 'Civil rights leader', 'stephen-hawking': 'Physicist',
  'bob-marley': 'Musician', 'charles-darwin': 'Naturalist', 'rosa-parks': 'Civil rights leader', 'wolfgang-amadeus-mozart': 'Composer',
  'albert-einstein': 'Physicist', 'alexander-graham-bell': 'Inventor', 'gabriel-garcia-marquez': 'Novelist', 'yuri-gagarin': 'Astronaut',
});

// A single-sign visual story for review. If the Scorpio prototype earns its
// place, this same shape can later carry one distinctive story for every sign.
// Copy stays short on the page; source links sit inside the optional details.
export const SIGN_PROFILE_LEGACY = Object.freeze({
  scorpio: Object.freeze({
    eyebrow: 'The story in the sky',
    title: 'Rival of Mars',
    star: 'Antares is the red star at the heart of the Scorpion. Its name means “rival of Mars.”',
    myth: 'In one old Greek story, the scorpion defeats Orion. The sky keeps them apart: Scorpio rises as Orion slips away.',
    older: 'In the Epic of Gilgamesh, scorpion guardians watch the gates of the Sun.',
    sources: Object.freeze([
      Object.freeze({ label: 'Antares', href: 'https://www.jpl.nasa.gov/videos/whats-up-january-2020/' }),
      Object.freeze({ label: 'Scorpio and Orion', href: 'https://stardate.org/podcast/2026-05-03' }),
      Object.freeze({ label: 'Scorpion guardians', href: 'https://www.penn.museum/sites/expedition/highlands-and-lowlands/' }),
    ]),
  }),
});

export function validateSignProfileRallyLines(signs) {
  const errors = [];
  const expected = [...signs];
  const actual = Object.keys(SIGN_PROFILE_RALLY_LINES);
  const missing = expected.filter((sign) => !actual.includes(sign));
  const extra = actual.filter((sign) => !expected.includes(sign));
  if (missing.length) errors.push(`Missing rally lines: ${missing.join(', ')}`);
  if (extra.length) errors.push(`Unexpected rally lines: ${extra.join(', ')}`);

  const seen = new Set();
  for (const sign of expected) {
    const line = SIGN_PROFILE_RALLY_LINES[sign];
    const name = sign.charAt(0).toUpperCase() + sign.slice(1);
    if (typeof line !== 'string' || line !== line.trim() || line.length < 16 || line.length > 72) {
      errors.push(`${sign}: rally line must be a trimmed string between 16 and 72 characters`);
      continue;
    }
    if (!line.startsWith(`${name} `)) errors.push(`${sign}: rally line must begin with “${name}”`);
    if (!/[.!?]$/u.test(line)) errors.push(`${sign}: rally line must end with punctuation`);
    if (seen.has(line)) errors.push(`${sign}: rally line must be unique`);
    seen.add(line);
  }
  return errors;
}

export function validateSignProfileCommunityData(signs) {
  const errors = [];
  for (const sign of signs) {
    for (const slug of SIGN_PROFILE_PEOPLE[sign] ?? []) {
      if (!SIGN_PROFILE_PERSON_ROLES[slug]) errors.push(`${sign}: missing role for ${slug}`);
    }
  }
  return errors;
}

// Living People profiles are protected by default. These are the only two
// owner-authorized exceptions, and only as direct nofollow links from the
// Scorpio Registry profile. The page builder also checks this allowlist
// against the reviewed People index policy before emitting any page.
export const SIGN_PROFILE_PROTECTED_LINKS = Object.freeze({
  'bill-gates': Object.freeze({
    sign: 'scorpio',
    surface: '/registry/scorpio/',
    rel: 'nofollow',
  }),
  'leonardo-dicaprio': Object.freeze({
    sign: 'scorpio',
    surface: '/registry/scorpio/',
    rel: 'nofollow',
  }),
});

export function registryProfilePersonLinkRel({ sign, person, policyAuthorization }) {
  const protectedAuthorization = SIGN_PROFILE_PROTECTED_LINKS[person.slug] ?? null;
  if (person.indexEligibility?.eligible) {
    if (person.living || protectedAuthorization) {
      throw new Error(`${person.slug}: protected-link authorization and People eligibility disagree`);
    }
    return null;
  }

  const policyProfiles = policyAuthorization?.profiles ?? [];
  if (
    !person.living
    || !protectedAuthorization
    || protectedAuthorization.sign !== sign
    || protectedAuthorization.surface !== `/registry/${sign}/`
    || protectedAuthorization.rel !== 'nofollow'
    || policyAuthorization?.surface !== protectedAuthorization.surface
    || !policyProfiles.includes(person.slug)
  ) {
    throw new Error(
      `${person.slug}: protected/non-indexable People records require exact, surface-specific authorization`
    );
  }
  return 'nofollow';
}
