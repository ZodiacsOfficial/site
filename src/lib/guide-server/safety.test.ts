import { describe, expect, it, vi } from 'vitest';
import {
  GUIDE_OPENAI_RESPONSES_URL,
  type GuideProviderProjection,
} from './openai';
import {
  GUIDE_PROVIDER_MODEL,
  GUIDE_SAFETY_RESPONSE_MODEL,
} from './policy';
import {
  classifyGuideSafety,
  guideSafetyReply,
  streamSafeGuideOpenAIResponse,
} from './safety';

const API_KEY = 'sk-server-only-safety-test-value';

function projection(overrides: Partial<GuideProviderProjection> = {}): GuideProviderProjection {
  return {
    baseContext: {
      ownerChart: {
        slot: 'owner_chart',
        state: 'active',
        source: {
          kind: 'owner_chart',
          title: 'My chart',
          facts: 'Sun in Leo. Moon in Taurus.',
          subject: {
            boundary: 'root_user',
            subjectId: 'self',
            subjectName: 'You',
            subjectIsUser: true,
          },
          containsThirdPartyData: false,
        },
      },
      todaySky: {
        slot: 'today_sky',
        state: 'active',
        source: {
          kind: 'today_sky',
          title: "Today's sky",
          facts: 'The Moon is in Virgo.',
          subject: {
            boundary: 'public_reference',
            subjectId: 'sky:2026-08-13',
            subjectName: null,
            subjectIsUser: false,
          },
          containsThirdPartyData: false,
        },
      },
    },
    attachments: [],
    publicKnowledge: {
      version: 'guide-public-knowledge-2026-08-13.1',
      entries: [],
      allowedPaths: [],
    },
    history: [],
    userMessage: 'What is one grounded way to work with this transit?',
    ...overrides,
  };
}

