const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const RECOVERY_SECRET_BYTES = 32;

/** Creates the client-held capability used to recover an uncertain deletion. */
export function createAccountDeletionRecoverySecret(): string | null {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') return null;
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(RECOVERY_SECRET_BYTES));
  let encoded = '';
  for (let offset = 0; offset < bytes.length; offset += 3) {
    const first = bytes[offset]!;
    const second = bytes[offset + 1];
    const third = bytes[offset + 2];
    encoded += BASE64URL[first >>> 2];
    encoded += BASE64URL[((first & 0x03) << 4) | ((second ?? 0) >>> 4)];
    if (second !== undefined) {
      encoded += BASE64URL[((second & 0x0f) << 2) | ((third ?? 0) >>> 6)];
    }
    if (third !== undefined) encoded += BASE64URL[third & 0x3f];
  }
  return encoded.length === 43 ? encoded : null;
}
