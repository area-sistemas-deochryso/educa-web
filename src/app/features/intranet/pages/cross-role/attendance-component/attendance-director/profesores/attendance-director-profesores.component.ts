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
import { Observable, finalize } from 'rxjs';

import { AttendanceLegendComponent } from '@features/intranet/components/attendance/attendance-legend/attendance-legend.component';
import {
	AttendancePersonaDayListComponent,
	PersonaAsistenciaDia,
} from '@features/intranet/components/attendance/attendance-persona-day-list/attendance-persona-day-list.component';
import { AttendanceTableComponent } from '@features/intranet/components/attendance/attendance-table/attendance-table.component';
import { AttendanceTableSkeletonComponent } from '@features/intranet/components/attendance/attendance-table-skeleton/attendance-table-skeleton.component';
import { EmptyStateComponent } from '@features/intranet/components/attendance/empty-state/empty-state.component';
import {
	VIEW_MODE,
	ViewMode,
} from '@features/intranet/components/attendance/attendance-header/attendance-header.component';
import { AttendanceDataService } from '@features/intranet/services/attendance/attendance-data.service';
import { AttendanceTable } from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';

import {
	AsistenciaProfesorDto,
	EstadisticasAsistenciaDia,
	HijoApoderado,
	PersonaAsistencia,
	profesorToPersonaAsistencia,
} from '@data/models/attendance.models';
import { APP_USER_ROLES } from '@shared/constants';
import { AsistenciaProfesorApiService } from '@shared/services/attendance';
import { downloadBlob, formatDateLocalIso, viewBlobInNewTab } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';

import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Vista "Profesores" del panel admin de asistencia (Plan 21 Chat 7 — rediseño).
 *
 * Armonizada con "Estudiantes": leyenda + day-list con stat-cards (modo día)
 * + calendario mensual con ingresos/salidas (modo mes). Responde al pill
 * día/mes del header cross-role vía `setViewMode` llamado por el shell.
 *
 * Diferencias vs "Estudiantes":
 * - Sin grado/sección — todos los profesores activos de la sede en una sola lista.
 * - Día consume `GET /director/profesores-asistencia-dia` (Chat 7.A).
 * - Mes selecciona un profesor del listado y muestra sus tablas ingresos/salidas.
 * - Justificación deshabilitada por UI (INV-AD06 queda para chat posterior).
 */
