export function toUTM(lat: number, lon: number): string {
  const a = 6378137, f = 1 / 298.257223563;
  const b = a * (1 - f), e2 = 1 - (b * b) / (a * a);
  const zone = Math.floor((lon + 180) / 6) + 1;
  const lon0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const latR = lat * Math.PI / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(latR) ** 2);
  const T = Math.tan(latR) ** 2, C = (e2 / (1 - e2)) * Math.cos(latR) ** 2;
  const A = Math.cos(latR) * ((lon * Math.PI / 180) - lon0);
  const e4 = e2 * e2, e6 = e4 * e2;
  const M = a * ((1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * latR
    - (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * latR)
    + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * latR)
    - (35 * e6 / 3072) * Math.sin(6 * latR));
  const x = 0.9996 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58) * A ** 5 / 120) + 500000;
  const y = 0.9996 * (M + N * Math.tan(latR) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24
    + (61 - 58 * T + T * T + 600 * C - 330) * A ** 6 / 720)) + (lat < 0 ? 10000000 : 0);
  const letters = 'CDEFGHJKLMNPQRSTUVWXX';
  const band = letters[Math.floor((lat + 80) / 8)];
  return `${zone}${band} ${Math.round(x)} ${Math.round(y)}`;
}
