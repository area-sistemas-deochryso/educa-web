import {
	ApplicationConfig,
	ErrorHandler,
	LOCALE_ID,
	provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { PreloadAllModules, withPreloading } from '@angular/router';
import { authInterceptor, errorInterceptor } from '@core/interceptors';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import Aura from '@primeng/themes/aura';
import { DEBUG_CONFIG } from './core/helpers/debug/debug.type';
import { GlobalErrorHandler } from '@core/services/error';
import localeEs from '@angular/common/locales/es-PE';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import { routes } from './app.routes';

registerLocaleData(localeEs, 'es-PE');

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideRouter(routes, withPreloading(PreloadAllModules)),
		provideHttpClient(withFetch(), withInterceptors([authInterceptor, errorInterceptor])),
		provideAnimationsAsync(),
		providePrimeNG({
			theme: {
				preset: Aura,
				options: {
					darkModeSelector: '.dark-mode',
				},
			},
		}),
		{ provide: ErrorHandler, useClass: GlobalErrorHandler },
		{ provide: LOCALE_ID, useValue: 'es-PE' },
		provideClientHydration(withEventReplay()),
		{
			provide: DEBUG_CONFIG,
			useValue: {
				enabled: true,
				minLevel: 'INFO',
				defaultPattern: '', // opcional: 'UI:*,API:*'
				storageKey: 'DEBUG',
				enableStackInTrace: true,
			},
		},
	],
};
