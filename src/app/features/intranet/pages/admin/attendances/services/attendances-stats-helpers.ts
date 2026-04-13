import { AsistenciaAdminLista } from '../models';
import type { AttendancesAdminStore } from './attendances-admin.store';

/**
 * Helpers puros de aplicación de deltas sobre las estadísticas del store
 * de asistencia admin. Extraídos del facade CRUD para mantenerlo bajo el
 * límite de líneas y permitir reutilización en otros facades.
 *
 * Todos toman el store como primer parámetro y un `sign: 1 | -1` que
 * indica si se aplica (apply) o se revierte (rollback).
 */

/** Aplica deltas de todas las estadísticas derivadas de un item. */
export function applyItemStatsDelta(
	store: AttendancesAdminStore,
	item: AsistenciaAdminLista,
	sign: 1 | -1,
): void {
	store.incrementarEstadistica('totalRegistros', sign);
	store.incrementarEstadistica(
		item.estado === 'Completa' ? 'completas' : 'incompletas',
		sign,
	);
	store.incrementarEstadistica(
		item.origenManual ? 'registrosManuales' : 'registrosWebhook',
		sign,
	);
}

/** Delta de stats al pasar Incompleta→Completa y origenWebhook→Manual. */
export function applySalidaTransitionDelta(
	store: AttendancesAdminStore,
	snapshot: AsistenciaAdminLista | undefined,
	sign: 1 | -1,
): void {
	if (!snapshot) return;
	const inv = -sign as 1 | -1;
	if (snapshot.estado === 'Incompleta') {
		store.incrementarEstadistica('completas', sign);
		store.incrementarEstadistica('incompletas', inv);
	}
	if (!snapshot.origenManual) {
		store.incrementarEstadistica('registrosManuales', sign);
		store.incrementarEstadistica('registrosWebhook', inv);
	}
}

/** Delta de stats al editar horas (cambia estado y/o origen). */
export function applyActualizarHorasDelta(
	store: AttendancesAdminStore,
	snapshot: AsistenciaAdminLista,
	nuevoEstado: 'Completa' | 'Incompleta',
	sign: 1 | -1,
): void {
	if (snapshot.estado !== nuevoEstado) {
		const delta = (nuevoEstado === 'Completa' ? sign : -sign) as 1 | -1;
		store.incrementarEstadistica('completas', delta);
		store.incrementarEstadistica('incompletas', -delta as 1 | -1);
	}
	if (!snapshot.origenManual) {
		const inv = -sign as 1 | -1;
		store.incrementarEstadistica('registrosManuales', sign);
		store.incrementarEstadistica('registrosWebhook', inv);
	}
}
