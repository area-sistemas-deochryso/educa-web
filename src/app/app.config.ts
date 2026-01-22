import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { PreloadAllModules, withPreloading } from '@angular/router';

import Aura from '@primeng/themes/aura';
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
		provideClientHydration(withEventReplay()),
	],
};
