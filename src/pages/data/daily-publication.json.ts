import publication from '../../data/daily-publication.json';
import manifest from '../../data/daily-publication-manifest.json';
import dailyFacts from '../../data/daily.json';

const transitSources = import.meta.glob('../../data/transits-*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;
const transitSource = manifest.facts.eventsSource
  ? Object.entries(transitSources).find(([path]) => path.endsWith(manifest.facts.eventsSource!.split('/').at(-1)!))?.[1] ?? null
  : null;

export const prerender = true;

export function GET() {
  return new Response(`${JSON.stringify({ manifest, inputs: { dailyFacts, transitSource }, publication }, null, 2)}\n`, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, must-revalidate',
    },
  });
}
