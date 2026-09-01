/**
 * Hand a calendar file to the browser as a download. Engine-free and
 * storage-free: the text is built by the caller, and the object URL is
 * revoked as soon as the click has been dispatched.
 */
export function downloadCalendarFile(calendar: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
