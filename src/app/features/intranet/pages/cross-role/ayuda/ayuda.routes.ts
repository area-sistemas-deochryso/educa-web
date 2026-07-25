import { Routes } from '@angular/router';

/**
 * Rutas hijas del shell del panel de ayuda (`AyudaShellComponent`).
 * Las 3 secciones (qa, ticket, salud-sede) cargan sus componentes reales.
 */
export default [
	{ path: '', redirectTo: 'qa', pathMatch: 'full' },
	{
		path: 'qa',
		loadComponent: () =>
			import('./sections/ayuda-qa/ayuda-qa.component').then((m) => m.AyudaQaComponent),
		title: 'Intranet - Ayuda: Preguntas frecuentes',
	},
	{
		path: 'ticket',
		loadComponent: () =>
			import('./sections/ayuda-ticket/ayuda-ticket.component').then(
				(m) => m.AyudaTicketComponent,
			),
		title: 'Intranet - Ayuda: Generar ticket',
	},
	{
		path: 'salud-sede',
		loadComponent: () =>
			import('./sections/ayuda-salud-sede/ayuda-salud-sede.component').then(
				(m) => m.AyudaSaludSedeComponent,
			),
		title: 'Intranet - Ayuda: Salud de sede',
	},
] satisfies Routes;
