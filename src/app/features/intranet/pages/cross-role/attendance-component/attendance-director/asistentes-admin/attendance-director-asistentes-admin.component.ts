import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	OnInit,
	computed,
	inject,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AttendanceLegendComponent } from '@features/intranet/components/attendance/attendance-legend/attendance-legend.component';
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
	EstadisticasAsistenciaDia,
	PersonaAsistencia,
	asistenteAdminToPersonaAsistencia,
} from '@data/models/attendance.models';
import { AsistenciaAsistenteAdminApiService } from '@shared/services/attendance';
import { formatDateLocalIso } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';

/**
 * Vista "Asistentes Administrativos" del panel admin (Plan 28 Chat 4b-tab).
 *
 * Mirror reducido de `AttendanceDirectorProfesoresComponent` — sin grado/sección,
 * sin PDF/Excel client-side y solo modo día. El endpoint paginado mensual de AAs
 * aún no existe en BE; al cambiar a modo "Mes" el componente delega visualmente
 * en el día (no se rompe pero queda como deuda lateral).
 *
 * Cross-link a admin con `tipoPersona='A'` para edición formal (INV-AD08 cubre
 * la jurisdicción: solo Director, Promotor y Coordinador Académico).
 */
@Component({
	selector: 'app-attendance-director-asistentes-admin',
	standalone: true,
	imports: [AttendanceLegendComponent, AttendancePersonaDayListComponent],
	templateUrl: './attendance-director-asistentes-admin.component.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDirectorAsistentesAdminComponent implements OnInit {
	private api = inject(AsistenciaAsistenteAdminApiService);
	private errorHandler = inject(ErrorHandlerService);
	private router = inject(Router);
	private destroyRef = inject(DestroyRef);

	readonly loading = signal(false);
	readonly viewMode = signal<ViewMode>(VIEW_MODE.Dia);
	readonly fechaDia = signal<Date>(new Date());

	readonly asistentesDia = signal<AsistenciaAsistenteAdminDto[]>([]);
	readonly estadisticasDia = signal<EstadisticasAsistenciaDia>({
		total: 0,
		asistio: 0,
		tardanza: 0,
		falta: 0,
		justificado: 0,
		pendiente: 0,
	});
	readonly personasDia = computed<PersonaAsistencia[]>(() =>
		this.asistentesDia().map(asistenteAdminToPersonaAsistencia),
	);

	ngOnInit(): void {
		this.loadDia();
	}

	// #region Delegados llamados por el shell vía @ViewChild
	setViewMode(mode: ViewMode): void {
		// * Mes no soportado todavía — endpoint paginado de AAs pendiente en BE.
		//   Al recibir mes, mantener el día activo. El submenú de modo en el header
		//   sigue visible pero la vista se queda en día sin romper.
		if (mode === VIEW_MODE.Mes) return;
		if (this.viewMode() === mode) return;
		this.viewMode.set(mode);
		this.loadDia();
	}

	reload(): void {
		this.loadDia();
	}
	// #endregion

	onFechaDiaChange(fecha: Date): void {
		this.fechaDia.set(fecha);
		this.loadDia();
	}

	/**
	 * Cross-link a admin con DNI + fecha + tipoPersona='A' pre-filtrados.
	 * INV-AD08: solo Director / Promotor / Coordinador Académico mutan; el
	 * AsistenteAdministrativo viendo este componente NO debería ver el botón
	 * (showEditAdminAction se cablea desde el shell — mantiene la lógica fuera).
	 */
	onEditarEnAdminDia(persona: PersonaAsistenciaDia): void {
		this.router.navigate(['/intranet/admin/asistencias'], {
			queryParams: {
				tab: 'gestion',
				tipoPersona: 'A',
				dni: persona.dni,
				fecha: formatDateLocalIso(this.fechaDia()),
			},
		});
	}

	private loadDia(): void {
		this.loading.set(true);
		this.api
			.obtenerAsistenciaDiaAsistentesAdminDirector(this.fechaDia())
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (resp) => {
					this.asistentesDia.set(resp.asistentesAdmin);
					this.estadisticasDia.set(resp.estadisticas);
				},
				error: (err) => this.errorHandler.handleHttpError(err),
			});
	}
}
