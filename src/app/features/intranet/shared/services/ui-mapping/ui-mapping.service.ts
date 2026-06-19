// #region Imports
import { Injectable } from '@angular/core';
import { APP_USER_ROLES } from '@app/shared/constants';
import { getEstadoSeverity } from '@core/helpers';
import type {
	TipoEventoCalendario,
	NotificacionTipo,
	NotificacionPrioridad,
	TipoPersona,
	EmailBlacklistMotivo,
	MotivoLiberacion,
	QuarantineMotivo,
	DomainPauseMotivo,
	DeferEventTipo,
} from '@data/models';

// #endregion
// #region Implementation
type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

const ROLE_SEVERITY_BY_ROLE: Record<string, Severity> = {
	[APP_USER_ROLES.Director]: 'danger',
	[APP_USER_ROLES.AsistenteAdministrativo]: 'contrast',
	[APP_USER_ROLES.Promotor]: 'contrast',
	[APP_USER_ROLES.CoordinadorAcademico]: 'contrast',
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

// #region Tipo Persona (Plan 21 + Plan 28 — 'A' Asistente Administrativo)
const TIPO_PERSONA_LABEL: Record<TipoPersona, string> = {
	E: 'Estudiante',
	P: 'Profesor',
	A: 'Asistente Administrativo',
	C: 'Coordinador',
	M: 'Promotor',
	D: 'Director',
};
// #endregion

// #region Quarantine mappings (Plan 37 Chat 3)
const QUARANTINE_MOTIVO_SEVERITY: Record<QuarantineMotivo, Severity> = {
	MAILBOX_FULL: 'warn',
	SOFT_BOUNCE_REPEATED: 'danger',
	DELAY_72H: 'warn',
	MANUAL: 'info',
};

const QUARANTINE_MOTIVO_LABEL: Record<QuarantineMotivo, string> = {
	MAILBOX_FULL: 'Buzón lleno (4.2.2)',
	SOFT_BOUNCE_REPEATED: 'Soft-bounce repetido',
	DELAY_72H: 'Retraso > 72h',
	MANUAL: 'Cuarentena manual',
};

const MOTIVO_LIBERACION_LABEL: Record<MotivoLiberacion, string> = {
	CONTACTO_DIRECTO: 'Contacto directo',
	BUZON_LIBERADO: 'Buzón liberado',
	FALSO_POSITIVO: 'Falso positivo',
	OTRO: 'Otro',
};
// #endregion

// #region Domain pause mappings (Plan 37 Chat 3)
const DOMAIN_PAUSE_MOTIVO_SEVERITY: Record<DomainPauseMotivo, Severity> = {
	DEFER_BURST: 'warn',
	DOMAIN_BLOCKED_NDR: 'danger',
	MANUAL: 'info',
};

const DOMAIN_PAUSE_MOTIVO_LABEL: Record<DomainPauseMotivo, string> = {
	DEFER_BURST: 'Burst de defers',
	DOMAIN_BLOCKED_NDR: 'NDR de bloqueo',
	MANUAL: 'Pausa manual',
};
// #endregion

// #region Defer event mappings (Plan 37 Chat 3 + Chat 117b)
// El catálogo viene del BE (ver `EmailDeferEventsService.getCatalogoTipos`).
// Estos mapas cubren los valores que `DeferEventDetector` emite hoy; valores
// nuevos del BE que no estén acá caen al fallback (`?? 'secondary'` / `?? tipo`).
const DEFER_EVENT_TIPO_SEVERITY: Record<string, Severity> = {
	WARNING_DELAYED_24H: 'warn',
	WARNING_DELAYED_72H: 'danger',
	DOMAIN_BLOCKED: 'danger',
	MAILBOX_FULL_TRANSIENT: 'warn',
	SOFT_BOUNCE_RECURRENT: 'warn',
};

const DEFER_EVENT_TIPO_LABEL: Record<string, string> = {
	WARNING_DELAYED_24H: 'Retraso 24h',
	WARNING_DELAYED_72H: 'Retraso 72h',
	DOMAIN_BLOCKED: 'Dominio bloqueado',
	MAILBOX_FULL_TRANSIENT: 'Buzón lleno (transient)',
	SOFT_BOUNCE_RECURRENT: 'Soft bounce recurrente',
};
// #endregion

// #region Blacklist mappings (Plan 38 Chat 5)
const BLACKLIST_MOTIVO_SEVERITY: Record<EmailBlacklistMotivo, Severity> = {
	BOUNCE_5XX: 'danger',
	BOUNCE_MAILBOX_FULL: 'warn',
	MANUAL: 'info',
	BULK_IMPORT: 'secondary',
	FORMAT_INVALID: 'contrast',
};

const BLACKLIST_MOTIVO_LABEL: Record<EmailBlacklistMotivo, string> = {
	BOUNCE_5XX: 'Bounce permanente 5.x.x',
	BOUNCE_MAILBOX_FULL: 'Buzón lleno crónico (4.2.2)',
	MANUAL: 'Bloqueo manual',
	BULK_IMPORT: 'Carga masiva',
	FORMAT_INVALID: 'Formato inválido',
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

	// #region Tipo Persona (Plan 21)
	/**
	 * Label amigable para el discriminador `TipoPersona` ('E' | 'P').
	 */
	getTipoPersonaLabel(tipo: TipoPersona): string {
		return TIPO_PERSONA_LABEL[tipo] ?? tipo;
	}
	// #endregion

	// #region Blacklist motivo (Plan 38 Chat 5 — D12 / D20)
	getBlacklistMotivoSeverity(motivo: EmailBlacklistMotivo): Severity {
		return BLACKLIST_MOTIVO_SEVERITY[motivo] ?? 'secondary';
	}

	getBlacklistMotivoLabel(motivo: EmailBlacklistMotivo): string {
		return BLACKLIST_MOTIVO_LABEL[motivo] ?? motivo;
	}
	// #endregion

	// #region Quarantine motivo (Plan 37 Chat 3)
	getQuarantineMotivoSeverity(motivo: QuarantineMotivo): Severity {
		return QUARANTINE_MOTIVO_SEVERITY[motivo] ?? 'secondary';
	}

	getQuarantineMotivoLabel(motivo: QuarantineMotivo): string {
		return QUARANTINE_MOTIVO_LABEL[motivo] ?? motivo;
	}

	getMotivoLiberacionLabel(motivo: MotivoLiberacion): string {
		return MOTIVO_LIBERACION_LABEL[motivo] ?? motivo;
	}
	// #endregion

	// #region Domain pause motivo (Plan 37 Chat 3)
	getDomainPauseMotivoSeverity(motivo: DomainPauseMotivo): Severity {
		return DOMAIN_PAUSE_MOTIVO_SEVERITY[motivo] ?? 'secondary';
	}

	getDomainPauseMotivoLabel(motivo: DomainPauseMotivo): string {
		return DOMAIN_PAUSE_MOTIVO_LABEL[motivo] ?? motivo;
	}
	// #endregion

	// #region Defer event tipo (Plan 37 Chat 3)
	getDeferEventTipoSeverity(tipo: DeferEventTipo): Severity {
		return DEFER_EVENT_TIPO_SEVERITY[tipo] ?? 'secondary';
	}

	getDeferEventTipoLabel(tipo: DeferEventTipo): string {
		return DEFER_EVENT_TIPO_LABEL[tipo] ?? tipo;
	}
	// #endregion
}
// #endregion
