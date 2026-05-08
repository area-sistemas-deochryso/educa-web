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
			},
			{
				label: 'Dashboard del día',
				route: '/intranet/admin/monitoreo/correos/dashboard',
				icon: 'pi pi-chart-bar',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX_DASHBOARD_DIA,
				featureFlag: 'emailOutboxDashboardDia',
				badgeKey: 'dashboard',
			},
			{
				label: 'Diagnóstico',
				route: '/intranet/admin/monitoreo/correos/diagnostico',
				icon: 'pi pi-search',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX_DIAGNOSTICO,
				featureFlag: 'emailOutboxDiagnostico',
				badgeKey: 'diagnostico',
			},
			{
				label: 'Auditoría',
				route: '/intranet/admin/monitoreo/correos/auditoria',
				icon: 'pi pi-history',
				permiso: PERMISOS.ADMIN_AUDITORIA_CORREOS,
				featureFlag: 'auditoriaCorreos',
			},
			{
				label: 'Blacklist',
				route: '/intranet/admin/monitoreo/correos/blacklist',
				icon: 'pi pi-ban',
				permiso: PERMISOS.ADMIN_EMAIL_BLACKLIST,
				featureFlag: 'emailBlacklistTab',
				badgeKey: 'blacklist',
			},
			{
				label: 'Cuarentena',
				route: '/intranet/admin/monitoreo/correos/quarantine',
				icon: 'pi pi-clock',
				permiso: PERMISOS.ADMIN_EMAIL_QUARANTINE,
				featureFlag: 'emailQuarantineTab',
			},
			{
				label: 'Dominios pausados',
				route: '/intranet/admin/monitoreo/correos/domain-pauses',
				icon: 'pi pi-pause',
				permiso: PERMISOS.ADMIN_EMAIL_DOMAIN_PAUSES,
				featureFlag: 'emailDomainPausesTab',
			},
			{
				label: 'Eventos defer',
				route: '/intranet/admin/monitoreo/correos/defer-events',
				icon: 'pi pi-replay',
				permiso: PERMISOS.ADMIN_EMAIL_DEFER_EVENTS,
				featureFlag: 'emailDeferEventsTab',
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
			},
			{
				label: 'Reportes de Usuarios',
				route: '/intranet/admin/monitoreo/incidencias/reportes',
				icon: 'pi pi-comment',
				permiso: PERMISOS.ADMIN_REPORTES_USUARIO,
				badgeKey: 'reportes',
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
			},
		],
	},
];
// #endregion
