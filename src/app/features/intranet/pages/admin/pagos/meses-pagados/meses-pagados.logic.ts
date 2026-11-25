import type { MesesPagadosCelda, MesesPagadosEstado } from '@data/models';
import { formatSoles } from '../utils/pagos-format.util';

/** Cómo se ve cada estado. El color nunca va solo: cada uno lleva texto e icono (a11y.md). */
export interface EstadoVisual {
	texto: string;
	icono: string;
	/** Sufijo de la clase `celda--<clase>`; el color sale de tokens en el SCSS. */
	clase: string;
	descripcion: string;
}

export const ESTADO_VISUAL: Record<MesesPagadosEstado, EstadoVisual> = {
	Pagado: { texto: 'Pagado', icono: 'pi pi-check-circle', clase: 'pagado', descripcion: 'Saldo en cero, recargo incluido' },
	Vencida: { texto: 'Vencida', icono: 'pi pi-exclamation-circle', clase: 'vencida', descripcion: 'Pasó el vencimiento y falta pagar' },
	EnPlazo: { texto: 'En plazo', icono: 'pi pi-clock', clase: 'en-plazo', descripcion: 'Aún no vence' },
	Pendiente: { texto: 'Pendiente', icono: 'pi pi-circle', clase: 'pendiente', descripcion: 'Por pagar y sin fecha de vencimiento (matrícula, inscripción, útiles)' },
	SinDato: { texto: 'Sin dato', icono: 'pi pi-question-circle', clase: 'sin-dato', descripcion: 'No se sabe si se pagó: no cuenta como deuda' },
	SinCargo: { texto: 'Sin cargo', icono: 'pi pi-minus-circle', clase: 'sin-cargo', descripcion: 'No hay cargo de este concepto' },
	NoAplica: { texto: 'No aplica', icono: 'pi pi-ban', clase: 'no-aplica', descripcion: 'Inscripción de un alumno que no es nuevo' },
};

/** Orden de la leyenda: primero lo bueno, luego la deuda y al final lo que no es deuda. */
export const ESTADOS_LEYENDA: readonly MesesPagadosEstado[] = [
	'Pagado',
	'EnPlazo',
	'Pendiente',
	'Vencida',
	'SinDato',
	'SinCargo',
	'NoAplica',
];

/** El saldo solo se muestra donde hay algo por pagar (el BE lo manda en 0 en los demás estados). */
export function tieneSaldo(celda: MesesPagadosCelda): boolean {
	return celda.saldo > 0 && (celda.estado === 'Vencida' || celda.estado === 'EnPlazo' || celda.estado === 'Pendiente');
}

/** Texto accesible de una celda: columna, estado y saldo si lo hay. */
export function etiquetaCelda(columna: string, celda: MesesPagadosCelda): string {
	const base = `${columna}: ${ESTADO_VISUAL[celda.estado].texto}`;
	return tieneSaldo(celda) ? `${base}, falta ${formatSoles(celda.saldo)}` : base;
}

/** Cuántas de las celdas dadas están pagadas; sirve para contrastar con el `mesesPagados` que manda el BE. */
export function contarPagadas(celdas: readonly MesesPagadosCelda[]): number {
	return celdas.filter((c) => c.estado === 'Pagado').length;
}
