import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	Input,
	OnInit,
	computed,
	inject,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AttendanceLegendStatsComponent } from '@features/intranet/components/attendance/attendance-legend-stats/attendance-legend-stats.component';
import {
	AttendancePersonaDayListComponent,
	PersonaAsistenciaDia,
} from '@features/intranet/components/attendance/attendance-persona-day-list/attendance-persona-day-list.component';
import {
	VIEW_MODE,
	ViewMode,
} from '@features/intranet/components/attendance/attendance-header/attendance-header.component';

import {
	AsistenciaAsistenteAdminDto,
	AttendanceStatus,
	EstadisticasAsistenciaDia,
	PersonaAsistencia,
	asistenteAdminToPersonaAsistencia,
} from '@data/models';
import { AsistenciaStaffApiService } from '@intranet-shared/services';
import { formatDateLocalIso } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';

@Component({
	selector: 'app-attendance-director-staff',
	standalone: true,
	imports: [AttendanceLegendStatsComponent, AttendancePersonaDayListComponent],
	templateUrl: './attendance-director-staff.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDirectorStaffComponent implements OnInit {
	@Input({ required: true }) tipoPersona!: string;

	private api = inject(AsistenciaStaffApiService);
	private errorHandler = inject(ErrorHandlerService);
	private router = inject(Router);
	private destroyRef = inject(DestroyRef);

	readonly loading = signal(false);
	readonly activeStatus = signal<AttendanceStatus | null>(null);
	readonly viewMode = signal<ViewMode>(VIEW_MODE.Dia);
	readonly fechaDia = signal<Date>(new Date());

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

	ngOnInit(): void {
		this.loadDia();
	}

	setViewMode(mode: ViewMode): void {
		if (mode === VIEW_MODE.Mes) return;
		if (this.viewMode() === mode) return;
		this.viewMode.set(mode);
		this.loadDia();
	}

	reload(): void {
		this.loadDia();
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
}
