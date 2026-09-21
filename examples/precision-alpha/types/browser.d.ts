export * from './index';
import type { PrecisionRuntime } from './index';

/** True only on a secure context: `crypto.subtle` is what verifies a pack. */
export function canVerify(): boolean;
export function openPackFromUrl(
  input: string | URL | Request,
  options?: { expectDigest?: string | null; fetchImpl?: typeof fetch; signal?: AbortSignal },
): Promise<PrecisionRuntime>;
export function openPackFromResponse(response: Response, options?: { expectDigest?: string | null }): Promise<PrecisionRuntime>;
export function openPackFromBlob(blob: Blob, options?: { expectDigest?: string | null }): Promise<PrecisionRuntime>;
