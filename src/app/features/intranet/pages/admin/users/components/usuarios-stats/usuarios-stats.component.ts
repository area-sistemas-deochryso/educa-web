import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UsuariosEstadisticas, RoleTab } from '../../models';

@Component({
	selector: 'app-users-stats',
	standalone: true,
	imports: [],
	templateUrl: './usuarios-stats.component.html',
	styleUrl: './usuarios-stats.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersStatsComponent {
	readonly estadisticas = input.required<UsuariosEstadisticas>();
	readonly activeTab = input<RoleTab>(null);
	readonly tabChange = output<RoleTab>();

	readonly adminTotal = computed(() => {
		const s = this.estadisticas();
		return s.totalDirectores + s.totalAsistentesAdministrativos + s.totalPromotores + s.totalCoordinadoresAcademicos;
	});

	onBadgeClick(tab: RoleTab): void {
		this.tabChange.emit(tab);
	}
}
