import { decodeChartLink, encodeChartLink, type ShareChartInput } from './share';

export type SubjectMode = 'self' | 'other';

export type MineHandoff =
  | { kind: 'input'; input: ShareChartInput }
  | { kind: 'saved'; id: string };

interface ChartHandoffOptions {
  subjectMode?: SubjectMode;
  mine?: MineHandoff | null;
}

const SAVED_ID_MAX = 128;

function fragmentParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
}

function validSavedId(value: string): string | null {
  const id = value.trim();
  if (!id || id.length > SAVED_ID_MAX || /[\u0000-\u001f\u007f]/.test(id)) return null;
  return id;
}

function appendMine(params: URLSearchParams, mine: MineHandoff | null | undefined): void {
  if (!mine) return;
  if (mine.kind === 'input') params.set('mine', encodeChartLink(mine.input));
  else {
    const id = validSavedId(mine.id);
    if (id) params.set('mineId', id);
  }
}

/** Context travels in a fragment so birth details and labels never reach a server. */
export function chartHandoffFragment(
  input: ShareChartInput,
  options: ChartHandoffOptions = {},
): string {
  const params = new URLSearchParams();
  params.set('c', encodeChartLink(input));
  if (options.subjectMode === 'other') params.set('subject', 'other');
  appendMine(params, options.mine);
  return params.toString();
}

export function subjectModeFromHash(hash: string): SubjectMode {
  const values = fragmentParams(hash).getAll('subject');
  return values.length === 1 && values[0] === 'other' ? 'other' : 'self';
}

export function mineHandoffFromHash(hash: string): MineHandoff | null {
  const params = fragmentParams(hash);
  const inputTokens = params.getAll('mine');
  const savedIds = params.getAll('mineId');
  if (inputTokens.length + savedIds.length !== 1) return null;
  if (inputTokens.length === 1) {
    const input = decodeChartLink(inputTokens[0]);
    return input ? { kind: 'input', input } : null;
  }
  const id = validSavedId(savedIds[0]);
  return id ? { kind: 'saved', id } : null;
}

/** Carry the chart currently on screen into the someone-else entry flow. */
export function someoneElseHandoffPath(
  mine: ShareChartInput,
  path = '/birth-chart/someone-else/',
): string {
  const params = new URLSearchParams();
  appendMine(params, { kind: 'input', input: mine });
  return `${path}#${params.toString()}`;
}

/**
 * Put the visitor's chart in side A and the other person's chart in side B.
 * Full birth inputs stay in the fragment; a saved chart contributes only its
 * opaque, device-local id through the compatibility page's existing query API.
 */
export function compatibilityHandoffPath(
  other: ShareChartInput,
  mine: MineHandoff | null,
  path = '/compatibility/',
): string {
  const query = new URLSearchParams();
  const fragment = new URLSearchParams();
  if (mine?.kind === 'input') {
    fragment.set('a', encodeChartLink(mine.input));
    fragment.set('b', encodeChartLink(other));
  } else if (mine?.kind === 'saved' && validSavedId(mine.id)) {
    query.set('a', mine.id);
    fragment.set('b', encodeChartLink(other));
  } else {
    fragment.set('a', encodeChartLink(other));
  }
  const search = query.size ? `?${query.toString()}` : '';
  return `${path}${search}#${fragment.toString()}`;
}
