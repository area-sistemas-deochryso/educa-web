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

import {
	CrearEmailQuarantineDto,
	EmailQuarantineFormData,
	QUARANTINE_DURATION_HOURS_OPTIONS,
	QuarantineDurationHours,
} from '@data/models';
import { EduDialog, EduInputText, EduSelect, EduTextarea } from '@edu-ui';

interface DurationOption {
	label: string;
	value: QuarantineDurationHours;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Plan 37 Chat 3 — dialog "Agregar cuarentena manual".
 * Solo motivo `MANUAL` (los otros los setea el handler async).
 * Observación es OBLIGATORIA — auditoría del por qué.
 */
@Component({
	selector: 'app-quarantine-add-dialog',
	standalone: true,
	imports: [FormsModule, EduDialog, ButtonModule, EduInputText, EduSelect, EduTextarea],
	templateUrl: './quarantine-add-dialog.component.html',
	styleUrl: './quarantine-add-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuarantineAddDialogComponent {
	readonly visible = input<boolean>(false);
	readonly formData = input.required<EmailQuarantineFormData>();
	readonly submitting = input<boolean>(false);

	readonly visibleChange = output<boolean>();
	readonly destinatarioChange = output<string>();
	readonly durationChange = output<QuarantineDurationHours>();
	readonly observacionChange = output<string>();
	readonly confirmAdd = output<CrearEmailQuarantineDto>();
	readonly cancelAdd = output<void>();

	readonly durationOptions: DurationOption[] = QUARANTINE_DURATION_HOURS_OPTIONS.map((h) => ({
		label: `${h} horas`,
		value: h,
	}));

	private readonly _touched = signal(false);
	readonly touched = this._touched.asReadonly();

	readonly destinatarioError = computed(() => {
		const value = this.formData().destinatario.trim();
		if (!value) return 'El destinatario es obligatorio';
		if (!EMAIL_REGEX.test(value)) return 'Formato de correo inválido';
		return null;
	});

	readonly observacionError = computed(() => {
		const value = this.formData().observacion.trim();
		if (!value) return 'La observación es obligatoria';
		if (value.length < 5) return 'Mínimo 5 caracteres';
		return null;
	});

	readonly canSubmit = computed(
		() =>
			!this.destinatarioError() && !this.observacionError() && !this.submitting(),
	);

	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onDestinatarioChange(value: string): void {
		this.destinatarioChange.emit(value);
	}

	onDurationChange(value: QuarantineDurationHours): void {
		this.durationChange.emit(value);
	}

	onObservacionChange(value: string): void {
		this.observacionChange.emit(value);
	}

	onConfirm(): void {
		this._touched.set(true);
		if (!this.canSubmit()) return;
		const data = this.formData();
		this.confirmAdd.emit({
			destinatario: data.destinatario.trim().toLowerCase(),
			motivo: 'MANUAL',
			durationHours: data.durationHours,
			observacion: data.observacion.trim(),
		});
	}

	onCancel(): void {
		this.cancelAdd.emit();
	}
}
