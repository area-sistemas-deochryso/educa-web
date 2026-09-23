import { Routes } from '@angular/router';

/**
 * Rutas hijas del shell de administración de tickets (`TicketAdminShellComponent`).
 * Ambas heredan `AYUDA_TICKET_API_MANAGE` vía `permissionPath` declarado en el padre
 * (`intranet.routes.ts`) — ver `.claude/reference/route-permission-sharing.md`.
 */
export default [
	{ path: '', redirectTo: 'bandeja', pathMatch: 'full' },
	{
		path: 'bandeja',
		loadComponent: () =>
			import('./ticket-bandeja/ticket-bandeja.component').then((m) => m.TicketBandejaComponent),
		title: 'Intranet - Tickets de soporte: Bandeja',
	},
	{
		path: 'tipos',
		loadComponent: () =>
			import('./ticket-tipos/ticket-tipos.component').then((m) => m.TicketTiposComponent),
		title: 'Intranet - Tickets de soporte: Tipos',
	},
] satisfies Routes;
