import { Routes } from '@angular/router';

/**
 * Rutas hijas del shell de administración de Asistencias (`AttendancesShellComponent`).
 * Las 3 heredan `ASISTENCIA_ADMIN_PAGE_VIEW` vía `permissionPath` declarado en el padre
 * (`intranet.routes.ts`) — ver `.claude/reference/route-permission-sharing.md`.
 */
export default [
	{ path: '', redirectTo: 'gestion', pathMatch: 'full' },
	{
		path: 'gestion',
		loadComponent: () =>
			import('./attendances-gestion/attendances-gestion.component').then(
				(m) => m.AttendancesGestionComponent,
			),
		title: 'Intranet - Asistencias: Editar registros',
	},
	{
		path: 'reportes',
		loadComponent: () =>
			import('../../cross-role/attendance-reports').then((m) => m.AttendanceReportsComponent),
		title: 'Intranet - Asistencias: Reportes',
	},
	{
		path: 'panel',
		loadComponent: () =>
			import('../attendance-panel').then((m) => m.AttendancePanelComponent),
		title: 'Intranet - Asistencias: Panel',
	},
] satisfies Routes;
