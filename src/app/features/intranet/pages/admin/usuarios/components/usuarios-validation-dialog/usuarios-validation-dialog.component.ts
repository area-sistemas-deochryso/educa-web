import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

// #region Model
export interface UsuarioValidacionItem {
	nombreCompleto: string;
	dni: string;
	correo: string;
	rol: string;
	salonNombre: string;
	errores: string[];
}

export interface ErrorFilterOption {
	label: string;
	value: string | null;
}
// #endregion

@Component({
	selector: 'app-usuarios-validation-dialog',
	standalone: true,
	imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TableModule, TagModule, TooltipModule],
	templateUrl: './usuarios-validation-dialog.component.html',
	styleUrl: './usuarios-validation-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosValidationDialogComponent {
	readonly visible = input(false);
	readonly loading = input(false);
	readonly items = input<UsuarioValidacionItem[]>([]);
	readonly allValid = input(false);

	readonly visibleChange = output<boolean>();
	readonly editUsuario = output<UsuarioValidacionItem>();

	// #region Estado local de filtros
	readonly searchTerm = signal('');
	readonly filterError = signal<string | null>(null);
	// #endregion

	// #region Computed
	readonly errorOptions = computed<ErrorFilterOption[]>(() => {
		const erroresSet = new Set<string>();
		for (const item of this.items()) {
			for (const e of item.errores) {
				erroresSet.add(e);
			}
		}
		return [
			{ label: 'Todos los errores', value: null },
			...[...erroresSet].sort().map((e) => ({ label: e, value: e })),
		];
	});

	readonly filteredItems = computed(() => {
		const search = this.searchTerm().toLowerCase().trim();
		const errorFilter = this.filterError();

		return this.items().filter((item) => {
			// Filtro por tipo de error
			if (errorFilter && !item.errores.includes(errorFilter)) {
				return false;
			}
			// Búsqueda en todos los campos
			if (search) {
				const haystack = `${item.nombreCompleto} ${item.dni} ${item.correo} ${item.rol} ${item.errores.join(' ')}`.toLowerCase();
				return haystack.includes(search);
			}
			return true;
		});
	});

	readonly filteredCount = computed(() => this.filteredItems().length);
	readonly totalCount = computed(() => this.items().length);
	// #endregion

	// #region Handlers
	onVisibleChange(value: boolean): void {
		if (!value) {
			this.searchTerm.set('');
			this.filterError.set(null);
			this.visibleChange.emit(false);
		}
	}
	// #endregion
}
