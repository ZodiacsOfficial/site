// Offline metadata contract. This checks claims and their exact immutable URL;
// it does not authenticate a source commit or fetch a remote artifact.
const keys = [
  'schemaVersion', 'name', 'version', 'releaseStatus', 'releaseLabel',
  'artifactPath', 'artifactUrl', 'artifactRepository', 'artifactCommit',
  'artifactRepositoryPath', 'sha256', 'sourceRepository', 'sourceCommit',
  'sourcePackagePath', 'evidenceRepository', 'evidenceCommit', 'evidencePaths',
];
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, expected) => record(value)
  && Object.keys(value).length === expected.length
  && expected.every((key) => Object.hasOwn(value, key));
const matches = (value, pattern) => typeof value === 'string' && pattern.exec(value)?.[0] === value;
const commit = (value) => matches(value, /^[a-f0-9]{40}$/u) && value.length === 40;

export function assertEngineCandidate(candidate) {
  const fail = () => { throw new Error('Invalid engine candidate metadata'); };
  if (!exactKeys(candidate, keys)) fail();
  if (candidate.schemaVersion !== 1 || candidate.name !== '@zodiacs/engine'
    || !matches(candidate.version, /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-rc\.(?:0|[1-9]\d*)$/u)
    || candidate.version.includes('\n')
    || candidate.releaseStatus !== 'unpublished-candidate'
    || candidate.releaseLabel !== 'Unpublished candidate'
    || !matches(candidate.sha256, /^[a-f0-9]{64}$/u) || candidate.sha256.length !== 64
    || !commit(candidate.sourceCommit) || !commit(candidate.artifactCommit) || !commit(candidate.evidenceCommit)
    || candidate.sourceRepository !== 'https://github.com/ZodiacsOfficial/sdk'
    || candidate.sourcePackagePath !== 'packages/engine'
    || candidate.evidenceRepository !== 'https://github.com/ZodiacsOfficial/site'
    || !['https://github.com/ZodiacsOfficial/site', 'https://github.com/ZodiacsOfficial/sdk'].includes(candidate.artifactRepository)) fail();
  const file = `zodiacs-engine-${candidate.version}.tgz`;
  const repository = candidate.artifactRepository.split('/').at(-1);
  if (candidate.artifactPath !== `vendor/${file}`
    || candidate.artifactRepositoryPath !== `${repository === 'sdk' ? 'artifacts' : 'vendor'}/${file}`
    || candidate.artifactUrl !== `https://raw.githubusercontent.com/ZodiacsOfficial/${repository}/${candidate.artifactCommit}/${candidate.artifactRepositoryPath}`) fail();
  if (!exactKeys(candidate.evidencePaths, ['ledger', 'node22', 'node24', 'publicConsumer'])) fail();
  for (const path of Object.values(candidate.evidencePaths)) {
    if (!matches(path, /^docs\/platform\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:md|json|log)$/u)
      || path.includes('\n')) fail();
  }
  return candidate;
}
