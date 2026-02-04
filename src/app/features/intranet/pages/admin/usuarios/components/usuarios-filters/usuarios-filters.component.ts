import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { RolUsuarioAdmin } from '@core/services';

export interface FilterOptions {
	rolesOptions: { label: string; value: RolUsuarioAdmin | null }[];
	estadoOptions: { label: string; value: boolean | null }[];
}

/**
 * Componente presentacional para los filtros de usuarios
 * Búsqueda, filtro por rol y estado
 */
@Component({
	selector: 'app-usuarios-filters',
	standalone: true,
	imports: [FormsModule, ButtonModule, InputTextModule, SelectModule],
	templateUrl: './usuarios-filters.component.html',
	styleUrl: './usuarios-filters.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosFiltersComponent {
	// * Inputs reflect current filters in the parent store.
	readonly searchTerm = input.required<string>();
	readonly filterRol = input.required<RolUsuarioAdmin | null>();
	readonly filterEstado = input.required<boolean | null>();
	readonly options = input.required<FilterOptions>();

	// * Outputs bubble user interactions.
	readonly searchChange = output<string>();
	readonly filterRolChange = output<RolUsuarioAdmin | null>();
	readonly filterEstadoChange = output<boolean | null>();
	readonly clearFilters = output<void>();
	readonly newUsuario = output<void>();

	onSearchChange(value: string): void {
		this.searchChange.emit(value);
	}

	onFilterRolChange(value: RolUsuarioAdmin | null): void {
		this.filterRolChange.emit(value);
	}

	onFilterEstadoChange(value: boolean | null): void {
		this.filterEstadoChange.emit(value);
	}

	onClearFilters(): void {
		this.clearFilters.emit();
	}

	onNewUsuario(): void {
		this.newUsuario.emit();
	}
}
