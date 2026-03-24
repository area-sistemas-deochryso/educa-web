// #region Imports
import { Injectable, inject } from '@angular/core';
import { Vista } from '@core/services';
import { capitalize, groupBy, sortedEntries } from '@core/helpers';
import { UiMappingService } from '@shared/services';
import { ModuloVistas } from './permisos-usuarios.store';

// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class PermisosUsuariosHelperService {
	private uiMapping = inject(UiMappingService);

	/**
	 * Construye la estructura de módulos agrupando vistas y calculando selecciones
	 */
	buildModulosVistas(vistasActivas: Vista[], vistasSeleccionadas: string[]): ModuloVistas[] {
		const grouped = groupBy(vistasActivas, (v) =>
			capitalize(this.uiMapping.getModuloFromRuta(v.ruta)),
		);

		return sortedEntries(grouped).map(([nombre, vistas]) => ({
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
		const resolvedVistas = vistasUsuario
			.map((ruta) => ({ ruta, vista: vistasActivas.find((v) => v.ruta === ruta) }))
			.filter((entry): entry is { ruta: string; vista: Vista } => !!entry.vista);

		const grouped = groupBy(resolvedVistas, (entry) =>
			capitalize(this.uiMapping.getModuloFromRuta(entry.ruta)),
		);

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

	/**
	 * Obtiene el label de conteo de vistas seleccionadas
	 */
	getVistasCountLabel(count: number): string {
		return this.uiMapping.getVistasCountLabel(count);
	}
}
// #endregion
