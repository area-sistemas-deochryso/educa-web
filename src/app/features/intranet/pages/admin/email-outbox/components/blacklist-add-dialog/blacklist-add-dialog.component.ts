import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
	signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import {
	BlacklistFormData,
	CrearBlacklistRequest,
	EMAIL_BLACKLIST_MOTIVOS_MANUALES,
	EmailBlacklistMotivo,
} from '@data/models/email-blacklist.models';

interface MotivoOption {
	label: string;
	value: EmailBlacklistMotivo;
}

const MOTIVO_LABELS: Record<EmailBlacklistMotivo, string> = {
	BOUNCE_5XX: 'Bounce permanente 5.x.x',
	BOUNCE_MAILBOX_FULL: 'Buzón lleno crónico (4.2.2)',
	MANUAL: 'Bloqueo manual',
	BULK_IMPORT: 'Carga masiva',
	FORMAT_INVALID: 'Formato inválido',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Plan 38 Chat 5 (D17.8) — dialog "Agregar a blacklist".
 * Solo expone `MANUAL` y `BULK_IMPORT` en el `<p-select>` — los demás motivos
 * los setea el worker automáticamente. Validación inline antes del submit.
 */
@Component({
	selector: 'app-blacklist-add-dialog',
	standalone: true,
	imports: [
		FormsModule,
		DialogModule,
		ButtonModule,
		InputTextModule,
		SelectModule,
		TextareaModule,
	],
	templateUrl: './blacklist-add-dialog.component.html',
	styleUrl: './blacklist-add-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlacklistAddDialogComponent {
	// #region Inputs
	readonly visible = input<boolean>(false);
	readonly formData = input.required<BlacklistFormData>();
	readonly submitting = input<boolean>(false);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly correoChange = output<string>();
	readonly motivoChange = output<EmailBlacklistMotivo | null>();
	readonly observacionChange = output<string>();
	readonly confirmAdd = output<CrearBlacklistRequest>();
	readonly cancelAdd = output<void>();
	// #endregion

	// #region Catálogo motivos manuales (D17.8)
	readonly motivoOptions: MotivoOption[] = EMAIL_BLACKLIST_MOTIVOS_MANUALES.map((motivo) => ({
		label: MOTIVO_LABELS[motivo],
		value: motivo,
	}));
	// #endregion

	// #region Validación
	private readonly _touched = signal(false);
	readonly touched = this._touched.asReadonly();

	readonly correoError = computed(() => {
		const value = this.formData().correo.trim();
		if (!value) return 'El correo es obligatorio';
		if (!EMAIL_REGEX.test(value)) return 'Formato de correo inválido';
		return null;
	});

	readonly motivoError = computed(() =>
		this.formData().motivo === null ? 'El motivo es obligatorio' : null,
	);

	readonly canSubmit = computed(() =>
		!this.correoError() && !this.motivoError() && !this.submitting(),
	);
	// #endregion

	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onCorreoChange(value: string): void {
		this.correoChange.emit(value);
	}

	onMotivoChange(value: EmailBlacklistMotivo | null): void {
		this.motivoChange.emit(value);
	}

	onObservacionChange(value: string): void {
		this.observacionChange.emit(value);
	}

	onConfirm(): void {
		this._touched.set(true);
		if (!this.canSubmit()) return;
		const data = this.formData();
		this.confirmAdd.emit({
			correo: data.correo.trim().toLowerCase(),
			motivo: data.motivo as EmailBlacklistMotivo,
			observacion: data.observacion.trim() || null,
		});
	}

	onCancel(): void {
		this.cancelAdd.emit();
	}
	// #endregion
}
