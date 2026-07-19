import constitution from '../../lib/editorial-policy/constitution.v1.json';

export const prerender = true;

export function GET() {
  return new Response(`${JSON.stringify(constitution, null, 2)}\n`, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300, must-revalidate',
    },
  });
}