function classifierResponse(
  classificationText: string,
  model: string = GUIDE_PROVIDER_MODEL,
): Response {
  return new Response(JSON.stringify({
    status: 'completed',
    model,
    output: [{
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: classificationText }],
    }],
  }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function classified(category: string): Response {
  return classifierResponse(JSON.stringify({ category }));
}

function providerStream(deltas: string[]): Response {
  const events = [
    ...deltas.map((delta) => ({ type: 'response.output_text.delta', delta })),
    {
      type: 'response.completed',
      response: {
        status: 'completed',
        model: GUIDE_PROVIDER_MODEL,
        usage: { input_tokens: 20, output_tokens: 8 },
      },
    },
  ];
  const bytes = new TextEncoder().encode(events.map((event) => (
    `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
  )).join(''));
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  }), {
    status: 200,
    headers: { 'content-type': 'text/event-stream; charset=utf-8' },
  });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('Guide pre/post-generation safety boundary', () => {
  it('uses exact Luna with store false and background false for every OpenAI request', async () => {
    const postClassifier = deferred<Response>();
    const postClassifierStarted = deferred<void>();
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      const call = fetcher.mock.calls.length;
      if (call === 1) return classified('allowed');
      if (call === 2) return providerStream(['A grounded ', 'next step.']);
      postClassifierStarted.resolve();
      return postClassifier.promise;
    });
    const deltas: string[] = [];
    const running = streamSafeGuideOpenAIResponse(
      API_KEY,
      projection(),
      (delta) => { deltas.push(delta); },
      new AbortController().signal,
      { fetcher: fetcher as typeof fetch },
    );

    await postClassifierStarted.promise;
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(deltas).toEqual([]);

    const bodies = fetcher.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies.map(({ metadata }) => metadata.product)).toEqual([
      'guide_safety',
      'guide',
      'guide_safety',
    ]);
    for (const body of bodies) {
      expect(body).toMatchObject({
        model: GUIDE_PROVIDER_MODEL,
        store: false,
        background: false,
      });
    }
    for (const [url] of fetcher.mock.calls) {
      expect(String(url)).toBe(GUIDE_OPENAI_RESPONSES_URL);
    }

    postClassifier.resolve(classified('allowed'));
    await expect(running).resolves.toMatchObject({
      modelId: GUIDE_PROVIDER_MODEL,
      outputText: 'A grounded next step.',
    });
    expect(deltas).toEqual(['A grounded ', 'next step.']);
  });

  it('answers unsafe input deterministically without echoing it or starting generation', async () => {
    const sensitiveInput = 'Diagnose my private symptoms and prescribe a dose right now.';
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => (
      classified('medical')
    ));
    const deltas: string[] = [];
    const completion = await streamSafeGuideOpenAIResponse(
      API_KEY,
      projection({ userMessage: sensitiveInput }),
      (delta) => { deltas.push(delta); },
      new AbortController().signal,
      { fetcher: fetcher as typeof fetch },
    );

    const expected = guideSafetyReply('medical');
    expect(fetcher).not.toHaveBeenCalled();
    expect(completion).toMatchObject({
      modelId: GUIDE_SAFETY_RESPONSE_MODEL,
      outputText: expected,
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    expect(deltas).toEqual([expected]);
    expect(expected).not.toContain(sensitiveInput);
    expect(JSON.stringify({ completion, deltas })).not.toContain('private symptoms');
  });

  it('never releases Luna text when the post-classifier rejects the output', async () => {
    const lunaText = 'Buy this asset now and put your entire savings into it.';
    const responses = [
      classified('allowed'),
      providerStream([lunaText]),
      classified('financial'),
    ];
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => responses.shift()!);
    const deltas: string[] = [];
    const completion = await streamSafeGuideOpenAIResponse(
      API_KEY,
      projection(),
      (delta) => { deltas.push(delta); },
      new AbortController().signal,
      { fetcher: fetcher as typeof fetch },
    );

    const expected = guideSafetyReply('financial');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(completion).toMatchObject({
      modelId: GUIDE_SAFETY_RESPONSE_MODEL,
      outputText: expected,
    });
    expect(deltas).toEqual([expected]);
    expect(JSON.stringify({ completion, deltas })).not.toContain(lunaText);
  });

  it.each([
    ['malformed JSON', () => new Response('{', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })],
    ['wrong model', () => classifierResponse('{"category":"allowed"}', 'not-luna')],
    ['extra classification key', () => classifierResponse(
      '{"category":"allowed","reason":"provider must not elaborate"}',
    )],
    ['oversized HTTP output', () => new Response(JSON.stringify({
      status: 'completed',
      model: GUIDE_PROVIDER_MODEL,
      padding: 'x'.repeat(33 * 1024),
      output: [],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })],
  ])('fails closed for %s from the classifier', async (_label, response) => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response());
    await expect(classifyGuideSafety(
      API_KEY,
      projection(),
      'input',
      null,
      new AbortController().signal,
      { fetcher: fetcher as typeof fetch },
    )).rejects.toMatchObject({ code: 'invalid_response' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('keeps buffered Luna output private when aborted during post-classification', async () => {
    const postClassifierStarted = deferred<void>();
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const call = fetcher.mock.calls.length;
      if (call === 1) return classified('allowed');
      if (call === 2) return providerStream(['Buffered private candidate.']);
      postClassifierStarted.resolve();
      return new Promise<Response>((_resolve, reject) => {
        const rejectAbort = () => reject(new DOMException('Aborted', 'AbortError'));
        if (init?.signal?.aborted) rejectAbort();
        else init?.signal?.addEventListener('abort', rejectAbort, { once: true });
      });
    });
    const controller = new AbortController();
    const deltas: string[] = [];
    const running = streamSafeGuideOpenAIResponse(
      API_KEY,
      projection(),
      (delta) => { deltas.push(delta); },
      controller.signal,
      { fetcher: fetcher as typeof fetch },
    );

    await postClassifierStarted.promise;
    expect(deltas).toEqual([]);
    controller.abort();
    await expect(running).rejects.toMatchObject({ code: 'cancelled' });
    expect(deltas).toEqual([]);
  });

  it('emits no output when the classifier transport fails', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
      throw new Error('private provider failure');
    });
    const deltas: string[] = [];
    await expect(streamSafeGuideOpenAIResponse(
      API_KEY,
      projection(),
      (delta) => { deltas.push(delta); },
      new AbortController().signal,
      { fetcher: fetcher as typeof fetch },
    )).rejects.toMatchObject({ code: 'unavailable' });
    expect(deltas).toEqual([]);
  });
});
