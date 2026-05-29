import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	model,
	output,
	signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { AttendancesAdminStore, PersonaParaSeleccion } from '../../services';

const MAX_RANGE_DAYS = 366;

export interface SyncRangePayload {
	fechaInicio: string;
	fechaFin: string;
	dnis: string[] | undefined;
}

@Component({
	selector: 'app-sync-range-dialog',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ButtonModule,
		DatePickerModule,
		DialogModule,
		MultiSelectModule,
		ToggleSwitchModule,
	],
	templateUrl: './sync-range-dialog.component.html',
	styleUrl: './sync-range-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncRangeDialogComponent {
	private store = inject(AttendancesAdminStore);

	readonly visible = model<boolean>(false);
	readonly confirm = output<SyncRangePayload>();

	readonly fechaInicio = signal<Date | null>(null);
	readonly fechaFin = signal<Date | null>(null);
	readonly todosUsuarios = signal<boolean>(true);
	readonly selectedPersonIds = signal<number[]>([]);

	readonly personas = this.store.personas;

	readonly rangeDays = computed(() => {
		const start = this.fechaInicio();
		const end = this.fechaFin();
		if (!start || !end) return 0;
		const diff = end.getTime() - start.getTime();
		return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
	});

	readonly rangeError = computed(() => {
		const days = this.rangeDays();
		if (days < 0) return 'La fecha de fin debe ser posterior a la de inicio.';
		if (days > MAX_RANGE_DAYS) return `El rango no puede superar ${MAX_RANGE_DAYS} días.`;
		return '';
	});

	readonly isValid = computed(() => {
		const start = this.fechaInicio();
		const end = this.fechaFin();
		if (!start || !end) return false;
		if (this.rangeError()) return false;
		if (!this.todosUsuarios() && this.selectedPersonIds().length === 0) return false;
		return true;
	});

	onConfirm(): void {
		const start = this.fechaInicio();
		const end = this.fechaFin();
		if (!start || !end) return;

		const dnis = this.todosUsuarios()
			? undefined
			: this.selectedPersonIds()
					.map((id) => this.personas().find((p) => p.estudianteId === id)?.dni)
					.filter((d): d is string => !!d);

		this.confirm.emit({
			fechaInicio: toIso(start),
			fechaFin: toIso(end),
			dnis: dnis?.length ? dnis : undefined,
		});
		this.visible.set(false);
	}

	onHide(): void {
		this.visible.set(false);
	}

	personaLabel(persona: PersonaParaSeleccion): string {
		return `${persona.nombreCompleto} — ${persona.dni}`;
	}
}

function toIso(date: Date): string {
	return date.toISOString().split('T')[0];
}
