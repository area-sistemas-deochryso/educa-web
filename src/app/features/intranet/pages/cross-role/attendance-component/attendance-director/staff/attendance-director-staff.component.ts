import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	Input,
	OnInit,
	computed,
	effect,
	inject,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AttendanceLegendStatsComponent } from '@features/intranet/components/attendance/attendance-legend-stats/attendance-legend-stats.component';
import {
	AttendancePersonaDayListComponent,
	PersonaAsistenciaDia,
} from '@features/intranet/components/attendance/attendance-persona-day-list/attendance-persona-day-list.component';
import { AttendanceHeatmapComponent } from '@features/intranet/components/attendance/attendance-heatmap/attendance-heatmap.component';
import { AttendanceTemporalNavComponent } from '@features/intranet/components/attendance/attendance-temporal-nav/attendance-temporal-nav.component';
import { AttendanceTableSkeletonComponent } from '@features/intranet/components/attendance/attendance-table-skeleton/attendance-table-skeleton.component';
import { EmptyStateComponent } from '@features/intranet/components/attendance/empty-state/empty-state.component';
import {
	VIEW_MODE,
	ViewMode,
} from '@features/intranet/components/attendance/attendance-header/attendance-header.component';
import { AttendanceTable } from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';
import { AttendanceDataService } from '@features/intranet/services/attendance/attendance-data.service';

import {
	AsistenciaAsistenteAdminDto,
	AttendanceStatus as ModelAttendanceStatus,
	EstadisticasAsistenciaDia,
	HijoApoderado,
	PersonaAsistencia,
	asistenteAdminToPersonaAsistencia,
	computeStatsFromAsistencias,
} from '@data/models';
import { AsistenciaStaffApiService } from '@intranet-shared/services';
import { formatDateLocalIso } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

const TIPO_LABELS: Record<string, string> = {
	C: 'Coordinador',
	M: 'Promotor',
	D: 'Director',
	A: 'Asist. Admin',
};

