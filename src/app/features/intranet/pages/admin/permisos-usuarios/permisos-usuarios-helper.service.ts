// #region Imports
import { Injectable, inject } from '@angular/core';
import { Vista } from '@core/services';
import { AdminUtilsService } from '@shared/services';
import { ModuloVistas } from './permisos-usuarios.store';

// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class PermisosUsuariosHelperService {
	private adminUtils = inject(AdminUtilsService);

	/**
	 * Construye la estructura de módulos agrupando vistas y calculando selecciones
	 */
	buildModulosVistas(vistasActivas: Vista[], vistasSeleccionadas: string[]): ModuloVistas[] {
		const modulosMap = new Map<string, Vista[]>();

		// Agrupar vistas por módulo
		vistasActivas.forEach((vista) => {
			const modulo = this.adminUtils.getModuloFromRuta(vista.ruta);
			const moduloCapitalized = modulo.charAt(0).toUpperCase() + modulo.slice(1);

			if (!modulosMap.has(moduloCapitalized)) {
				modulosMap.set(moduloCapitalized, []);
			}
			modulosMap.get(moduloCapitalized)!.push(vista);
		});

		// Convertir a array ordenado con contadores
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
	 * Construye módulos solo con las vistas que el usuario tiene asignadas (para detail drawer)
	 */
	buildModulosVistasForDetail(
		vistasActivas: Vista[],
		vistasUsuario: string[],
	): ModuloVistas[] {
		const modulosMap = new Map<string, Vista[]>();

		vistasUsuario.forEach((ruta) => {
			const modulo = this.adminUtils.getModuloFromRuta(ruta);
			const moduloCapitalized = modulo.charAt(0).toUpperCase() + modulo.slice(1);
			const vista = vistasActivas.find((v) => v.ruta === ruta);

			if (!modulosMap.has(moduloCapitalized)) {
				modulosMap.set(moduloCapitalized, []);
			}
			if (vista) {
				modulosMap.get(moduloCapitalized)!.push(vista);
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

	/**
	 * Obtiene el label de conteo de vistas seleccionadas
	 */
	getVistasCountLabel(count: number): string {
		return this.adminUtils.getVistasCountLabel(count);
	}
}
// #endregion
