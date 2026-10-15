// shortcut: solo Perú (UTC-5 fijo, sin horario de verano); usar la zona horaria de la empresa si se atiende otro país.
const LIMA_OFFSET = "-05:00";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fecha `YYYY-MM-DD` del día calendario de Lima en el instante dado. */
export function todayInLima(now: Date = new Date()): string {
  return new Date(now.getTime() - 5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/** Rango [inicio, fin) de un día calendario de Lima. */
export function limaDayRange(date: string): { from: Date; to: Date } {
  const from = new Date(`${date}T00:00:00.000${LIMA_OFFSET}`);
  return { from, to: new Date(from.getTime() + DAY_MS) };
}
