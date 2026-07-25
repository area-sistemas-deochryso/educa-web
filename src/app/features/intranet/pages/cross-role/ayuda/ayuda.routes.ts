import { Routes } from '@angular/router';

/**
 * Rutas hijas del shell del panel de ayuda (`AyudaShellComponent`).
 * `ticket` carga un placeholder hasta que F5 lo reemplace — el shell y esta
 * lista de rutas no cambian. `salud-sede` ya carga el componente real (F6).
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
			import('./sections/ayuda-salud-sede/ayuda-salud-sede.component').then(
				(m) => m.AyudaSaludSedeComponent,
			),
		title: 'Intranet - Ayuda: Salud de sede',
	},
] satisfies Routes;
