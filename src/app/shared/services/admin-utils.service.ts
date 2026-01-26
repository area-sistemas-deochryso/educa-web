import { Injectable } from '@angular/core';

/**
 * Servicio con utilidades compartidas para componentes admin
 * Centraliza helpers comunes para evitar código duplicado
 */
@Injectable({ providedIn: 'root' })
export class AdminUtilsService {
	/**
	 * Extrae el nombre del módulo desde una ruta
	 * @example '/intranet/admin/usuarios' → 'intranet'
	 */
	getModuloFromRuta(ruta: string): string {
		const cleanRuta = ruta.startsWith('/') ? ruta.substring(1) : ruta;
		const parts = cleanRuta.split('/');
		return parts[0] || 'general';
	}

	/**
	 * Retorna el severity de PrimeNG según el rol
	 */
	getRolSeverity(rol: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
		switch (rol) {
			case 'Director':
				return 'danger';
			case 'Asistente Administrativo':
				return 'contrast';
			case 'Profesor':
				return 'warn';
			case 'Apoderado':
				return 'info';
			case 'Estudiante':
				return 'success';
			default:
				return 'secondary';
		}
	}

	/**
	 * Retorna el severity de PrimeNG según el estado
	 * Soporta tanto boolean como number (1/0)
	 */
	getEstadoSeverity(estado: boolean | number): 'success' | 'danger' {
		if (typeof estado === 'boolean') {
			return estado ? 'success' : 'danger';
		}
		return estado === 1 ? 'success' : 'danger';
	}

	/**
	 * Cuenta los módulos únicos en un array de rutas
	 */
	getModulosCount(vistas: string[]): number {
		const modulos = new Set<string>();
		vistas.forEach((v) => modulos.add(this.getModuloFromRuta(v)));
		return modulos.size;
	}

	/**
	 * Genera el label para conteo de vistas seleccionadas
	 */
	getVistasCountLabel(count: number): string {
		return count === 1 ? '1 vista seleccionada' : `${count} vistas seleccionadas`;
	}
}
