import type { Vista } from '@core/services';

export interface ModuloVistas {
	nombre: string;
	vistas: Vista[];
	seleccionadas: number;
	total: number;
}

type GetModuloFn = (ruta: string) => string;

function capitalizeFirst(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Agrupa todas las vistas activas por módulo, contando las seleccionadas.
 * Usado para construir el selector de módulos en el diálogo de crear/editar.
 */
export function buildModulosVistas(
	vistas: Vista[],
	vistasSeleccionadas: string[],
	getModulo: GetModuloFn,
): ModuloVistas[] {
	const modulosMap = new Map<string, Vista[]>();

	vistas.forEach((vista) => {
		const modulo = capitalizeFirst(getModulo(vista.ruta));
		if (!modulosMap.has(modulo)) {
			modulosMap.set(modulo, []);
		}
		modulosMap.get(modulo)!.push(vista);
	});

	return Array.from(modulosMap.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([nombre, vistas]) => ({
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
	const modulosMap = new Map<string, Vista[]>();

	vistasRutas.forEach((ruta) => {
		const modulo = capitalizeFirst(getModulo(ruta));
		const vista = vistasActivas.find((v) => v.ruta === ruta);

		if (!modulosMap.has(modulo)) {
			modulosMap.set(modulo, []);
		}
		if (vista) {
			modulosMap.get(modulo)!.push(vista);
		}
	});

	return Array.from(modulosMap.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([nombre, vistas]) => ({
			nombre,
			vistas,
			seleccionadas: vistas.length,
			total: vistas.length,
		}));
}
