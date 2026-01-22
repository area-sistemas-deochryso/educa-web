import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
	// Public routes - can be prerendered
	{
		path: '',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'nosotros',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'contacto',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'preguntas-frecuentes',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'niveles/inicial',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'niveles/primaria',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'niveles/secundaria',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'privacidad',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'terminos',
		renderMode: RenderMode.Prerender,
	},
	// Intranet login - can be prerendered
	{
		path: 'intranet/login',
		renderMode: RenderMode.Prerender,
	},
	// Intranet authenticated routes - client-side only
	{
		path: 'intranet/**',
		renderMode: RenderMode.Client,
	},
	// Catch-all for any other routes
	{
		path: '**',
		renderMode: RenderMode.Client,
	},
];
