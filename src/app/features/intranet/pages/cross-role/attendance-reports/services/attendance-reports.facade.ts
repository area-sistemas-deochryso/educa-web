import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserProfileService } from '@core/services';
import { downloadBlob, logger } from '@core/helpers';
import {
	DirectorAttendanceApiService,
	TeacherAttendanceApiService,
} from '@shared/services/attendance';
import { isAdminRole } from '@shared/utils/role-policies.utils';
import { forkJoin } from 'rxjs';
import { AttendanceReportsApiService } from './attendance-reports-api.service';
import { AttendanceReportsStore } from './attendance-reports.store';
import type { ReporteFilters } from '../models';

@Injectable({ providedIn: 'root' })
export class AttendanceReportsFacade {
	// #region Dependencias
	private readonly store = inject(AttendanceReportsStore);
	private readonly api = inject(AttendanceReportsApiService);
	private readonly directorApi = inject(DirectorAttendanceApiService);
	private readonly profesorApi = inject(TeacherAttendanceApiService);
	private readonly userProfile = inject(UserProfileService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Carga de salones
	loadSalones(): void {
		if (this.store.loadingSalones()) return;
		this.store.setLoadingSalones(true);

		const rol = this.userProfile.userRole();

		if (isAdminRole(rol)) {
			this.directorApi
				.getSalonesDirector()
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe({
					next: (salones) => {
						this.store.setSalonesDisponibles(salones);
						this.store.setLoadingSalones(false);
					},
					error: () => this.store.setLoadingSalones(false),
				});
		} else {
			forkJoin([
				this.profesorApi.getSalonesProfesor(),
				this.profesorApi.getSalonesProfesorPorHorario(),
			])
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe({
					next: ([tutoria, horario]) => {
						const unique = new Map<string, (typeof tutoria)[0]>();
						[...tutoria, ...horario].forEach((s) => {
							unique.set(`${s.grado}-${s.seccion}`, s);
						});
						this.store.setSalonesDisponibles([...unique.values()]);
						this.store.setLoadingSalones(false);
					},
					error: () => this.store.setLoadingSalones(false),
				});
		}
	}
	// #endregion

	// #region Generar reporte
	generarReporte(): void {
		const filters = this.store.filters();

		// Profesores no tienen salón asociado — BE ignora el selector
		if (filters.tipoPersona !== 'P' && filters.salonesSeleccionados.length === 0) {
			this.store.setError('Debe seleccionar al menos un salón.');
			return;
		}

		this.store.setLoading(true);
		this.store.setError(null);

		this.api
			.getReporte(filters)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (resultado) => {
					this.store.setResultado(resultado);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('[AttendanceReports] Error al generar reporte', err);
					this.store.setError('Error al generar el reporte.');
					this.store.setLoading(false);
				},
			});
	}
	// #endregion

	// #region Exportar PDF
	exportarPdf(): void {
		const filters = this.store.filters();
		this.store.setExporting(true);

		this.api
			.descargarPdf(filters)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blob) => {
					const url = URL.createObjectURL(blob);
					window.open(url, '_blank');
					this.store.setExporting(false);
				},
				error: (err) => {
					logger.error('[AttendanceReports] Error al exportar PDF', err);
					this.store.setExporting(false);
				},
			});
	}
	// #endregion

	// #region Exportar Excel
	exportarExcel(): void {
		const filters = this.store.filters();
		const resultado = this.store.resultado();
		if (!resultado) return;

		this.store.setExporting(true);

		this.api
			.descargarExcel(filters)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blob) => {
					const fechaStr = filters.fecha.toISOString().split('T')[0];
					downloadBlob(blob, `Reporte_${resultado.filtroEstado}_${fechaStr}.xlsx`);
					this.store.setExporting(false);
				},
				error: (err) => {
					logger.error('[AttendanceReports] Error al exportar Excel', err);
					this.store.setExporting(false);
				},
			});
	}
	// #endregion

	// #region Filtros
	updateFilters(partial: Partial<ReporteFilters>): void {
		this.store.updateFilters(partial);
	}
	// #endregion
}
