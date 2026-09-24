// Zero-padded 8-digit IDs (e.g. YMLEAD00128473), matching the format in
// AarthikLabs' own example payloads — not a confirmed hard requirement on
// their end, just matching their observed convention.
export function generateId(prefix: string): string {
  const n = Math.floor(Math.random() * 100_000_000); // 0 - 99,999,999
  return `${prefix}${String(n).padStart(8, '0')}`;
}
