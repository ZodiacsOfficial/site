export * from './index';
import type { PrecisionRuntime } from './index';

/** Read the whole artifact into memory, verify it, and open it. */
export function openPackFile(path: string, options?: { expectDigest?: string | null }): Promise<PrecisionRuntime>;
/** Leave the artifact on disk: one descriptor, one record at a time. */
export function openPackFileStream(path: string, options?: { expectDigest?: string | null }): Promise<PrecisionRuntime>;
/** The byte source behind the file-backed loader, if you need it directly. */
export function fileSource(path: string): {
  kind: 'file';
  byteLength: number;
  window(offset: number, length: number): DataView;
  bytes(offset: number, length: number): Uint8Array;
  digest(offset: number, length: number): Promise<string>;
  seal(): void;
  release(): void;
};
