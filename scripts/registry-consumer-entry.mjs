const ENTRY_START = '<!-- registry-collection-entry:start -->';
const ENTRY_END = '<!-- registry-collection-entry:end -->';
const HERO_START = '<!-- registry-collection-hero:start -->';
const HERO_END = '<!-- registry-collection-hero:end -->';
const HERO_REGION = new RegExp(
  `\\n[ \\t]*${HERO_START}[\\s\\S]*?${HERO_END}`,
);

export const REGISTRY_CONSUMER_ENTRY_COPY = Object.freeze({
  title: 'See the signs in a public wallet',
  description: 'Open the Cabinet of Twelve to view the sign pattern held by a public address. No wallet connection is required.',
  link: 'Open the Cabinet of Twelve →',
});

function replaceLiteral(source, before, after) {
  return source.includes(before) ? source.replaceAll(before, after) : source;
}

/**
 * Adapts the optional legacy Cabinet injection to the consumer Registry.
 * The feature flag and canonical route still come from the shared Registry
 * module; only presentation is changed here so the cinematic hero remains
 * exactly two actions and the no-JavaScript preview uses everyday language.
 */
export function consumerizeRegistryCollection(source, legacyCopy) {
  const outputWithoutHero = source.replace(HERO_REGION, '');
  let output = outputWithoutHero;

  const entryStart = output.indexOf(ENTRY_START);
  const entryEnd = output.indexOf(ENTRY_END);
  if (entryStart === -1 || entryEnd < entryStart) return output;

  const before = output.slice(entryStart, entryEnd + ENTRY_END.length);
  const after = [
    [legacyCopy.title, REGISTRY_CONSUMER_ENTRY_COPY.title],
    [legacyCopy.description, REGISTRY_CONSUMER_ENTRY_COPY.description],
    [legacyCopy.link, REGISTRY_CONSUMER_ENTRY_COPY.link],
  ].reduce((region, [from, to]) => replaceLiteral(region, from, to), before);
  return output.replace(before, after);
}
