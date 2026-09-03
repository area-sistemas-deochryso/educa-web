// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '@config/environment';

// #endregion
// #region Implementation
/**
 * Entrada dev-only a "herramientas de prueba" (P107 F1), fuera del sistema
 * de menú por capability — se gatea solo por environment.debug (build-time,
 * no isDevMode(), roto en Angular 22 + esbuild — ver reference/debug.md).
 */
@Component({
	selector: 'app-test-tools-nav-link',
	standalone: true,
	imports: [RouterLink],
	templateUrl: './test-tools-nav-link.component.html',
	styleUrl: './test-tools-nav-link.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestToolsNavLinkComponent {
	readonly show = environment.debug.testTools;
}
// #endregion
