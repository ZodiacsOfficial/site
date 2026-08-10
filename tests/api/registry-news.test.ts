import { describe, expect, it, vi } from 'vitest';
import {
  REGISTRY_NEWS_MAX_FEED_BYTES,
  collectRegistryNews,
  fetchRegistryNewsSource,
  parseRegistryNewsFeed,
  type RegistryNewsFeedCache,
  type RegistryNewsSource,
} from '../../api/_registry/news-wire.js';
import { handleRegistryNews } from '../../api/_registry/news-handler.js';
import compatibilityHandler from '../../api/compatibility.js';

const NOW = Date.parse('2026-08-10T12:00:00.000Z');

function source(overrides: Partial<RegistryNewsSource> = {}): RegistryNewsSource {
  return {
    id: 'publisher',
    publisher: 'Publisher',
    sourceType: 'astrology-news',
    url: 'https://feed.test/rss/',
    feedHosts: ['feed.test'],
    articleHosts: ['feed.test'],
    requireTopicMatch: false,
    ...overrides,
  };
}

function itemXml({
  title = 'Mercury enters Leo',
  link = 'https://feed.test/mercury/?utm_source=rss#comments',
  guid = 'mercury-leo',
  date = 'Mon, 10 Aug 2026 08:00:00 GMT',
  author = 'Editorial desk',
  category = 'Planetary cycles',
  description = 'This must never be exposed.',
} = {}): string {
  return `<item>
    <title><![CDATA[${title}]]></title>
    <link>${link.replaceAll('&', '&amp;')}</link>
    <guid>${guid}</guid>
    <pubDate>${date}</pubDate>
    <dc:creator><![CDATA[${author}]]></dc:creator>
    <category><![CDATA[${category}]]></category>
    <description><![CDATA[${description}]]></description>
    <enclosure url="https://images.attacker.test/tracker.jpg" />
  </item>`;
}

function rss(items: string): string {
  return `<?xml version="1.0"?><rss version="2.0" xmlns:dc="urn:dc"><channel>${items}</channel></rss>`;
}

function xmlResponse(body: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/rss+xml; charset=UTF-8');
  return new Response(body, { ...init, headers });
}

function responseRecorder() {
  return {
    statusCode: 0,
    headers: new Map<string, string>(),
    body: '',
    setHeader(name: string, value: string) { this.headers.set(name, value); },
    end(value: string) { this.body = value; },
  };
}

