// #region Imports
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CacheVersionManagerService, CapacitorService, SwService } from '@core/services';
import { DevtoolsPanelComponent } from '@shared/components/devtools';
import { RateLimitCountdownToastComponent } from '@shared/components/rate-limit-countdown-toast';
import { ToastContainerComponent } from '@shared/components/toast-container';

// #endregion
// #region Implementation
@Component({
	selector: 'app-root',
	standalone: true,
	imports: [
		RouterOutlet,
		ToastContainerComponent,
		DevtoolsPanelComponent,
		RateLimitCountdownToastComponent,
	],
	templateUrl: './app.html',
	styleUrl: './app.scss',
})
export class AppComponent {
	private swService = inject(SwService);
	private cacheVersionManager = inject(CacheVersionManagerService);
	private capacitor = inject(CapacitorService);
	title = 'Educa.com.pe';

	constructor() {
		this.cacheVersionManager.initialize();
		this.capacitor.initialize();
	}
}
// #endregion
