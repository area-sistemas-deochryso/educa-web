// #region Imports
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CacheVersionManagerService, SwService } from '@core/services';
import { DevtoolsPanelComponent } from '@shared/components/devtools';
import { ToastContainerComponent } from '@shared/components/toast-container';

// #endregion
// #region Implementation
@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet, ToastContainerComponent, DevtoolsPanelComponent],
	templateUrl: './app.html',
	styleUrl: './app.scss',
})
export class AppComponent {
	private swService = inject(SwService);
	private cacheVersionManager = inject(CacheVersionManagerService);
	title = 'Educa.com.pe';

	constructor() {
		// InvalidaciÃƒÆ’Ã‚Â³n automÃƒÆ’Ã‚Â¡tica de cache cuando el backend cambia
		// El desarrollador solo necesita cambiar versiones en cache-versions.config.ts
		this.cacheVersionManager.initialize();
	}
}
// #endregion