describe('Registry external headline parser', () => {
  it('returns bounded headline metadata only and strips encoded markup and trackers', () => {
    const items = parseRegistryNewsFeed(source(), rss(itemXml({
      title: 'Mercury &amp; &lt;script&gt;alert(1)&lt;/script&gt; <em>Leo</em>',
      author: '<b>Ada</b>\u202e',
      description: '<img src=x onerror=alert(1)> Full article and transcript.',
    })), NOW);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      sourceType: 'astrology-news',
      publisher: 'Publisher',
      publishedAt: '2026-08-10T08:00:00.000Z',
      title: 'Mercury & alert(1) Leo',
      url: 'https://feed.test/mercury/',
      author: 'Ada',
      topics: expect.arrayContaining(['astrology', 'leo', 'mercury']),
    });
    expect(Object.keys(items[0]).sort()).toEqual([
      'author', 'id', 'publishedAt', 'publisher', 'sourceType', 'title', 'topics', 'url',
    ]);
    expect(JSON.stringify(items)).not.toMatch(/description|transcript|enclosure|tracker\.jpg|onerror/i);
  });

  it('reads Atom alternate links and nested author names', () => {
    const astronomy = source({
      id: 'nasa',
      publisher: 'NASA',
      sourceType: 'astronomy',
      articleHosts: ['science.nasa.gov'],
      requireTopicMatch: true,
    });
    const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>urn:nasa:mars</id>
        <title>Mars spacecraft begins a new orbit</title>
        <link rel="self" href="https://science.nasa.gov/feed-entry" />
        <link rel="alternate" href="https://science.nasa.gov/mars-orbit?utm_medium=rss" />
        <published>2026-08-09T08:00:00Z</published>
        <author><name>NASA Science Editorial Team</name></author>
        <category term="Planetary Science" />
        <summary>Never return this summary.</summary>
      </entry>
    </feed>`;

    expect(parseRegistryNewsFeed(astronomy, atom, NOW)).toEqual([
      expect.objectContaining({
        sourceType: 'astronomy',
        author: 'NASA Science Editorial Team',
        url: 'https://science.nasa.gov/mars-orbit',
        topics: expect.arrayContaining(['astronomy', 'mars', 'planetary-science', 'spaceflight']),
      }),
    ]);
  });

  it('filters stale, invalid, far-future, off-host, and off-topic astronomy items', () => {
    const astronomy = source({
      sourceType: 'astronomy',
      requireTopicMatch: true,
    });
    const items = rss([
      itemXml({ guid: 'stale', date: 'Sat, 20 Jun 2026 00:00:00 GMT' }),
      itemXml({ guid: 'future', date: 'Tue, 11 Aug 2026 12:00:00 GMT' }),
      itemXml({ guid: 'invalid', date: 'not-a-date' }),
      itemXml({ guid: 'off-host', link: 'https://attacker.test/story' }),
      itemXml({ guid: 'off-topic', title: 'Agency names a new administrator', category: 'News' }),
      itemXml({ guid: 'accepted', title: 'A lunar eclipse crosses the sky', category: 'Moon' }),
    ].join(''));

    expect(parseRegistryNewsFeed(astronomy, items, NOW)).toEqual([
      expect.objectContaining({ title: 'A lunar eclipse crosses the sky' }),
    ]);
  });

  it('deduplicates repeated feed identities and produces stable opaque IDs', () => {
    const duplicate = itemXml();
    const repeatedGuid = itemXml({
      link: 'https://feed.test/mercury/canonical-alias',
    });
    const first = parseRegistryNewsFeed(source(), rss(`${duplicate}${duplicate}${repeatedGuid}`), NOW);
    const second = parseRegistryNewsFeed(source(), rss(duplicate), NOW);
    expect(first).toHaveLength(1);
    expect(first[0].id).toMatch(/^[a-f0-9]{24}$/);
    expect(second[0].id).toBe(first[0].id);
  });

  it('rejects DTD/entity declarations before reading item content', () => {
    const payload = `<!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
      <rss><channel>${itemXml({ title: '&xxe;' })}</channel></rss>`;
    expect(() => parseRegistryNewsFeed(source(), payload, NOW)).toThrow(/DTD|entity/i);
  });

  it('rejects an in-memory payload above the strict byte cap', () => {
    expect(() => parseRegistryNewsFeed(
      source(),
      ' '.repeat(REGISTRY_NEWS_MAX_FEED_BYTES + 1),
      NOW,
    )).toThrow(/byte limit/i);
  });
});

describe('Registry external source fetch boundary', () => {
  it('follows an allowlisted redirect manually and rejects an unlisted destination', async () => {
    const allowedFetcher = vi.fn(async (input: URL | RequestInfo, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rss/')) {
        return new Response(null, { status: 302, headers: { location: '/rss/current.xml' } });
      }
      return xmlResponse(rss(itemXml()));
    });
    await expect(fetchRegistryNewsSource(source(), {
      fetcher: allowedFetcher as typeof fetch,
      now: () => NOW,
      cache: new Map(),
    })).resolves.toHaveLength(1);
    expect(allowedFetcher).toHaveBeenCalledTimes(2);
    expect(allowedFetcher.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' });

    const rejectedFetcher = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location: 'https://169.254.169.254/latest/meta-data/' },
    }));
    await expect(fetchRegistryNewsSource(source(), {
      fetcher: rejectedFetcher as typeof fetch,
      now: () => NOW,
      cache: new Map(),
    })).rejects.toThrow(/allowlist/i);
    expect(rejectedFetcher).toHaveBeenCalledOnce();
  });

  it('enforces the redirect limit even when every hop stays on the allowed host', async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      const hop = Number(url.searchParams.get('hop') ?? 0);
      return new Response(null, {
        status: 302,
        headers: { location: `https://feed.test/rss/?hop=${hop + 1}` },
      });
    });
    await expect(fetchRegistryNewsSource(source(), {
      fetcher: fetcher as typeof fetch,
      cache: new Map(),
      timeoutMs: 100,
    })).rejects.toThrow(/redirect limit/i);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('rejects HTML and declared oversized bodies without parsing them', async () => {
    await expect(fetchRegistryNewsSource(source(), {
      fetcher: vi.fn(async () => new Response('<html>not a feed</html>', {
        headers: { 'content-type': 'text/html' },
      })) as typeof fetch,
      cache: new Map(),
    })).rejects.toThrow(/non-XML/i);

    await expect(fetchRegistryNewsSource(source(), {
      fetcher: vi.fn(async () => xmlResponse('tiny', {
        headers: {
          'content-type': 'application/rss+xml',
          'content-length': String(REGISTRY_NEWS_MAX_FEED_BYTES + 1),
        },
      })) as typeof fetch,
      cache: new Map(),
    })).rejects.toThrow(/declared byte limit/i);
  });

  it('stops an undeclared streamed body at the byte cap', async () => {
    const oversized = new Uint8Array(REGISTRY_NEWS_MAX_FEED_BYTES + 1).fill(32);
    await expect(fetchRegistryNewsSource(source(), {
      fetcher: vi.fn(async () => new Response(oversized, {
        headers: { 'content-type': 'application/rss+xml' },
      })) as typeof fetch,
      cache: new Map(),
    })).rejects.toThrow(/byte limit/i);
  });

  it('uses conditional validators and cached headlines for a valid 304 response', async () => {
    const cache: RegistryNewsFeedCache = new Map();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(xmlResponse(rss(itemXml()), {
        headers: {
          'content-type': 'application/rss+xml',
          etag: '"edition-1"',
          'last-modified': 'Mon, 10 Aug 2026 08:00:00 GMT',
        },
      }))
      .mockResolvedValueOnce(new Response(null, { status: 304 }));

    const first = await fetchRegistryNewsSource(source(), {
      fetcher,
      now: () => NOW,
      cache,
    });
    const second = await fetchRegistryNewsSource(source(), {
      fetcher,
      now: () => NOW,
      cache,
    });
    expect(second).toEqual(first);
    const requestHeaders = fetcher.mock.calls[1]?.[1]?.headers as Record<string, string>;
    expect(requestHeaders['If-None-Match']).toBe('"edition-1"');
    expect(requestHeaders['If-Modified-Since']).toBe('Mon, 10 Aug 2026 08:00:00 GMT');
  });

  it('bounds a fetcher that never settles', async () => {
    const fetcher = vi.fn(() => new Promise<Response>(() => {}));
    await expect(fetchRegistryNewsSource(source(), {
      fetcher: fetcher as typeof fetch,
      cache: new Map(),
      timeoutMs: 2,
    })).rejects.toThrow(/timed out/i);
  });
});

