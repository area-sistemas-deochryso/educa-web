import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UsuariosEstadisticas } from '@core/services';

/**
 * Componente presentacional para las estadísticas de usuarios
 * Muestra cards con totales por rol
 */
@Component({
	selector: 'app-usuarios-stats',
	standalone: true,
	imports: [],
	templateUrl: './usuarios-stats.component.html',
	styleUrl: './usuarios-stats.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosStatsComponent {
	readonly estadisticas = input.required<UsuariosEstadisticas>();
}
