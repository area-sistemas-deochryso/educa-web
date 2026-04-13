// #region Imports
import { Injectable } from '@angular/core';
import { APP_USER_ROLES } from '@app/shared/constants';
import { getEstadoSeverity } from '@core/helpers';
import type { TipoEventoCalendario, NotificacionTipo, NotificacionPrioridad } from '@data/models';

// #endregion
// #region Implementation
type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

const ROLE_SEVERITY_BY_ROLE: Record<string, Severity> = {
	[APP_USER_ROLES.Director]: 'danger',
	[APP_USER_ROLES.AsistenteAdministrativo]: 'contrast',
	[APP_USER_ROLES.Promotor]: 'contrast',
	[APP_USER_ROLES.Profesor]: 'warn',
	[APP_USER_ROLES.Apoderado]: 'info',
	[APP_USER_ROLES.Estudiante]: 'success',
};

// #region Evento Calendario mappings
const EVENTO_TIPO_SEVERITY: Record<TipoEventoCalendario, Severity> = {
	academic: 'info',
	cultural: 'contrast',
	sports: 'success',
	meeting: 'warn',
	other: 'secondary',
};

const EVENTO_TIPO_LABEL: Record<TipoEventoCalendario, string> = {
	academic: 'Académico',
	cultural: 'Cultural',
	sports: 'Deportivo',
	meeting: 'Reunión',
	other: 'Otro',
};
// #endregion

// #region Notificación mappings
const NOTIFICACION_TIPO_SEVERITY: Record<NotificacionTipo, Severity> = {
	matricula: 'info',
	pago: 'warn',
	academico: 'success',
	festividad: 'contrast',
	evento: 'secondary',
};

const NOTIFICACION_TIPO_LABEL: Record<NotificacionTipo, string> = {
	matricula: 'Matrícula',
	pago: 'Pago',
	academico: 'Académico',
	festividad: 'Festividad',
	evento: 'Evento',
};

const NOTIFICACION_PRIORIDAD_SEVERITY: Record<NotificacionPrioridad, Severity> = {
	low: 'info',
	medium: 'warn',
	high: 'danger',
	urgent: 'danger',
};

const NOTIFICACION_PRIORIDAD_LABEL: Record<NotificacionPrioridad, string> = {
	low: 'Baja',
	medium: 'Media',
	high: 'Alta',
	urgent: 'Urgente',
};
// #endregion

/**
 * Servicio con utilidades de mapeo UI (severity, labels, etc.)
 * Centraliza helpers comunes para evitar código duplicado
 */
@Injectable({ providedIn: 'root' })
export class UiMappingService {
	/**
	 * Extrae el nombre del módulo desde una ruta (salta el prefijo 'intranet')
	 * @example '/intranet/admin/usuarios' → 'admin'
	 */
	getModuloFromRuta(ruta: string): string {
		const cleanRuta = ruta.startsWith('/') ? ruta.substring(1) : ruta;
		const parts = cleanRuta.split('/').filter(Boolean);
		// Todas las rutas tienen prefijo 'intranet/', el módulo real es el segundo segmento
		const moduleIndex = parts[0] === 'intranet' ? 1 : 0;
		return parts[moduleIndex] || 'general';
	}

	/**
	 * Retorna el severity de PrimeNG según el rol
	 */
	getRolSeverity(rol: string): Severity {
		return ROLE_SEVERITY_BY_ROLE[rol] ?? 'secondary';
	}

	/**
	 * Retorna el severity de PrimeNG según el estado.
	 * Delega a estado.utils.ts — fuente única de verdad.
	 */
	getEstadoSeverity(estado: boolean | number): 'success' | 'danger' {
		return getEstadoSeverity(estado);
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

	// #region Evento Calendario
	getEventoTipoSeverity(tipo: TipoEventoCalendario): Severity {
		return EVENTO_TIPO_SEVERITY[tipo] ?? 'secondary';
	}

	getEventoTipoLabel(tipo: TipoEventoCalendario): string {
		return EVENTO_TIPO_LABEL[tipo] ?? tipo;
	}
	// #endregion

	// #region Notificaciones
	getNotificacionTipoSeverity(tipo: NotificacionTipo): Severity {
		return NOTIFICACION_TIPO_SEVERITY[tipo] ?? 'secondary';
	}

	getNotificacionTipoLabel(tipo: NotificacionTipo): string {
		return NOTIFICACION_TIPO_LABEL[tipo] ?? tipo;
	}

	getNotificacionPrioridadSeverity(prioridad: NotificacionPrioridad): Severity {
		return NOTIFICACION_PRIORIDAD_SEVERITY[prioridad] ?? 'secondary';
	}

	getNotificacionPrioridadLabel(prioridad: NotificacionPrioridad): string {
		return NOTIFICACION_PRIORIDAD_LABEL[prioridad] ?? prioridad;
	}
	// #endregion
}
// #endregion
