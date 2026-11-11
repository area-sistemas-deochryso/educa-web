import { Routes } from '@angular/router';

/**
 * Rutas hijas del shell de Pagos (`PagosShellComponent`). Heredan la autorización de
 * `PAGOS_API_MANAGE` vía `permissionPath` declarado en el padre (`intranet.routes.ts`) — ver
 * `.claude/reference/route-permission-sharing.md`. F5b (registrar pago), F5c (estado de cuenta, sin dato) y F6b (configurar año) y F6c (importar) suman hijas acá; el estado de cuenta tiene dos rutas (landing con buscador y `:estudianteId`).
 */
export default [
	{ path: '', redirectTo: 'panel', pathMatch: 'full' },
	{
		path: 'panel',
		loadComponent: () => import('./panel-cobranza/panel-cobranza.component').then((m) => m.PanelCobranzaComponent),
		title: 'Intranet - Pagos: Panel de cobranza',
	},
	{
		path: 'registrar',
		loadComponent: () =>
			import('./registrar-pago/registrar-pago.component').then((m) => m.RegistrarPagoComponent),
		title: 'Intranet - Pagos: Registrar pago',
	},
	{
		path: 'estado-cuenta',
		loadComponent: () => import('./estado-cuenta/estado-cuenta.component').then((m) => m.EstadoCuentaComponent),
		title: 'Intranet - Pagos: Estado de cuenta',
	},
	{
		path: 'estado-cuenta/:estudianteId',
		loadComponent: () => import('./estado-cuenta/estado-cuenta.component').then((m) => m.EstadoCuentaComponent),
		title: 'Intranet - Pagos: Estado de cuenta',
	},
	{
		path: 'sin-dato',
		loadComponent: () => import('./sin-dato/sin-dato.component').then((m) => m.SinDatoComponent),
		title: 'Intranet - Pagos: Sin dato',
	},
	{
		path: 'configurar-anio',
		loadComponent: () =>
			import('./configurar-anio/configurar-anio.component').then((m) => m.ConfigurarAnioComponent),
		title: 'Intranet - Pagos: Configurar año',
	},
	{
		path: 'importar',
		loadComponent: () => import('./importacion/importacion.component').then((m) => m.ImportacionComponent),
		title: 'Intranet - Pagos: Importar',
	},
] satisfies Routes;