describe('Registry news aggregate and endpoint', () => {
  it('keeps healthy publishers when another source fails and deduplicates canonical URLs', async () => {
    const sources = [
      source({ id: 'one', publisher: 'One', url: 'https://feed.test/one' }),
      source({ id: 'two', publisher: 'Two', url: 'https://feed.test/two' }),
      source({ id: 'broken', publisher: 'Broken', url: 'https://feed.test/broken' }),
    ];
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      if (String(input).endsWith('/broken')) throw new Error('unhealthy');
      return xmlResponse(rss(itemXml()));
    });
    const result = await collectRegistryNews({
      sources,
      fetcher: fetcher as typeof fetch,
      cache: new Map(),
      now: () => NOW,
    });
    expect(result.successfulSources).toBe(2);
    expect(result.response).toEqual({
      schema: 'registry-news.v1',
      updatedAt: '2026-08-10T12:00:00.000Z',
      items: [expect.objectContaining({ url: 'https://feed.test/mercury/' })],
    });
  });

  it('returns the stable public shape with shared-CDN caching', async () => {
    const response = responseRecorder();
    await handleRegistryNews(
      { method: 'GET' },
      response,
      {
        sources: [source()],
        fetcher: vi.fn(async () => xmlResponse(rss(itemXml()))) as typeof fetch,
        cache: new Map(),
        now: () => NOW,
      },
    );
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      schema: 'registry-news.v1',
      updatedAt: '2026-08-10T12:00:00.000Z',
      items: [expect.objectContaining({
        sourceType: 'astrology-news',
        publisher: 'Publisher',
        author: 'Editorial desk',
        topics: expect.any(Array),
      })],
    });
    expect(response.headers.get('Cache-Control')).toMatch(/s-maxage=900/);
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toMatch(/stale-while-revalidate=3600/);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('uses a short retry cache for an all-source failure without exposing health internals', async () => {
    const response = responseRecorder();
    await handleRegistryNews(
      { method: 'GET' },
      response,
      {
        sources: [source()],
        fetcher: vi.fn(async () => { throw new Error('offline'); }) as typeof fetch,
        cache: new Map(),
        now: () => NOW,
      },
    );
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      schema: 'registry-news.v1',
      updatedAt: '2026-08-10T12:00:00.000Z',
      items: [],
    });
    expect(response.body).not.toMatch(/health|error|source/i);
    expect(response.headers.get('Cache-Control')).toMatch(/s-maxage=60/);
  });

  it('allows GET only', async () => {
    const response = responseRecorder();
    await handleRegistryNews({ method: 'POST' }, response);
    expect(response.statusCode).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(JSON.parse(response.body)).toEqual({ error: 'method' });
  });

  it('dispatches the stable news URL through the shared compatibility function', async () => {
    const response = responseRecorder();
    await compatibilityHandler(
      { method: 'POST', query: { action: 'registry-news' } },
      response,
    );
    expect(response.statusCode).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
    expect(JSON.parse(response.body)).toEqual({ error: 'method' });
  });
});
