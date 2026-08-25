import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { periodoActual, filtrarPorPeriodoAcademico } from '@shared/models';
import { SalonListDto } from '@features/intranet/pages/admin/schedules/models/salon.interface';
import { RoleTab } from '../../models';
import { EduButton, EduInputText, EduSelect, EduTooltip } from '@edu-ui';

export interface FilterOptions {
	estadoOptions: { label: string; value: boolean | null }[];
}

@Component({
	selector: 'app-users-filters',
	standalone: true,
	imports: [FormsModule, EduButton, EduInputText, EduSelect, EduTooltip],
	templateUrl: './usuarios-filters.component.html',
	styleUrl: './usuarios-filters.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersFiltersComponent {
	readonly searchTerm = input.required<string>();
	readonly filterEstado = input.required<boolean | null>();
	readonly filterSalonId = input.required<number | null>();
	readonly salones = input.required<SalonListDto[]>();
	readonly options = input.required<FilterOptions>();
	readonly activeTab = input<RoleTab>(null);

	readonly searchChange = output<string>();
	readonly filterEstadoChange = output<boolean | null>();
	readonly filterSalonIdChange = output<number | null>();
	readonly clearFilters = output<void>();

	private readonly periodo = periodoActual();

	readonly showSalonFilter = computed(() => {
		const tab = this.activeTab();
		return tab !== 'admin';
	});

	readonly salonOptions = computed(() => {
		const salonesFiltrados = filtrarPorPeriodoAcademico(
			this.salones(),
			this.periodo,
			(s) => s.seccion,
		);
		const opts = salonesFiltrados.map((s) => ({
			label: `${s.grado} ${s.seccion}`,
			value: s.salonId,
			gradoOrden: s.gradoOrden,
		}));
		opts.sort((a, b) => a.gradoOrden - b.gradoOrden || a.label.localeCompare(b.label));
		return [
			{ label: 'Todos los salones', value: null as number | null, gradoOrden: 0 },
			...opts];
	});

	readonly hasActiveFilters = computed(() =>
		this.filterEstado() !== null || this.filterSalonId() !== null || this.searchTerm() !== '',
	);

	onSearchChange(value: string): void {
		this.searchChange.emit(value);
	}

	onFilterEstadoChange(value: boolean | null): void {
		this.filterEstadoChange.emit(value);
	}

	onFilterSalonIdChange(value: number | null): void {
		this.filterSalonIdChange.emit(value);
	}

	onClearFilters(): void {
		this.clearFilters.emit();
	}
}
