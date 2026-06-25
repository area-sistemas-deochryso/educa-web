// #region Imports
import { afterNextRender, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CacheVersionManagerService } from '@core/services/cache';
import { CapacitorService } from '@core/services/capacitor';
import { SwService } from '@core/services/sw';
import { DevtoolsPanelComponent, RateLimitCountdownToastComponent, ToastContainerComponent } from '@shared/components';

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
		afterNextRender(() => {
			this.cacheVersionManager.initialize();
			this.capacitor.initialize();
		});
	}
}
// #endregion
