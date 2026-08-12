const MAX_CHART_LABEL_CODE_POINTS = 120;
const MAX_CHART_LABEL_BYTES = 480;
const CONTROL = /[\p{Cc}\p{Cf}]/u;

/** Mirrors the account API's bounded-text domain for encrypted chart labels. */
export function isAccountChartLabel(input: unknown): input is string {
  return typeof input === 'string'
    && input === input.trim()
    && [...input].length >= 1
    && [...input].length <= MAX_CHART_LABEL_CODE_POINTS
    && new TextEncoder().encode(input).byteLength <= MAX_CHART_LABEL_BYTES
    && !CONTROL.test(input)
    && wellFormed(input);
}

function wellFormed(input: string): boolean {
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = input.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}
