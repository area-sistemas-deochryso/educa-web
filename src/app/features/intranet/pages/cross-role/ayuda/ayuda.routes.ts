import { Routes } from '@angular/router';

/**
 * Rutas hijas del shell del panel de ayuda (`AyudaShellComponent`).
 * `salud-sede` carga un placeholder hasta que F6 lo reemplace por su
 * componente real — el shell y esta lista de rutas no cambian.
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
			import(
				'./sections/ayuda-salud-sede-placeholder/ayuda-salud-sede-placeholder.component'
			).then((m) => m.AyudaSaludSedePlaceholderComponent),
		title: 'Intranet - Ayuda: Salud de sede',
	},
] satisfies Routes;