@Component({
	selector: 'app-attendance-director-staff',
	standalone: true,
	imports: [
		AttendanceLegendStatsComponent,
		AttendancePersonaDayListComponent,
		AttendanceHeatmapComponent,
		AttendanceTemporalNavComponent,
		AttendanceTableSkeletonComponent,
		EmptyStateComponent,
		ButtonModule,
		DatePipe,
		FormsModule,
		InputTextModule,
		TooltipModule,
	],
	templateUrl: './attendance-director-staff.component.html',
	styleUrl: './attendance-director-staff.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDirectorStaffComponent implements OnInit {
	@Input({ required: true }) tipoPersona!: string;

	private api = inject(AsistenciaStaffApiService);
	private dataService = inject(AttendanceDataService);
	private errorHandler = inject(ErrorHandlerService);
	private router = inject(Router);
	private destroyRef = inject(DestroyRef);

	readonly loading = signal(false);
	readonly activeStatus = signal<ModelAttendanceStatus | null>(null);
	readonly viewMode = signal<ViewMode>(VIEW_MODE.Dia);
	readonly fechaDia = signal<Date>(new Date());

	// #region Modo día
	readonly staffDia = signal<AsistenciaAsistenteAdminDto[]>([]);
	readonly estadisticasDia = signal<EstadisticasAsistenciaDia>({
		total: 0,
		asistio: 0,
		tardanza: 0,
		falta: 0,
		justificado: 0,
		pendiente: 0,
	});
	readonly personasDia = computed<PersonaAsistencia[]>(() =>
		this.staffDia().map(asistenteAdminToPersonaAsistencia),
	);
	readonly legendStats = computed(() => {
		if (this.viewMode() !== VIEW_MODE.Mes) return this.estadisticasDia();
		const person = this.selectedPerson();
		return person ? computeStatsFromAsistencias(person.asistencias) : this.estadisticasDia();
	});
	// #endregion

	// #region Modo mes
	readonly staffMes = signal<AsistenciaAsistenteAdminDto[]>([]);
	readonly selectedPersonId = signal<number | null>(null);
	readonly selectedPerson = computed(() => {
		const id = this.selectedPersonId();
		return this.staffMes().find((p) => p.asistenteAdminId === id) ?? null;
	});
	readonly peopleAsHijos = computed<HijoApoderado[]>(() =>
		this.staffMes().map((p) => ({
			estudianteId: p.asistenteAdminId,
			dni: p.dni,
			nombreCompleto: p.nombreCompleto,
			grado: '',
			seccion: '',
			relacion: TIPO_LABELS[this.tipoPersona] ?? '',
		})),
	);
	readonly ingresos = signal<AttendanceTable>(
		this.dataService.createEmptyTable('Ingresos'),
	);
	readonly salidas = signal<AttendanceTable>(
		this.dataService.createEmptyTable('Salidas'),
	);
	readonly tableReady = signal(false);
	readonly hasMonthData = computed(() => {
		const ing = this.ingresos().counts;
		const sal = this.salidas().counts;
		return (ing.A + ing.T + ing.F + ing.J) > 0 || (sal.A + sal.T + sal.F + sal.J) > 0;
	});
	readonly monthDate = computed(() =>
		new Date(this.ingresos().selectedYear, this.ingresos().selectedMonth - 1, 1),
	);
	// #endregion

	// #region Month search (unified filter bar)
	readonly monthSearchTerm = signal('');
	readonly monthShowSuggestions = signal(false);

	readonly monthFilteredPeople = computed(() => {
		const term = this.monthSearchTerm().toLowerCase().trim();
		const hijos = this.peopleAsHijos();
		if (!term) return hijos;
		return hijos.filter(h =>
			h.nombreCompleto.toLowerCase().includes(term) ||
			(h.dni && h.dni.toLowerCase().includes(term)),
		);
	});

	private readonly syncSearchWithSelection = effect(() => {
		const person = this.selectedPerson();
		if (person && !this.monthShowSuggestions()) {
			this.monthSearchTerm.set(person.nombreCompleto);
		}
	});

	onMonthSearchFocus(): void {
		this.monthSearchTerm.set('');
		this.monthShowSuggestions.set(true);
	}

	onMonthSearchBlur(): void {
		setTimeout(() => {
			this.monthShowSuggestions.set(false);
			const person = this.selectedPerson();
			if (person) this.monthSearchTerm.set(person.nombreCompleto);
		}, 200);
	}

	selectPersonFromSearch(personId: number): void {
		this.selectPerson(personId);
		this.monthShowSuggestions.set(false);
	}
	// #endregion

	ngOnInit(): void {
		this.loadDia();
	}

	setViewMode(mode: ViewMode): void {
		if (this.viewMode() === mode) return;
		this.viewMode.set(mode);
		this.tableReady.set(false);
		if (mode === VIEW_MODE.Dia) {
			this.loadDia();
		} else {
			this.loadMes();
		}
	}

	reload(): void {
		if (this.viewMode() === VIEW_MODE.Dia) {
			this.loadDia();
		} else {
			this.loadMes();
		}
	}

	onFechaDiaChange(fecha: Date): void {
		this.fechaDia.set(fecha);
		this.loadDia();
	}

	onEditarEnAdminDia(persona: PersonaAsistenciaDia): void {
		this.router.navigate(['/intranet/admin/asistencias'], {
			queryParams: {
				tab: 'gestion',
				tipoPersona: this.tipoPersona,
				dni: persona.dni,
				fecha: formatDateLocalIso(this.fechaDia()),
			},
		});
	}

	readonly today = new Date();

	onPreviousDayNav(): void {
		const prev = new Date(this.fechaDia());
		prev.setDate(prev.getDate() - 1);
		this.onFechaDiaChange(prev);
	}

	onNextDayNav(): void {
		const next = new Date(this.fechaDia());
		next.setDate(next.getDate() + 1);
		if (next <= this.today) this.onFechaDiaChange(next);
	}

	navigateToGestion(): void {
		this.router.navigate(['/intranet/admin/asistencias'], {
			queryParams: { tab: 'gestion' },
		});
	}

	navigateToReportes(): void {
		this.router.navigate(['/intranet/admin/asistencias'], {
			queryParams: { tab: 'reportes' },
		});
	}

	onEditarEnAdminMes(): void {
		const person = this.selectedPerson();
		if (!person) return;
		this.router.navigate(['/intranet/admin/asistencias'], {
			queryParams: {
				tab: 'gestion',
				tipoPersona: this.tipoPersona,
				dni: person.dni,
			},
		});
	}

	selectPerson(personId: number): void {
		if (this.selectedPersonId() === personId) return;
		this.selectedPersonId.set(personId);
		this.updateTablasMes();
	}

	onMonthChange(month: number): void {
		this.ingresos.update((t) => ({ ...t, selectedMonth: month }));
		this.salidas.update((t) => ({ ...t, selectedMonth: month }));
		this.loadMes();
	}

	onPreviousMonth(): void {
		const t = this.ingresos();
		this.onMonthChange(t.selectedMonth === 1 ? 12 : t.selectedMonth - 1);
	}

	onNextMonth(): void {
		const t = this.ingresos();
		this.onMonthChange(t.selectedMonth === 12 ? 1 : t.selectedMonth + 1);
	}

	onIngresosMonthChange(month: number): void {
		this.ingresos.update((t) => ({ ...t, selectedMonth: month }));
		this.loadMes();
	}

	onSalidasMonthChange(month: number): void {
		this.salidas.update((t) => ({ ...t, selectedMonth: month }));
		this.updateTablasMes();
	}

	// #region Carga — modo día
	private loadDia(): void {
		this.loading.set(true);
		this.api
			.obtenerAsistenciaDiaStaffDirector(this.tipoPersona, this.fechaDia())
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (resp) => {
					this.staffDia.set(resp.staff);
					this.estadisticasDia.set(resp.estadisticas);
				},
				error: (err) => this.errorHandler.handleHttpError(err),
			});
	}
	// #endregion

	// #region Carga — modo mes
	private loadMes(): void {
		const { selectedMonth, selectedYear } = this.ingresos();
		const fechaInicio = new Date(selectedYear, selectedMonth - 1, 1);
		const fechaFin = new Date(selectedYear, selectedMonth, 0);

		this.loading.set(true);
		this.api
			.listarStaff(this.tipoPersona, fechaInicio, fechaFin)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (staff) => {
					this.staffMes.set(staff);
					if (staff.length > 0) {
						this.restoreSelectedPerson();
						this.updateTablasMes();
					} else {
						this.selectedPersonId.set(null);
						this.tableReady.set(true);
					}
				},
				error: (err) => {
					this.errorHandler.handleHttpError(err);
					this.tableReady.set(true);
				},
			});
	}

	private restoreSelectedPerson(): void {
		const id = this.selectedPersonId();
		if (id !== null && this.staffMes().some((p) => p.asistenteAdminId === id)) return;
		const first = this.staffMes()[0];
		if (first) this.selectedPersonId.set(first.asistenteAdminId);
	}

	private updateTablasMes(): void {
		const person = this.selectedPerson();
		if (!person) {
			this.tableReady.set(true);
			return;
		}
		const { selectedMonth, selectedYear } = this.ingresos();
		const tables = this.dataService.processAsistencias(
			person.asistencias,
			selectedMonth,
			selectedYear,
			person.nombreCompleto,
		);
		this.ingresos.set(tables.ingresos);
		this.salidas.set(tables.salidas);
		this.tableReady.set(true);
	}
	// #endregion
}
