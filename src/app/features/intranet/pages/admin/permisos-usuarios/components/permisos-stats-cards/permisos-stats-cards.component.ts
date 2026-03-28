import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	selector: 'app-permisos-stats-cards',
	standalone: true,
	templateUrl: './permisos-stats-cards.component.html',
	styleUrl: './permisos-stats-cards.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermisosStatsCardsComponent {
	readonly totalUsuarios = input.required<number>();
	readonly rolesCount = input.required<number>();
	readonly totalModulos = input.required<number>();
	readonly vistasCount = input.required<number>();
}
