// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import type { DiaSemana } from '../../models/horario.interface';
import type { SalonOption } from '../../models/salon.interface';

// #endregion
// #region Implementation
@Component({
	selector: 'app-schedules-filters',
	standalone: true,
	imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, SelectModule, TooltipModule],
	templateUrl: './horarios-filters.component.html',
	styleUrl: './horarios-filters.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesFiltersComponent {
	// * Inputs reflect current filter state.
	readonly salonesOptions = input.required<SalonOption[]>();
	readonly filtroSalonId = input<number | null>(null);
	readonly filtroDiaSemana = input<number | null>(null);
	readonly filtroEstadoActivo = input<boolean | null>(null);
	readonly filtroDiaSemanaHabilitado = input<boolean>(true);
	readonly hasFilters = input<boolean>(false);

	// * Conteos de horarios activos por opción (provistos por el consumer vía facade/store —
	// * este componente es presentacional puro y no accede a stores directamente).
	// * Mismos datos que alimentan las tarjetas de métricas de arriba (Total/Activos/...).
	readonly salonActiveCounts = input<ReadonlyMap<number, number>>(new Map());
	readonly diaActiveCounts = input<ReadonlyMap<number, number>>(new Map());
	readonly estadoCounts = input<{ activos: number; inactivos: number }>({
		activos: 0,
		inactivos: 0,
	});

	// * Outputs bubble filter changes.
	readonly filtroSalonChange = output<number | null>();
	readonly filtroDiaSemanaChange = output<DiaSemana | null>();
	readonly filtroEstadoChange = output<boolean | null>();
	readonly clearFiltros = output<void>();

	// * Static base options for selects (labels sin conteo).
	readonly diasOptions = [
		{ label: 'Lunes', value: 1 },
		{ label: 'Martes', value: 2 },
		{ label: 'Miércoles', value: 3 },
		{ label: 'Jueves', value: 4 },
		{ label: 'Viernes', value: 5 },
	];

	readonly estadoOptions = [
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false },
	];

	// * Options con conteo de horarios activos interpolado en el label.
	readonly salonesOptionsConCount = computed<SalonOption[]>(() => {
		const counts = this.salonActiveCounts();
		return this.salonesOptions().map((opt) => ({
			...opt,
			label: `${opt.label} (${counts.get(opt.value) ?? 0})`,
		}));
	});

	readonly diasOptionsConCount = computed(() => {
		const counts = this.diaActiveCounts();
		return this.diasOptions.map((opt) => ({
			...opt,
			label: `${opt.label} (${counts.get(opt.value) ?? 0})`,
		}));
	});

	readonly estadoOptionsConCount = computed(() => {
		const { activos, inactivos } = this.estadoCounts();
		return [
			{ label: `Activos (${activos})`, value: true },
			{ label: `Inactivos (${inactivos})`, value: false },
		];
	});

	// * Event handlers
	onSalonChange(salonId: number | null): void {
		this.filtroSalonChange.emit(salonId);
	}

	onDiaChange(diaSemana: DiaSemana | null): void {
		this.filtroDiaSemanaChange.emit(diaSemana);
	}

	onEstadoChange(estadoActivo: boolean | null): void {
		this.filtroEstadoChange.emit(estadoActivo);
	}

	onClearFilters(): void {
		this.clearFiltros.emit();
	}
}
// #endregion
