// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { periodoActual, filtrarPorPeriodoAcademico } from '@shared/models';
import { SalonListDto } from '@features/intranet/pages/admin/schedules/models/salon.interface';
import { RolUsuarioAdmin } from '../../services';

// #endregion
// #region Implementation
export interface FilterOptions {
	rolesOptions: { label: string; value: RolUsuarioAdmin | null }[];
	estadoOptions: { label: string; value: boolean | null }[];
}

/**
 * Barra de filtros: búsqueda, rol, estado y salón.
 */
@Component({
	selector: 'app-users-filters',
	standalone: true,
	imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, TooltipModule],
	templateUrl: './usuarios-filters.component.html',
	styleUrl: './usuarios-filters.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersFiltersComponent {
	// #region Inputs
	readonly searchTerm = input.required<string>();
	readonly filterRol = input.required<RolUsuarioAdmin | null>();
	readonly filterEstado = input.required<boolean | null>();
	readonly filterSalonId = input.required<number | null>();
	readonly salones = input.required<SalonListDto[]>();
	readonly options = input.required<FilterOptions>();
	// #endregion

	// #region Computed
	private readonly periodo = periodoActual();

	readonly salonOptions = computed(() => {
		const salonesFiltrados = filtrarPorPeriodoAcademico(
			this.salones(),
			this.periodo,
			(s) => s.seccion,
		);
		const options = salonesFiltrados.map((s) => ({
			label: `${s.grado} ${s.seccion}`,
			value: s.salonId,
			gradoOrden: s.gradoOrden,
		}));
		// Ordenar por GRA_Orden (Inicial 1-3, Primaria 4-9, Secundaria 10-14) y luego sección
		options.sort((a, b) => a.gradoOrden - b.gradoOrden || a.label.localeCompare(b.label));
		return [
			{ label: 'Todos los salones', value: null as number | null, gradoOrden: 0 },
			...options,
		];
	});
	// #endregion

	// #region Outputs
	readonly searchChange = output<string>();
	readonly filterRolChange = output<RolUsuarioAdmin | null>();
	readonly filterEstadoChange = output<boolean | null>();
	readonly filterSalonIdChange = output<number | null>();
	readonly clearFilters = output<void>();
	// #endregion

	// #region Handlers
	onSearchChange(value: string): void {
		this.searchChange.emit(value);
	}

	onFilterRolChange(value: RolUsuarioAdmin | null): void {
		this.filterRolChange.emit(value);
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
	// #endregion
}
// #endregion
