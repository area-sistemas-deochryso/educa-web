import type { Vista } from '@core/services';
import { capitalize, groupBy, sortedEntries } from '@core/helpers';

export interface ModuloVistas {
	nombre: string;
	vistas: Vista[];
	seleccionadas: number;
	total: number;
}

type GetModuloFn = (ruta: string) => string;

/**
 * Agrupa todas las vistas activas por módulo, contando las seleccionadas.
 * Usado para construir el selector de módulos en el diálogo de crear/editar.
 */
export function buildModulosVistas(
	vistas: Vista[],
	vistasSeleccionadas: string[],
	getModulo: GetModuloFn,
): ModuloVistas[] {
	const grouped = groupBy(vistas, (v) => capitalize(getModulo(v.ruta)));

	return sortedEntries(grouped).map(([nombre, vistas]) => ({
		nombre,
		vistas: vistas.sort((a, b) => a.nombre.localeCompare(b.nombre)),
		seleccionadas: vistas.filter((v) => vistasSeleccionadas.includes(v.ruta)).length,
		total: vistas.length,
	}));
}

/**
 * Agrupa rutas de vistas seleccionadas por módulo para la vista de detalle.
 * Resuelve cada ruta contra las vistas activas del sistema.
 */
export function buildModulosVistasForDetail(
	vistasRutas: string[],
	vistasActivas: Vista[],
	getModulo: GetModuloFn,
): ModuloVistas[] {
	const resolvedVistas = vistasRutas
		.map((ruta) => ({ ruta, vista: vistasActivas.find((v) => v.ruta === ruta) }))
		.filter((entry): entry is { ruta: string; vista: Vista } => !!entry.vista);

	const grouped = groupBy(resolvedVistas, (entry) => capitalize(getModulo(entry.ruta)));

	return sortedEntries(grouped).map(([nombre, entries]) => {
		const vistas = entries.map((e) => e.vista);
		return {
			nombre,
			vistas,
			seleccionadas: vistas.length,
			total: vistas.length,
		};
	});
}
