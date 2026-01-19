import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./views/home/home').then((m) => m.HomeComponent),
		title: 'Educa.com.pe - Inicio',
	},
	{
		path: 'nosotros',
		loadComponent: () => import('./views/about/about').then((m) => m.AboutComponent),
		title: 'Educa.com.pe - Nosotros',
	},
	{
		path: 'contacto',
		loadComponent: () => import('./views/contact/contact').then((m) => m.ContactComponent),
		title: 'Educa.com.pe - Contacto',
	},
	{
		path: 'preguntas-frecuentes',
		loadComponent: () => import('./views/faq/faq').then((m) => m.FaqComponent),
		title: 'Educa.com.pe - Preguntas Frecuentes',
	},
	{
		path: 'niveles/inicial',
		loadComponent: () => import('./views/levels/inicial/inicial').then((m) => m.InicialComponent),
		title: 'Educa.com.pe - Nivel Inicial',
	},
	{
		path: 'niveles/primaria',
		loadComponent: () => import('./views/levels/primaria/primaria').then((m) => m.PrimariaComponent),
		title: 'Educa.com.pe - Nivel Primaria',
	},
	{
		path: 'niveles/secundaria',
		loadComponent: () => import('./views/levels/secundaria/secundaria').then((m) => m.SecundariaComponent),
		title: 'Educa.com.pe - Nivel Secundaria',
	},
	{
		path: 'privacidad',
		loadComponent: () => import('./views/privacy/privacy').then((m) => m.PrivacyComponent),
		title: 'Educa.com.pe - Política de Privacidad',
	},
	{
		path: 'terminos',
		loadComponent: () => import('./views/terms/terms').then((m) => m.TermsComponent),
		title: 'Educa.com.pe - Términos y Condiciones',
	},
	{
		path: '**',
		redirectTo: '',
		pathMatch: 'full',
	},
];
