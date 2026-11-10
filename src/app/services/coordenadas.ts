/** Latitude/longitude WGS84 -> UTM (série de Krüger, mesma fórmula do backend). */
const A = 6378137;
const F = 1 / 298.257223563;
const K0 = 0.9996;
const N = F / (2 - F);
const A_RECT = (A / (1 + N)) * (1 + N ** 2 / 4 + N ** 4 / 64);
const ALFA = [
  N / 2 - (2 * N ** 2) / 3 + (5 * N ** 3) / 16,
  (13 * N ** 2) / 48 - (3 * N ** 3) / 5,
  (61 * N ** 3) / 240,
];
const C = (2 * Math.sqrt(N)) / (1 + N);

export interface Utm {
  x: number;
  y: number;
  zona: number;
  hemisferio: "N" | "S";
}

export function geoParaUtm(latitude: number, longitude: number): Utm | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 84 || Math.abs(longitude) > 180) return null;
  const zona = Math.min(Math.floor((longitude + 180) / 6) + 1, 60);
  const rad = Math.PI / 180;
  const fi = latitude * rad;
  const dl = longitude * rad - ((zona - 1) * 6 - 180 + 3) * rad;
  const t = Math.sinh(Math.atanh(Math.sin(fi)) - C * Math.atanh(C * Math.sin(fi)));
  const xi = Math.atan2(t, Math.cos(dl));
  const eta = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t));
  let este = eta;
  let norte = xi;
  ALFA.forEach((alfa, i) => {
    const j = 2 * (i + 1);
    este += alfa * Math.cos(j * xi) * Math.sinh(j * eta);
    norte += alfa * Math.sin(j * xi) * Math.cosh(j * eta);
  });
  const hemisferio = latitude < 0 ? "S" : "N";
  const x = 500000 + K0 * A_RECT * este;
  const y = K0 * A_RECT * norte + (hemisferio === "S" ? 10000000 : 0);
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, zona, hemisferio };
}

/** Caixa aproximada de Angola (incluindo Cabinda), para avisar de posições trocadas. */
export function dentroDeAngola(latitude: number, longitude: number): boolean {
  return latitude >= -18.1 && latitude <= -4.3 && longitude >= 11.6 && longitude <= 24.1;
}
