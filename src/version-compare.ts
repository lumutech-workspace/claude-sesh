export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export type Compatibility = 'ok' | 'newer' | 'older' | 'unknown';

export function classifyCompatibility(
  compatible: string,
  detected: string | null,
): Compatibility {
  if (!detected) return 'unknown';
  const cmp = compareVersions(detected, compatible);
  if (cmp === 0) return 'ok';
  return cmp > 0 ? 'newer' : 'older';
}
