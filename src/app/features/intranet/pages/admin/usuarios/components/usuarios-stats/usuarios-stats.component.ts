// #region Imports
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UsuariosEstadisticas } from '@core/services';

/**
 * Componente presentacional para las estadísticas de usuarios
 * Muestra cards con totales por rol
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-usuarios-stats',
	standalone: true,
	imports: [],
	templateUrl: './usuarios-stats.component.html',
	styleUrl: './usuarios-stats.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosStatsComponent {
	// * Aggregated totals for stat cards.
	readonly estadisticas = input.required<UsuariosEstadisticas>();
}
// #endregion
