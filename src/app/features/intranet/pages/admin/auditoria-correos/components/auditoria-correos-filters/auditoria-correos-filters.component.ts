import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { TipoOrigenAuditoria } from '../../models';

interface TipoOption {
	label: string;
	value: TipoOrigenAuditoria | null;
}

@Component({
	selector: 'app-auditoria-correos-filters',
	standalone: true,
	imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, TooltipModule],
	templateUrl: './auditoria-correos-filters.component.html',
	styleUrl: './auditoria-correos-filters.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditoriaCorreosFiltersComponent {
	readonly searchTerm = input<string>('');
	readonly filterTipo = input<TipoOrigenAuditoria | null>(null);
	readonly hasActiveFilters = input<boolean>(false);

	readonly searchChange = output<string>();
	readonly filterTipoChange = output<TipoOrigenAuditoria | null>();
	readonly clearFilters = output<void>();

	readonly tipoOptions: TipoOption[] = [
		{ label: 'Todos los tipos', value: null },
		{ label: 'Estudiante', value: 'Estudiante' },
		{ label: 'Apoderado', value: 'Apoderado' },
		{ label: 'Profesor', value: 'Profesor' },
	];

	onSearchChange(value: string): void {
		this.searchChange.emit(value);
	}

	onTipoChange(value: TipoOrigenAuditoria | null): void {
		this.filterTipoChange.emit(value);
	}

	onClear(): void {
		this.clearFilters.emit();
	}
}
