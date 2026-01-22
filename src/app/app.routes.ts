import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: 'intranet',
		loadChildren: () =>
			import('@features/intranet/intranet.routes').then((m) => m.INTRANET_ROUTES),
	},
	{
		path: '',
		loadComponent: () => import('@shared/components/layout').then((m) => m.MainLayoutComponent),
		children: [
			{
				path: '',
				loadComponent: () =>
					import('@features/public/home/home').then((m) => m.HomeComponent),
				title: 'Educa.com.pe - Inicio',
			},
			{
				path: 'nosotros',
				loadComponent: () =>
					import('@features/public/about/about').then((m) => m.AboutComponent),
				title: 'Educa.com.pe - Nosotros',
			},
			{
				path: 'contacto',
				loadComponent: () =>
					import('@features/public/contact/contact').then((m) => m.ContactComponent),
				title: 'Educa.com.pe - Contacto',
			},
			{
				path: 'preguntas-frecuentes',
				loadComponent: () => import('@features/public/faq/faq').then((m) => m.FaqComponent),
				title: 'Educa.com.pe - Preguntas Frecuentes',
			},
			{
				path: 'niveles/inicial',
				loadComponent: () =>
					import('@features/public/levels/inicial/inicial').then(
						(m) => m.InicialComponent,
					),
				title: 'Educa.com.pe - Nivel Inicial',
			},
			{
				path: 'niveles/primaria',
				loadComponent: () =>
					import('@features/public/levels/primaria/primaria').then(
						(m) => m.PrimariaComponent,
					),
				title: 'Educa.com.pe - Nivel Primaria',
			},
			{
				path: 'niveles/secundaria',
				loadComponent: () =>
					import('@features/public/levels/secundaria/secundaria').then(
						(m) => m.SecundariaComponent,
					),
				title: 'Educa.com.pe - Nivel Secundaria',
			},
			{
				path: 'privacidad',
				loadComponent: () =>
					import('@features/public/privacy/privacy').then((m) => m.PrivacyComponent),
				title: 'Educa.com.pe - Política de Privacidad',
			},
			{
				path: 'terminos',
				loadComponent: () =>
					import('@features/public/terms/terms').then((m) => m.TermsComponent),
				title: 'Educa.com.pe - Términos y Condiciones',
			},
			{
				path: '**',
				redirectTo: '',
				pathMatch: 'full',
			},
		],
	},
];
