import type { PagoCorte, PagosConteos } from '@data/models';

const MESES = [
	'Enero',
	'Febrero',
	'Marzo',
	'Abril',
	'Mayo',
	'Junio',
	'Julio',
	'Agosto',
	'Setiembre',
	'Octubre',
	'Noviembre',
	'Diciembre',
];

export const HOY = 'hoy';

export function nombreMes(mes: number): string {
	return MESES[mes - 1] ?? `Mes ${mes}`;
}

/** Fecha civil local `YYYY-MM-DD` (no UTC, para no adelantar el día por la noche). */
export function toIsoLocal(date: Date): string {
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Una fecha futura da `400 PAGO_PANEL_FECHA_FUTURA`: el selector no la permite. `YYYY-MM-DD` compara bien como texto. */
export function esFechaFutura(fecha: string, hoy: string): boolean {
	return fecha.slice(0, 10) > hoy;
}

/** El corte debe caer dentro del año (`PAGO_CORTE_FECHA_FUERA_DE_ANIO`) y no ser futuro. */
export function validarFechaCorte(fecha: string, anio: number, hoy: string): string | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return 'Elige una fecha válida.';
	if (Number(fecha.slice(0, 4)) !== anio) return `La fecha debe caer en ${anio}.`;
	if (esFechaFutura(fecha, hoy)) return 'No se puede usar una fecha futura.';
	return null;
}

export function ordenarCortes(cortes: readonly PagoCorte[]): PagoCorte[] {
	return [...cortes].sort((a, b) => a.mes - b.mes);
}

/** Suma de las categorías exclusivas. `conDatosSinConfirmar` y `sinCargos` son transversales: no entran (INV-PG14). */
export function totalExclusivo(conteos: PagosConteos): number {
	return conteos.alDia + conteos.pagoParcial + conteos.conDeuda;
}
