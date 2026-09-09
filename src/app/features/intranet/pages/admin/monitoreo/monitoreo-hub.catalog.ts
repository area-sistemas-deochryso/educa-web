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
				capability: 'EMAIL_OUTBOX_API_VIEW',
				badgeKey: 'bandeja',
				description: 'Trazabilidad completa del outbox: filtros por tipo, estado y rango — con HTML del cuerpo y exportación.',
			},
			{
				label: 'Dashboard del día',
				route: '/intranet/admin/monitoreo/correos/dashboard',
				icon: 'pi pi-chart-bar',
				capability: 'EMAIL_OUTBOX_DASHBOARD_PAGE_VIEW',
				featureFlag: 'emailOutboxDashboardDia',
				badgeKey: 'dashboard',
				description: 'Métricas en vivo: throttle, sender stats, dominios receptores y mapa de envío.',
			},
			{
				label: 'Diagnóstico',
				route: '/intranet/admin/monitoreo/correos/diagnostico',
				icon: 'pi pi-search',
				capability: 'EMAIL_OUTBOX_DIAGNOSTICO_PAGE_API_VIEW',
				featureFlag: 'emailOutboxDiagnostico',
				badgeKey: 'diagnostico',
				description: 'Candidatos a blacklistear y dominios con tasa de fallo elevada.',
			},
			{
				label: 'Validación de datos',
				route: '/intranet/admin/monitoreo/correos/auditoria',
				icon: 'pi pi-history',
				capability: 'AUDITORIA_CORREOS_API_VIEW',
				featureFlag: 'auditoriaCorreos',
				description: 'Registros con correo inválido o ausente.',
			},
			{
				label: 'Blacklist',
				route: '/intranet/admin/monitoreo/correos/blacklist',
				icon: 'pi pi-ban',
				capability: 'EMAIL_BLACKLIST_API_MANAGE',
				featureFlag: 'emailBlacklistTab',
				badgeKey: 'blacklist',
				description: 'Destinatarios bloqueados permanentemente, con motivo y fecha.',
			},
			{
				label: 'Cuarentena',
				route: '/intranet/admin/monitoreo/correos/quarantine',
				icon: 'pi pi-clock',
				capability: 'EMAIL_QUARANTINE_API_MANAGE',
				featureFlag: 'emailQuarantineTab',
				description: 'Pausas temporales con auto-release. Promueve a blacklist al 3.er hit.',
			},
			{
				label: 'Dominios pausados',
				route: '/intranet/admin/monitoreo/correos/domain-pauses',
				icon: 'pi pi-pause',
				capability: 'EMAIL_DOMINIO_PAGE_VIEW',
				featureFlag: 'emailDomainPausesTab',
				description: 'Dominios receptores pausados con timeout y auto-resume.',
			},
			{
				label: 'Eventos defer',
				route: '/intranet/admin/monitoreo/correos/defer-events',
				icon: 'pi pi-replay',
				capability: 'EMAIL_DEFER_EVENTS_API_VIEW',
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
				capability: 'ERROR_LOGS_API_VIEW',
				badgeKey: 'errores',
				description: 'Bugs agrupados por fingerprint con kanban de estados (NUEVO → RESUELTO).',
			},
			{
				label: 'Reportes de Usuarios',
				route: '/intranet/admin/monitoreo/incidencias/reportes',
				icon: 'pi pi-comment',
				capability: 'REPORTES_USUARIO_API_VIEW',
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
				capability: 'RATE_LIMIT_EVENTS_API_VIEW',
				featureFlag: 'rateLimitMonitoring',
				badgeKey: 'rateLimit',
				description: 'Eventos 429 con policy, partition, top endpoints y top roles afectados.',
			},
		],
	},
];
// #endregion
