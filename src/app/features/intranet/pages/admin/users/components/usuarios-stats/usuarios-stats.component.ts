// #region Imports
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UsuariosEstadisticas } from '../../services';

/**
 * Componente presentacional para las estadísticas de usuarios
 * Muestra cards con totales por rol
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-users-stats',
	standalone: true,
	imports: [],
	templateUrl: './usuarios-stats.component.html',
	styleUrl: './usuarios-stats.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersStatsComponent {
	// * Aggregated totals for stat cards.
	readonly estadisticas = input.required<UsuariosEstadisticas>();
}
// #endregion
