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
	CrearEmailDomainPauseDto,
	DOMAIN_PAUSE_DURATION_HOURS_OPTIONS,
	DomainPauseDurationHours,
	EmailDomainPauseFormData,
} from '@data/models/email-domain-pause.models';

interface DurationOption {
	label: string;
	value: DomainPauseDurationHours;
}

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

@Component({
	selector: 'app-domain-pauses-add-dialog',
	standalone: true,
	imports: [
		FormsModule,
		DialogModule,
		ButtonModule,
		InputTextModule,
		SelectModule,
		TextareaModule,
	],
	templateUrl: './domain-pauses-add-dialog.component.html',
	styleUrl: './domain-pauses-add-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainPausesAddDialogComponent {
	readonly visible = input<boolean>(false);
	readonly formData = input.required<EmailDomainPauseFormData>();
	readonly submitting = input<boolean>(false);

	readonly visibleChange = output<boolean>();
	readonly dominioChange = output<string>();
	readonly durationChange = output<DomainPauseDurationHours>();
	readonly observacionChange = output<string>();
	readonly confirmAdd = output<CrearEmailDomainPauseDto>();
	readonly cancelAdd = output<void>();

	readonly durationOptions: DurationOption[] = DOMAIN_PAUSE_DURATION_HOURS_OPTIONS.map(
		(h) => ({ label: `${h} hora${h > 1 ? 's' : ''}`, value: h }),
	);

	private readonly _touched = signal(false);
	readonly touched = this._touched.asReadonly();

	readonly dominioError = computed(() => {
		const value = this.formData().dominio.trim();
		if (!value) return 'El dominio es obligatorio';
		if (!DOMAIN_REGEX.test(value)) return 'Formato de dominio inválido';
		return null;
	});

	readonly observacionError = computed(() => {
		const value = this.formData().observacion.trim();
		if (!value) return 'La observación es obligatoria';
		if (value.length < 5) return 'Mínimo 5 caracteres';
		return null;
	});

	readonly canSubmit = computed(
		() => !this.dominioError() && !this.observacionError() && !this.submitting(),
	);

	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onDominioChange(value: string): void {
		this.dominioChange.emit(value);
	}

	onDurationChange(value: DomainPauseDurationHours): void {
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
			dominio: data.dominio.trim().toLowerCase(),
			motivo: 'MANUAL',
			durationHours: data.durationHours,
			observacion: data.observacion.trim(),
		});
	}

	onCancel(): void {
		this.cancelAdd.emit();
	}
}
