import {
	ApplicationConfig,
	ErrorHandler,
	LOCALE_ID,
	provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { PreloadAllModules, withPreloading } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-PE';

import Aura from '@primeng/themes/aura';

registerLocaleData(localeEs, 'es-PE');
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor, errorInterceptor } from '@core/interceptors';
import { GlobalErrorHandler } from '@core/services/error';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

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
	],
};
