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

import { TIPOS_FALLO } from '../../models/tipo-fallo.models';
import { TipoFalloLabelPipe } from '../../pipes/tipo-fallo-label.pipe';

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
	readonly filterTipoFallo = input<string | null>(null);
	// #endregion

	// #region Outputs
	readonly searchChange = output<string>();
	readonly filterTipoChange = output<string | null>();
	readonly filterEstadoChange = output<string | null>();
	readonly filterTipoFalloChange = output<string | null>();
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

	readonly tipoFalloOptions: SelectOption[] = (() => {
		const labelPipe = new TipoFalloLabelPipe();
		return [
			{ label: 'Todos', value: null },
			...TIPOS_FALLO.map((t) => ({ label: labelPipe.transform(t), value: t })),
		];
	})();
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
