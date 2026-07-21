export function parseDailySunSegmentId(
  value: unknown,
  legacyWeeklySegment: unknown = '',
): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(id)) return null;
  const weekly = typeof legacyWeeklySegment === 'string' ? legacyWeeklySegment.trim() : '';
  return weekly && weekly === id ? null : id;
}
