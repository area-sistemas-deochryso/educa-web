import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import {
	EMAIL_OUTBOX_ESTADOS,
	EMAIL_OUTBOX_TIPOS,
	EmailOutboxEstado,
	EmailOutboxTipo,
} from '@data/models/email-outbox.models';

interface SelectOption {
	label: string;
	value: string | null;
}

@Component({
	selector: 'app-email-outbox-filters',
	standalone: true,
	imports: [
		FormsModule,
		InputTextModule,
		Select,
		DatePicker,
		IconFieldModule,
		InputIconModule,
	],
	templateUrl: './email-outbox-filters.component.html',
	styleUrl: './email-outbox-filters.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxFiltersComponent {
	// #region Inputs
	readonly filterTipo = input<EmailOutboxTipo | null>(null);
	readonly filterEstado = input<EmailOutboxEstado | null>(null);
	// #endregion

	// #region Outputs
	readonly searchChange = output<string>();
	readonly filterTipoChange = output<string | null>();
	readonly filterEstadoChange = output<string | null>();
	readonly filterDesdeChange = output<string | null>();
	readonly filterHastaChange = output<string | null>();
	// #endregion

	// #region Opciones
	readonly tipoOptions: SelectOption[] = [
		{ label: 'Todos', value: null },
		...EMAIL_OUTBOX_TIPOS.map((t) => ({ label: t, value: t })),
	];

	readonly estadoOptions: SelectOption[] = [
		{ label: 'Todos', value: null },
		...EMAIL_OUTBOX_ESTADOS.map((e) => ({ label: e, value: e })),
	];
	// #endregion

	// #region Handlers
	onDesdeChange(date: Date | null): void {
		this.filterDesdeChange.emit(date ? date.toISOString().split('T')[0] : null);
	}

	onHastaChange(date: Date | null): void {
		this.filterHastaChange.emit(date ? date.toISOString().split('T')[0] : null);
	}
	// #endregion
}
