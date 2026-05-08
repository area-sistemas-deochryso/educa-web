// #region Imports
import { PERMISOS, PermisoPath } from '@shared/constants';

import { environment } from '@config/environment';

import {
	DomainId,
	DomainTone,
	HubBadgeKey,
} from './models/monitoreo-hub-badges.models';
// #endregion

// #region Tipos
type FeatureFlagKey = keyof typeof environment.features;

export interface DomainTile {
	label: string;
	route: string;
	icon: string;
	permiso: PermisoPath;
	featureFlag?: FeatureFlagKey;
	badgeKey?: HubBadgeKey;
	/** Texto que se ve al voltear la card (back face). 1-2 líneas. */
	description: string;
}

export interface DomainDef {
	id: DomainId;
	label: string;
	icon: string;
	description: string;
	tone: DomainTone;
	tiles: DomainTile[];
}
// #endregion

// #region Catálogo declarativo de los 3 dominios
export const DOMAINS: DomainDef[] = [
	{
		id: 'correos',
		label: 'Correos',
		icon: 'pi pi-envelope',
		description: 'Bandeja, salud del envío, defensas y diagnóstico del canal SMTP.',
		tone: 'blue',
		tiles: [
			{
				label: 'Bandeja',
				route: '/intranet/admin/monitoreo/correos/bandeja',
				icon: 'pi pi-inbox',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX,
				badgeKey: 'bandeja',
				description: 'Trazabilidad completa del outbox: filtros por tipo, estado y rango — con HTML del cuerpo y exportación.',
			},
			{
				label: 'Dashboard del día',
				route: '/intranet/admin/monitoreo/correos/dashboard',
				icon: 'pi pi-chart-bar',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX_DASHBOARD_DIA,
				featureFlag: 'emailOutboxDashboardDia',
				badgeKey: 'dashboard',
				description: 'Métricas en vivo: throttle, sender stats, dominios receptores y mapa de envío.',
			},
			{
				label: 'Diagnóstico',
				route: '/intranet/admin/monitoreo/correos/diagnostico',
				icon: 'pi pi-search',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX_DIAGNOSTICO,
				featureFlag: 'emailOutboxDiagnostico',
				badgeKey: 'diagnostico',
				description: 'Candidatos a blacklistear y dominios con tasa de fallo elevada.',
			},
			{
				label: 'Auditoría',
				route: '/intranet/admin/monitoreo/correos/auditoria',
				icon: 'pi pi-history',
				permiso: PERMISOS.ADMIN_AUDITORIA_CORREOS,
				featureFlag: 'auditoriaCorreos',
				description: 'Búsqueda histórica con paginación server-side y exportación.',
			},
			{
				label: 'Blacklist',
				route: '/intranet/admin/monitoreo/correos/blacklist',
				icon: 'pi pi-ban',
				permiso: PERMISOS.ADMIN_EMAIL_BLACKLIST,
				featureFlag: 'emailBlacklistTab',
				badgeKey: 'blacklist',
				description: 'Destinatarios bloqueados permanentemente, con motivo y fecha.',
			},
			{
				label: 'Cuarentena',
				route: '/intranet/admin/monitoreo/correos/quarantine',
				icon: 'pi pi-clock',
				permiso: PERMISOS.ADMIN_EMAIL_QUARANTINE,
				featureFlag: 'emailQuarantineTab',
				description: 'Pausas temporales con auto-release. Promueve a blacklist al 3.er hit.',
			},
			{
				label: 'Dominios pausados',
				route: '/intranet/admin/monitoreo/correos/domain-pauses',
				icon: 'pi pi-pause',
				permiso: PERMISOS.ADMIN_EMAIL_DOMAIN_PAUSES,
				featureFlag: 'emailDomainPausesTab',
				description: 'Dominios receptores pausados con timeout y auto-resume.',
			},
			{
				label: 'Eventos defer',
				route: '/intranet/admin/monitoreo/correos/defer-events',
				icon: 'pi pi-replay',
				permiso: PERMISOS.ADMIN_EMAIL_DEFER_EVENTS,
				featureFlag: 'emailDeferEventsTab',
				description: 'Historial de defers/fails sincrónicos del MTA por destinatario.',
			},
		],
	},
	{
		id: 'incidencias',
		label: 'Incidencias',
		icon: 'pi pi-megaphone',
		description: 'Errores con contexto del runtime y reportes manuales de usuarios.',
		tone: 'amber',
		tiles: [
			{
				label: 'Errores',
				route: '/intranet/admin/monitoreo/incidencias/errores',
				icon: 'pi pi-exclamation-circle',
				permiso: PERMISOS.ADMIN_ERROR_LOGS,
				badgeKey: 'errores',
				description: 'Bugs agrupados por fingerprint con kanban de estados (NUEVO → RESUELTO).',
			},
			{
				label: 'Reportes de Usuarios',
				route: '/intranet/admin/monitoreo/incidencias/reportes',
				icon: 'pi pi-comment',
				permiso: PERMISOS.ADMIN_REPORTES_USUARIO,
				badgeKey: 'reportes',
				description: 'Feedback manual: tipo, descripción y propuesta enviada por usuarios.',
			},
		],
	},
	{
		id: 'seguridad',
		label: 'Seguridad',
		icon: 'pi pi-shield',
		description: 'Saturación, abuso y respuestas 429 del rate limiter.',
		tone: 'green',
		tiles: [
			{
				label: 'Rate Limit',
				route: '/intranet/admin/monitoreo/seguridad/rate-limit',
				icon: 'pi pi-bolt',
				permiso: PERMISOS.ADMIN_RATE_LIMIT_EVENTS,
				featureFlag: 'rateLimitMonitoring',
				badgeKey: 'rateLimit',
				description: 'Eventos 429 con policy, partition, top endpoints y top roles afectados.',
			},
		],
	},
];
// #endregion
