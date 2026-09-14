// #region Imports
import { Routes } from '@angular/router';

// #endregion
// #region Implementation
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
				data: {
					seo: {
						description:
							'Educa.com.pe - Asociación educativa y cultural comprometida con la educación integral en El Agustino, Lima.',
						ogTitle: 'Educa.com.pe - Educación integral en El Agustino',
						canonicalPath: '/',
					},
				},
			},
			{
				path: 'nosotros',
				loadComponent: () =>
					import('@features/public/about/about').then((m) => m.AboutComponent),
				title: 'Educa.com.pe - Nosotros',
				data: {
					seo: {
						description:
							'Conoce la historia, misión y valores de Educa.com.pe, asociación educativa en El Agustino, Lima.',
						ogTitle: 'Nosotros - Educa.com.pe',
						canonicalPath: '/nosotros',
					},
				},
			},
			{
				path: 'contacto',
				loadComponent: () =>
					import('@features/public/contact/contact').then((m) => m.ContactComponent),
				title: 'Educa.com.pe - Contacto',
				data: {
					seo: {
						description:
							'Comunícate con Educa.com.pe: dirección, teléfono, correo y formulario de contacto.',
						ogTitle: 'Contacto - Educa.com.pe',
						canonicalPath: '/contacto',
					},
				},
			},
			{
				path: 'preguntas-frecuentes',
				loadComponent: () => import('@features/public/faq/faq').then((m) => m.FaqComponent),
				title: 'Educa.com.pe - Preguntas Frecuentes',
				data: {
					seo: {
						description:
							'Resolvemos las dudas más frecuentes sobre admisión, niveles y servicios de Educa.com.pe.',
						ogTitle: 'Preguntas Frecuentes - Educa.com.pe',
						canonicalPath: '/preguntas-frecuentes',
					},
				},
			},
			{
				path: 'niveles/inicial',
				loadComponent: () =>
					import('@features/public/levels/inicial/inicial').then(
						(m) => m.InicialComponent,
					),
				title: 'Educa.com.pe - Nivel Inicial',
				data: {
					seo: {
						description:
							'Programa educativo de Nivel Inicial en Educa.com.pe: aprendizaje temprano en un entorno seguro y estimulante.',
						ogTitle: 'Nivel Inicial - Educa.com.pe',
						canonicalPath: '/niveles/inicial',
					},
				},
			},
			{
				path: 'niveles/primaria',
				loadComponent: () =>
					import('@features/public/levels/primaria/primaria').then(
						(m) => m.PrimariaComponent,
					),
				title: 'Educa.com.pe - Nivel Primaria',
				data: {
					seo: {
						description:
							'Programa educativo de Nivel Primaria en Educa.com.pe: formación integral con enfoque en el aprendizaje continuo.',
						ogTitle: 'Nivel Primaria - Educa.com.pe',
						canonicalPath: '/niveles/primaria',
					},
				},
			},
			{
				path: 'niveles/secundaria',
				loadComponent: () =>
					import('@features/public/levels/secundaria/secundaria').then(
						(m) => m.SecundariaComponent,
					),
				title: 'Educa.com.pe - Nivel Secundaria',
				data: {
					seo: {
						description:
							'Programa educativo de Nivel Secundaria en Educa.com.pe: preparación académica y personal para el futuro.',
						ogTitle: 'Nivel Secundaria - Educa.com.pe',
						canonicalPath: '/niveles/secundaria',
					},
				},
			},
			{
				path: 'privacidad',
				loadComponent: () =>
					import('@features/public/privacy/privacy').then((m) => m.PrivacyComponent),
				title: 'Educa.com.pe - Política de Privacidad',
				data: {
					seo: {
						description: 'Política de privacidad y tratamiento de datos de Educa.com.pe.',
						ogTitle: 'Política de Privacidad - Educa.com.pe',
						canonicalPath: '/privacidad',
					},
				},
			},
			{
				path: 'terminos',
				loadComponent: () =>
					import('@features/public/terms/terms').then((m) => m.TermsComponent),
				title: 'Educa.com.pe - Términos y Condiciones',
				data: {
					seo: {
						description: 'Términos y condiciones de uso del sitio y servicios de Educa.com.pe.',
						ogTitle: 'Términos y Condiciones - Educa.com.pe',
						canonicalPath: '/terminos',
					},
				},
			},
			{
				path: '**',
				redirectTo: '',
				pathMatch: 'full',
			},
		],
	},
];
// #endregion
