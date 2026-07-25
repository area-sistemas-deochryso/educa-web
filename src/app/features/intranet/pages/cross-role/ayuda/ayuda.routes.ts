import { Routes } from '@angular/router';

/**
 * Rutas hijas del shell del panel de ayuda (`AyudaShellComponent`).
 * `ticket` y `salud-sede` cargan placeholders hasta que F5/F6 los reemplacen
 * por sus componentes reales — el shell y esta lista de rutas no cambian.
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
			import('./sections/ayuda-ticket-placeholder/ayuda-ticket-placeholder.component').then(
				(m) => m.AyudaTicketPlaceholderComponent,
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
