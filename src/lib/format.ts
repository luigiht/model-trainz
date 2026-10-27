const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

/** Short number formatting: 999, 1.23K, 45.6M … then scientific beyond the suffix table. */
export function formatNumber(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return "∞";
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a < 1000) return sign + (Number.isInteger(a) ? a.toString() : a.toFixed(a < 10 ? 1 : 0));
  const tier = Math.floor(Math.log10(a) / 3);
  if (tier >= SUFFIXES.length) return sign + a.toExponential(decimals).replace("e+", "e");
  const scaled = a / 10 ** (tier * 3);
  // Avoid "1000.00K" at tier boundaries.
  const fixed = scaled >= 999.995 ? (scaled / 1000).toFixed(decimals) : scaled.toFixed(decimals);
  const suffix = scaled >= 999.995 ? SUFFIXES[tier + 1] : SUFFIXES[tier];
  return `${sign}${fixed}${suffix}`;
}

export const formatCoins = (n: number) => `$${formatNumber(Math.floor(n))}`;

/** Metres below a kilometre ("850 m"), then kilometres ("1.25 Km", "12.5 Km", "125 Km", "1.50K Km"). */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${formatNumber(Math.floor(metres))} m`;
  const km = metres / 1000;
  if (km >= 1000) return `${formatNumber(km)} Km`;
  const decimals = km < 10 ? 2 : km < 100 ? 1 : 0;
  return `${Number(km.toFixed(decimals))} Km`;
}
