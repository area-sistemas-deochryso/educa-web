// #region Imports
import { environment } from '@config/environment';
import { CapabilityCode } from '@shared/types';

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
	capability: CapabilityCode;
	featureFlag?: FeatureFlagKey;
	badgeKey?: HubBadgeKey;
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
				capability: 'ADMIN_EMAIL_OUTBOX',
				badgeKey: 'bandeja',
				description: 'Trazabilidad completa del outbox: filtros por tipo, estado y rango — con HTML del cuerpo y exportación.',
			},
			{
				label: 'Dashboard del día',
				route: '/intranet/admin/monitoreo/correos/dashboard',
				icon: 'pi pi-chart-bar',
				capability: 'ADMIN_EMAIL_OUTBOX_DASHBOARD_DIA',
				featureFlag: 'emailOutboxDashboardDia',
				badgeKey: 'dashboard',
				description: 'Métricas en vivo: throttle, sender stats, dominios receptores y mapa de envío.',
			},
			{
				label: 'Diagnóstico',
				route: '/intranet/admin/monitoreo/correos/diagnostico',
				icon: 'pi pi-search',
				capability: 'ADMIN_EMAIL_OUTBOX_DIAGNOSTICO',
				featureFlag: 'emailOutboxDiagnostico',
				badgeKey: 'diagnostico',
				description: 'Candidatos a blacklistear y dominios con tasa de fallo elevada.',
			},
			{
				label: 'Validación de datos',
				route: '/intranet/admin/monitoreo/correos/auditoria',
				icon: 'pi pi-history',
				capability: 'ADMIN_AUDITORIA_CORREOS',
				featureFlag: 'auditoriaCorreos',
				description: 'Registros con correo inválido o ausente.',
			},
			{
				label: 'Blacklist',
				route: '/intranet/admin/monitoreo/correos/blacklist',
				icon: 'pi pi-ban',
				capability: 'ADMIN_EMAIL_BLACKLIST',
				featureFlag: 'emailBlacklistTab',
				badgeKey: 'blacklist',
				description: 'Destinatarios bloqueados permanentemente, con motivo y fecha.',
			},
			{
				label: 'Cuarentena',
				route: '/intranet/admin/monitoreo/correos/quarantine',
				icon: 'pi pi-clock',
				capability: 'ADMIN_EMAIL_QUARANTINE',
				featureFlag: 'emailQuarantineTab',
				description: 'Pausas temporales con auto-release. Promueve a blacklist al 3.er hit.',
			},
			{
				label: 'Dominios pausados',
				route: '/intranet/admin/monitoreo/correos/domain-pauses',
				icon: 'pi pi-pause',
				capability: 'ADMIN_EMAIL_DOMAIN_PAUSES',
				featureFlag: 'emailDomainPausesTab',
				description: 'Dominios receptores pausados con timeout y auto-resume.',
			},
			{
				label: 'Eventos defer',
				route: '/intranet/admin/monitoreo/correos/defer-events',
				icon: 'pi pi-replay',
				capability: 'ADMIN_EMAIL_DEFER_EVENTS',
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
		tone: 'red',
		tiles: [
			{
				label: 'Errores',
				route: '/intranet/admin/monitoreo/incidencias/errores',
				icon: 'pi pi-exclamation-circle',
				capability: 'ADMIN_ERROR_LOGS',
				badgeKey: 'errores',
				description: 'Bugs agrupados por fingerprint con kanban de estados (NUEVO → RESUELTO).',
			},
			{
				label: 'Reportes de Usuarios',
				route: '/intranet/admin/monitoreo/incidencias/reportes',
				icon: 'pi pi-comment',
				capability: 'ADMIN_REPORTES_USUARIO',
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
				capability: 'ADMIN_RATE_LIMIT_EVENTS',
				featureFlag: 'rateLimitMonitoring',
				badgeKey: 'rateLimit',
				description: 'Eventos 429 con policy, partition, top endpoints y top roles afectados.',
			},
		],
	},
];
// #endregion
