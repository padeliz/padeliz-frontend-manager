/** Extract HH:MM from API time strings like H:i:s. */
export function clockHi(value?: string | null): string {
  if (!value) return '—';
  const s = String(value);
  const m = s.match(/(\d{2}:\d{2})/);
  return m ? m[1] : s;
}
