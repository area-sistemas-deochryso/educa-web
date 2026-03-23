// #region Imports
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { RolUsuarioAdmin } from '../../services';

// #endregion
// #region Implementation
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
	readonly importUsuarios = output<void>();
	readonly exportCredenciales = output<{ rol: string; esVerano: boolean; anio?: number }>();

	// Filtros de exportación de alumnos
	readonly esVerano = signal(false);
	readonly exportAnio = signal(new Date().getFullYear());
	readonly anioOptions = Array.from(
		{ length: new Date().getFullYear() - 2026 + 1 },
		(_, i) => {
			const year = 2026 + i;
			return { label: year.toString(), value: year };
		},
	);

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

	onImportUsuarios(): void {
		this.importUsuarios.emit();
	}

	onExportCredenciales(rol: string): void {
		this.exportCredenciales.emit({
			rol,
			esVerano: rol === 'Estudiante' ? this.esVerano() : false,
			anio: rol === 'Estudiante' ? this.exportAnio() : undefined,
		});
	}

	togglePeriodo(): void {
		this.esVerano.update((v) => !v);
	}
}
// #endregion
