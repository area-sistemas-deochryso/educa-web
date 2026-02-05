import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CacheVersionManagerService, SwService } from '@core/services';
import { ToastContainerComponent } from '@shared/components/toast-container';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet, ToastContainerComponent],
	templateUrl: './app.html',
	styleUrl: './app.scss',
})
export class AppComponent {
	private swService = inject(SwService);
	private cacheVersionManager = inject(CacheVersionManagerService);
	title = 'Educa.com.pe';

	constructor() {
		// Invalidación automática de cache cuando el backend cambia
		// El desarrollador solo necesita cambiar versiones en cache-versions.config.ts
		this.cacheVersionManager.initialize();
	}
}
