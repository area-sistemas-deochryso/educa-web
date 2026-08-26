// #region Imports
import { afterNextRender, Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CacheVersionManagerService } from '@core/services/cache';
import { CapacitorService } from '@core/services/capacitor';
import { SwService } from '@core/services/sw';
import { ThemeService } from '@core/services/theme';
import {
	DevtoolsPanelComponent,
	RateLimitCountdownToastComponent,
	ToastContainerComponent,
} from '@shared/components';

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
	changeDetection: ChangeDetectionStrategy.OnPush,
	styleUrl: './app.scss',
})
export class AppComponent {
	private swService = inject(SwService);
	private cacheVersionManager = inject(CacheVersionManagerService);
	private capacitor = inject(CapacitorService);
	// Brief 523: providedIn: 'root' no alcanza para forzar la construcción del
	// servicio -- Angular lo instancia recién en la primera inyección real, y
	// user-profile-menu (el único otro consumidor) no existe en /login ni en
	// ninguna ruta pública. Sin esta línea, .dark-mode nunca se aplica ahí.
	private theme = inject(ThemeService);
	title = 'Educa.com.pe';

	constructor() {
		afterNextRender(() => {
			this.cacheVersionManager.initialize();
			this.capacitor.initialize();
		});
	}
}
// #endregion
