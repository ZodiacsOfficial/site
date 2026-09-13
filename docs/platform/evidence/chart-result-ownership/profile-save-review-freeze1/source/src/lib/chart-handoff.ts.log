import { decodeChartLink, encodeChartLink, type ShareChartInput } from './share';

export type SubjectMode = 'self' | 'other';

export type MineHandoff =
  | { kind: 'input'; input: ShareChartInput }
  | { kind: 'saved'; id: string };

interface ChartHandoffOptions {
  subjectMode?: SubjectMode;
  mine?: MineHandoff | null;
  /** The optional "mine" context came from the guarded saved-chart library. */
  mineProfileOrigin?: boolean;
}

const SAVED_ID_MAX = 128;
const PROFILE_SOURCE = 'profile';
const PROFILE_CHART_ID_PARAM = 'profileChartId';
const MINE_SOURCE_PARAM = 'mineSource';
const PROFILE_CHART_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fragmentParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
}

function validSavedId(value: string): string | null {
  const id = value.trim();
  if (!id || id.length > SAVED_ID_MAX || /[\u0000-\u001f\u007f]/.test(id)) return null;
  return id;
}

function validProfileChartId(value: string): string | null {
  const id = validSavedId(value);
  return id && PROFILE_CHART_ID.test(id) ? id : null;
}

function appendMine(params: URLSearchParams, mine: MineHandoff | null | undefined): boolean {
  if (!mine) return false;
  if (mine.kind === 'input') params.set('mine', encodeChartLink(mine.input));
  else {
    const id = validSavedId(mine.id);
    if (!id) return false;
    params.set('mineId', id);
  }
  return true;
}

function hasExactProfileSource(params: URLSearchParams, key: string): boolean {
  const values = params.getAll(key);
  return values.length === 1 && values[0] === PROFILE_SOURCE;
}

/** Untrusted provenance only: it decides what must be scrubbed, never what may be read. */
export function profileHandoffOriginsFromHash(hash: string): {
  chart: boolean;
  mine: boolean;
} {
  const params = fragmentParams(hash);
  const mine = mineHandoffFromHash(hash);
  return {
    chart: profileChartIdFromHash(hash) !== null,
    mine: mine?.kind === 'saved' && hasExactProfileSource(params, MINE_SOURCE_PARAM),
  };
}

/** Opaque saved-chart handoff: no birth input is exposed while the next page is locked. */
export function profileChartHandoffFragment(chartId: string): string | null {
  const id = validProfileChartId(chartId);
  if (!id) return null;
  const params = new URLSearchParams();
  params.set(PROFILE_CHART_ID_PARAM, id);
  return params.toString();
}

export function profileChartIdFromHash(hash: string): string | null {
  const values = fragmentParams(hash).getAll(PROFILE_CHART_ID_PARAM);
  return values.length === 1 ? validProfileChartId(values[0]) : null;
}

/** Context travels in a fragment so birth details and labels never reach a server. */
export function chartHandoffFragment(
  input: ShareChartInput,
  options: ChartHandoffOptions = {},
): string {
  const params = new URLSearchParams();
  params.set('c', encodeChartLink(input));
  if (options.subjectMode === 'other') params.set('subject', 'other');
  if (options.mineProfileOrigin && options.mine?.kind === 'saved') {
    const id = validProfileChartId(options.mine.id);
    if (id) {
      params.set('mineId', id);
      params.set(MINE_SOURCE_PARAM, PROFILE_SOURCE);
    }
  } else {
    appendMine(params, options.mine);
  }
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

export function someoneElseProfileHandoffPath(
  chartId: string,
  path = '/birth-chart/someone-else/',
): string | null {
  const params = new URLSearchParams();
  const id = validProfileChartId(chartId);
  if (!id) return null;
  params.set('mineId', id);
  params.set(MINE_SOURCE_PARAM, PROFILE_SOURCE);
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