@Component({
	selector: 'app-attendance-director-profesores',
	standalone: true,
	imports: [
		AttendanceLegendComponent,
		AttendancePersonaDayListComponent,
		AttendanceTableComponent,
		AttendanceTableSkeletonComponent,
		EmptyStateComponent,
		ButtonModule,
		MenuModule,
		TooltipModule,
	],
	templateUrl: './attendance-director-profesores.component.html',
	styleUrl: './attendance-director-profesores.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceDirectorProfesoresComponent implements OnInit {
	private api = inject(AsistenciaProfesorApiService);
	private dataService = inject(AttendanceDataService);
	private errorHandler = inject(ErrorHandlerService);
	private router = inject(Router);
	private destroyRef = inject(DestroyRef);

	// #region Estado general
	readonly loading = signal(false);
	readonly tableReady = signal(false);
	readonly downloadingPdf = signal(false);
	// #endregion

	// #region Modo día/mes + fecha
	readonly viewMode = signal<ViewMode>(VIEW_MODE.Dia);
	readonly fechaDia = signal<Date>(new Date());
	// #endregion

	// #region Modo día
	readonly profesoresDia = signal<AsistenciaProfesorDto[]>([]);
	readonly estadisticasDia = signal<EstadisticasAsistenciaDia>({
		total: 0,
		asistio: 0,
		tardanza: 0,
		falta: 0,
		justificado: 0,
		pendiente: 0,
	});
	readonly personasDia = computed<PersonaAsistencia[]>(() =>
		this.profesoresDia().map(profesorToPersonaAsistencia),
	);
	// #endregion

	// #region Modo mes
	readonly profesoresMes = signal<AsistenciaProfesorDto[]>([]);
	readonly selectedProfesorId = signal<number | null>(null);
	readonly selectedProfesor = computed(() => {
		const id = this.selectedProfesorId();
		return this.profesoresMes().find((p) => p.profesorId === id) ?? null;
	});
	readonly profesoresAsHijos = computed<HijoApoderado[]>(() =>
		this.profesoresMes().map((p) => ({
			estudianteId: p.profesorId,
			dni: p.dni,
			nombreCompleto: p.nombreCompleto,
			grado: '',
			seccion: '',
			relacion: APP_USER_ROLES.Profesor,
		})),
	);
	readonly ingresos = signal<AttendanceTable>(
		this.dataService.createEmptyTable('Ingresos'),
	);
	readonly salidas = signal<AttendanceTable>(
		this.dataService.createEmptyTable('Salidas'),
	);
	// #endregion

	// #region PDF
	readonly pdfMenuItems = computed<MenuItem[]>(() => {
		if (this.viewMode() === VIEW_MODE.Mes) {
			const profesor = this.selectedProfesor();
			if (!profesor) return [];
			const { selectedMonth, selectedYear } = this.ingresos();
			return [
				{
					label: 'Ver PDF (mes)',
					icon: 'pi pi-eye',
					command: () => this.verPdfProfesorMes(profesor.dni, selectedMonth, selectedYear),
				},
				{
					label: 'Descargar PDF (mes)',
					icon: 'pi pi-download',
					command: () =>
						this.descargarPdfProfesorMes(profesor.dni, selectedMonth, selectedYear),
				},
			];
		}

		return [
			{
				label: 'Ver reporte del día',
				icon: 'pi pi-eye',
				command: () => this.verPdfReporteDia(),
			},
			{
				label: 'Descargar reporte del día',
				icon: 'pi pi-download',
				command: () => this.descargarPdfReporteDia(),
			},
		];
	});
	// #endregion

	ngOnInit(): void {
		if (this.viewMode() === VIEW_MODE.Dia) {
			this.loadDia();
		} else {
			this.loadMes();
		}
	}

	// #region Delegados llamados por el shell vía @ViewChild
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
	// #endregion

	// #region Handlers
	onFechaDiaChange(fecha: Date): void {
		this.fechaDia.set(fecha);
		this.loadDia();
	}

	selectProfesor(profesorId: number): void {
		if (this.selectedProfesorId() === profesorId) return;
		this.selectedProfesorId.set(profesorId);
		this.updateTablasMes();
	}

	onIngresosMonthChange(month: number): void {
		this.ingresos.update((t) => ({ ...t, selectedMonth: month }));
		this.loadMes();
	}

	onSalidasMonthChange(month: number): void {
		this.salidas.update((t) => ({ ...t, selectedMonth: month }));
		// Se regenera a partir del mismo mes en ingresos (ambas tablas comparten mes).
		this.updateTablasMes();
	}

	/**
	 * Cross-link desde el día: navega a `/intranet/admin/asistencias` con pre-filtros
	 * (tipoPersona=P, dni del profesor, fecha del día activo) para que el Director
	 * edite la asistencia formal sin perder contexto (Plan 23 Chat 5).
	 */
	onEditarEnAdminDia(persona: PersonaAsistenciaDia): void {
		this.router.navigate(['/intranet/admin/asistencias'], {
			queryParams: {
				tab: 'gestion',
				tipoPersona: 'P',
				dni: persona.dni,
				fecha: formatDateLocalIso(this.fechaDia()),
			},
		});
	}

	/**
	 * Cross-link desde el mes: navega a admin con DNI del profesor pre-filtrado.
	 * Sin fecha — el admin default es hoy y el usuario ajusta al día que quiere editar.
	 */
	onEditarEnAdminMes(): void {
		const profesor = this.selectedProfesor();
		if (!profesor) return;
		this.router.navigate(['/intranet/admin/asistencias'], {
			queryParams: {
				tab: 'gestion',
				tipoPersona: 'P',
				dni: profesor.dni,
			},
		});
	}
	// #endregion

	// #region Carga — modo día
	private loadDia(): void {
		this.loading.set(true);
		this.api
			.obtenerAsistenciaDiaProfesoresDirector(this.fechaDia())
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (resp) => {
					this.profesoresDia.set(resp.profesores);
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
			.listarProfesores(fechaInicio, fechaFin, null, 1, 500)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.loading.set(false)),
			)
			.subscribe({
				next: (resp) => {
					const profesores = resp.data ?? [];
					this.profesoresMes.set(profesores);
					if (profesores.length > 0) {
						this.restoreSelectedProfesor();
						this.updateTablasMes();
					} else {
						this.selectedProfesorId.set(null);
						this.tableReady.set(true);
					}
				},
				error: (err) => {
					this.errorHandler.handleHttpError(err);
					this.tableReady.set(true);
				},
			});
	}

	private restoreSelectedProfesor(): void {
		const id = this.selectedProfesorId();
		if (id !== null && this.profesoresMes().some((p) => p.profesorId === id)) return;
		const first = this.profesoresMes()[0];
		if (first) this.selectedProfesorId.set(first.profesorId);
	}

	private updateTablasMes(): void {
		const profesor = this.selectedProfesor();
		if (!profesor) {
			this.tableReady.set(true);
			return;
		}
		const { selectedMonth, selectedYear } = this.ingresos();
		const tables = this.dataService.processAsistencias(
			profesor.asistencias,
			selectedMonth,
			selectedYear,
			profesor.nombreCompleto,
		);
		this.ingresos.set(tables.ingresos);
		this.salidas.set(tables.salidas);
		this.tableReady.set(true);
	}
	// #endregion

	// #region PDFs
	private verPdfReporteDia(): void {
		this.runPdfDia((blob) => viewBlobInNewTab(blob));
	}

	private descargarPdfReporteDia(): void {
		this.runPdfDia((blob) =>
			downloadBlob(blob, `Reporte_Profesores_${formatDateLocalIso(this.fechaDia())}.pdf`),
		);
	}

	private verPdfProfesorMes(dni: string, mes: number, anio: number): void {
		this.runPdfMes(dni, mes, anio, (blob) => viewBlobInNewTab(blob));
	}

	private descargarPdfProfesorMes(dni: string, mes: number, anio: number): void {
		const mesPad = mes.toString().padStart(2, '0');
		this.runPdfMes(dni, mes, anio, (blob) =>
			downloadBlob(blob, `Asistencia_Profesor_${dni}_${anio}-${mesPad}.pdf`),
		);
	}

	private runPdfDia(handle: (blob: Blob) => void): void {
		const fecha = this.fechaDia();
		this.runPdf$(this.api.descargarPdfReporteFiltradoProfesores(fecha, fecha, null), handle);
	}

	private runPdfMes(dni: string, mes: number, anio: number, handle: (blob: Blob) => void): void {
		this.runPdf$(this.api.descargarPdfProfesorMes(dni, mes, anio), handle);
	}

	private runPdf$(req$: Observable<Blob>, handle: (blob: Blob) => void): void {
		this.downloadingPdf.set(true);
		req$
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({ next: handle, error: (err) => this.errorHandler.handleHttpError(err) });
	}
	// #endregion
}
