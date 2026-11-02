const SOLES = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const PORCENTAJE = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const FECHA = new Intl.DateTimeFormat('es-PE', {
	weekday: 'short',
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	timeZone: 'UTC',
});

/** `S/ 1,234.50`. El servidor entrega `decimal` con 2 decimales; no se hace aritmética aquí. */
export function formatSoles(monto: number): string {
	return SOLES.format(monto);
}

/**
 * Porcentaje con 1 decimal. `null` = nada exigible o universo vacío: se muestra «—», nunca «NaN %» (INV-PG10).
 * Los porcentajes del servidor ya vienen en escala 0-100.
 */
export function formatPorcentaje(valor: number | null | undefined): string {
	return valor === null || valor === undefined ? '—' : `${PORCENTAJE.format(valor)} %`;
}

/** Fecha con día de la semana («lun 03/11/2026»). Entra `YYYY-MM-DD` o ISO; se lee como fecha civil, sin zona. */
export function formatFechaConDia(iso: string): string {
	const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
	return FECHA.format(new Date(Date.UTC(y, m - 1, d)));
}
