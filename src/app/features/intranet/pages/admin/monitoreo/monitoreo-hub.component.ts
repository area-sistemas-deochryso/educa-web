// #region Imports
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';

import { PageHeaderComponent } from '@intranet-shared/components/page-header/page-header.component';
import { UserPermissionsService } from '@core/services';
import { PERMISOS, PermisoPath } from '@shared/constants';
import { environment } from '@config/environment';
// #endregion

// #region Types
type FeatureFlagKey = keyof typeof environment.features;

interface MonitoreoLink {
	label: string;
	route: string;
	permiso: PermisoPath;
	featureFlag?: FeatureFlagKey;
}

interface MonitoreoCard {
	id: 'correos' | 'incidencias' | 'seguridad';
	icon: string;
	title: string;
	description: string;
	primaryRoute: string;
	links: MonitoreoLink[];
}
// #endregion

// #region Catálogo declarativo
const ALL_CARDS: MonitoreoCard[] = [
	{
		id: 'correos',
		icon: 'pi pi-envelope',
		title: 'Correos',
		description: 'Bandeja, salud del envío, diagnóstico y auditoría del canal SMTP.',
		primaryRoute: '/intranet/admin/monitoreo/correos',
		links: [
			{
				label: 'Bandeja',
				route: '/intranet/admin/monitoreo/correos/bandeja',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX,
			},
			{
				label: 'Dashboard del día',
				route: '/intranet/admin/monitoreo/correos/dashboard',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX_DASHBOARD_DIA,
				featureFlag: 'emailOutboxDashboardDia',
			},
			{
				label: 'Diagnóstico',
				route: '/intranet/admin/monitoreo/correos/diagnostico',
				permiso: PERMISOS.ADMIN_EMAIL_OUTBOX_DIAGNOSTICO,
				featureFlag: 'emailOutboxDiagnostico',
			},
			{
				label: 'Auditoría',
				route: '/intranet/admin/monitoreo/correos/auditoria',
				permiso: PERMISOS.ADMIN_AUDITORIA_CORREOS,
				featureFlag: 'auditoriaCorreos',
			},
		],
	},
	{
		id: 'incidencias',
		icon: 'pi pi-megaphone',
		title: 'Incidencias',
		description: 'Errores con contexto y reportes manuales de usuarios.',
		primaryRoute: '/intranet/admin/monitoreo/incidencias',
		links: [
			{
				label: 'Errores',
				route: '/intranet/admin/monitoreo/incidencias/errores',
				permiso: PERMISOS.ADMIN_ERROR_LOGS,
			},
			{
				label: 'Reportes de Usuarios',
				route: '/intranet/admin/monitoreo/incidencias/reportes',
				permiso: PERMISOS.ADMIN_REPORTES_USUARIO,
			},
		],
	},
	{
		id: 'seguridad',
		icon: 'pi pi-shield',
		title: 'Seguridad',
		description: 'Saturación, abuso y respuestas 429 del rate limiter.',
		primaryRoute: '/intranet/admin/monitoreo/seguridad/rate-limit',
		links: [
			{
				label: 'Rate Limit',
				route: '/intranet/admin/monitoreo/seguridad/rate-limit',
				permiso: PERMISOS.ADMIN_RATE_LIMIT_EVENTS,
				featureFlag: 'rateLimitMonitoring',
			},
		],
	},
];
// #endregion

@Component({
	selector: 'app-monitoreo-hub',
	standalone: true,
	imports: [RouterLink, ButtonModule, PageHeaderComponent],
	templateUrl: './monitoreo-hub.component.html',
	styleUrl: './monitoreo-hub.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitoreoHubComponent {
	// #region Dependencies
	private readonly userPermisos = inject(UserPermissionsService);
	// #endregion

	// #region Cards visibles (filtradas por permiso + feature flag)
	readonly cards = computed<MonitoreoCard[]>(() => {
		// Touch the signal to make this reactive when permissions load.
		this.userPermisos.loaded();

		return ALL_CARDS.map((card) => ({
			...card,
			links: card.links.filter((link) => this.linkVisible(link)),
		})).filter((card) => card.links.length > 0);
	});

	readonly hasAnyCard = computed(() => this.cards().length > 0);
	// #endregion

	// #region Helpers
	private linkVisible(link: MonitoreoLink): boolean {
		if (link.featureFlag && !environment.features[link.featureFlag]) return false;
		return this.userPermisos.tienePermiso(link.permiso);
	}
	// #endregion
}
