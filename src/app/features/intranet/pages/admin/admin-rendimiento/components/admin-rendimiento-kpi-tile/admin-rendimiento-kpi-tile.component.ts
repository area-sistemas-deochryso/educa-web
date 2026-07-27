import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Tile de indicador simple para el panel institucional — a diferencia de
 * `AttendancePanelKpiTileComponent` (clon visual de referencia), estos KPIs no tienen
 * un "período anterior" comparable a nivel agregado (el endpoint institucional no lo
 * expone), así que se muestra el valor puntual en vez de un mini-chart actual/anterior.
 */
@Component({
	selector: 'app-admin-rendimiento-kpi-tile',
	standalone: true,
	templateUrl: './admin-rendimiento-kpi-tile.component.html',
	styleUrl: './admin-rendimiento-kpi-tile.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRendimientoKpiTileComponent {
	readonly label = input.required<string>();
	readonly valor = input.required<string>();
	readonly icono = input('pi pi-chart-line');
	readonly variante = input<'neutro' | 'alerta'>('neutro');
}
