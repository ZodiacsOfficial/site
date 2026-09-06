import type { VNode } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({ act: vi.fn() }));
vi.mock('preact/hooks', () => ({
  useEffect: () => undefined,
  useMemo: (read: () => unknown) => read(),
  useRef: (current: unknown) => ({ current }),
  useState: (value: unknown) => [value, vi.fn()],
}));
vi.mock('../lib/use-learning-progress', () => ({
  useLearningProgress: () => ({
    progress: { started: [], completed: [], pageOnly: false }, ready: true, act: harness.act,
  }),
}));
import LearningPath from './LearningPath';

function nodes(value: unknown): VNode<Record<string, any>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('props' in value)) return [];
  const node = value as VNode<Record<string, any>>;
  return [node, ...nodes(node.props.children)];
}
function lesson() {
  const link = nodes(LearningPath()).find((node) => node.type === 'a' && node.props.href === '/learn/houses/');
  if (!link) throw new Error('Missing native houses lesson link');
  return link;
}
const assign = vi.fn();
const track = vi.fn();
let finish: (accepted: boolean) => void;
function click(modifier?: string) {
  const event = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
    ...(modifier ? { [modifier]: true } : {}), preventDefault: vi.fn() };
  lesson().props.onClick(event);
  return event;
}
async function settle(accepted: boolean) { finish(accepted); await Promise.resolve(); }

beforeEach(() => {
  assign.mockReset(); track.mockReset(); harness.act.mockReset();
  harness.act.mockImplementation(() => new Promise<boolean>((resolve) => { finish = resolve; }));
  vi.stubGlobal('window', { location: { assign }, zodiacsAnalytics: { track } });
});
afterEach(() => vi.unstubAllGlobals());

describe('learning lesson navigation', () => {
  it.each(['ctrlKey', 'metaKey', 'shiftKey', 'altKey'])(
    'records a start while leaving %s navigation entirely native', async (modifier) => {
      const event = click(modifier);
      expect(harness.act).toHaveBeenCalledExactlyOnceWith({ type: 'start', id: 'planets-houses' });
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
      await settle(true);
      expect(track).toHaveBeenCalledExactlyOnceWith('next_action_clicked', {
        state: 'learning_path', action: 'planets-houses',
      });
      expect(assign).not.toHaveBeenCalled();
    },
  );

  it('waits for the owned start before ordinary same-tab navigation', async () => {
    const event = click();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(assign).not.toHaveBeenCalled();
    await settle(true);
    expect(assign).toHaveBeenCalledExactlyOnceWith('/learn/houses/');
  });

  it.each([undefined, 'ctrlKey'])('does not force navigation or track a rejected start (%s)', async (modifier) => {
    click(modifier);
    await settle(false);
    expect(assign).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });
});
