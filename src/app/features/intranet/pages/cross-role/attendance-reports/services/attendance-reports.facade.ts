import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserProfileService } from '@core/services';
import { downloadBlob, logger, sanitizeFileNameSegment } from '@core/helpers';
import {
	DirectorAttendanceApiService,
	TeacherAttendanceApiService,
} from '@intranet-shared/services';
import { isAdminRole } from '@shared/utils';
import { esGradoAsistenciaDiaria } from '@shared/constants';
import { forkJoin } from 'rxjs';
import { AttendanceReportsApiService } from './attendance-reports-api.service';
import { AttendanceReportsStore } from './attendance-reports.store';
import { ESTADO_OPTIONS, RANGO_OPTIONS, TIPO_PERSONA_OPTIONS } from '../config/attendance-reports.config';
import type { ReporteFilters, ReporteFiltrado } from '../models';

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
						this.store.setSalonesDisponibles(salones.filter((s) => esGradoAsistenciaDiaria(s.graOrden)));
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
						this.store.setSalonesDisponibles([...unique.values()].filter((s) => esGradoAsistenciaDiaria(s.graOrden)));
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

		// Profesores y Asistentes administrativos no se agrupan por salón — BE ignora el selector
		const requiereSalones =
			filters.tipoPersona !== 'P' && filters.tipoPersona !== 'A'
			&& filters.tipoPersona !== 'C' && filters.tipoPersona !== 'M';
		if (requiereSalones && filters.salonesSeleccionados.length === 0) {
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
		if (this.store.exportingPdf()) return;

		const filters = this.store.filters();
		const resultado = this.store.resultado();
		if (!resultado) return;

		this.store.setExportingPdf(true);

		this.api
			.descargarPdf(filters)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blob) => {
					downloadBlob(blob, `${this.buildReportFileName(resultado)}.pdf`);
					this.store.setExportingPdf(false);
				},
				error: (err) => {
					logger.error('[AttendanceReports] Error al exportar PDF', err);
					this.store.setExportingPdf(false);
				},
			});
	}
	// #endregion

	// #region Exportar Excel
	exportarExcel(): void {
		if (this.store.exportingExcel()) return;

		const filters = this.store.filters();
		const resultado = this.store.resultado();
		if (!resultado) return;

		this.store.setExportingExcel(true);

		this.api
			.descargarExcel(filters)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blob) => {
					downloadBlob(blob, `${this.buildReportFileName(resultado)}.xlsx`);
					this.store.setExportingExcel(false);
				},
				error: (err) => {
					logger.error('[AttendanceReports] Error al exportar Excel', err);
					this.store.setExportingExcel(false);
				},
			});
	}
	// #endregion

	// #region Helpers — Naming de archivos exportados
	/** Reporte_Asistencia_{Tipo}_{Rango}_{Fecha(s)}_{ReportarSobre}, ej: Reporte_Asistencia_Todos_Mes_Septiembre_2026_Estudiantes */
	private buildReportFileName(resultado: ReporteFiltrado): string {
		const tipo = sanitizeFileNameSegment(
			ESTADO_OPTIONS.find((o) => o.value === resultado.filtroEstado)?.label ?? resultado.filtroEstado,
		);
		const rango = sanitizeFileNameSegment(
			RANGO_OPTIONS.find((o) => o.value === resultado.rangoTipo)?.label ?? resultado.rangoTipo,
		);
		const reportarSobre = sanitizeFileNameSegment(
			TIPO_PERSONA_OPTIONS.find((o) => o.value === resultado.tipoPersona)?.label ?? resultado.tipoPersona,
		);
		const fecha = this.buildFileNameFecha(resultado);

		return `Reporte_Asistencia_${tipo}_${rango}_${fecha}_${reportarSobre}`;
	}

	/**
	 * Precisión del segmento fecha según el rango: Día → un solo día, Semana → rango de días,
	 * Mes → nombre del mes en español + año (el BE ya calcula `nombreMes`, ej. "Septiembre").
	 * FechaInicio/FechaFin llegan del BE como DateTime ISO ("2026-09-01T00:00:00") — se recortan
	 * con slice, no con `Date`, para evitar corrimientos de huso horario.
	 */
	private buildFileNameFecha(resultado: ReporteFiltrado): string {
		const inicio = resultado.fechaInicio.slice(0, 10);
		const fin = resultado.fechaFin.slice(0, 10);

		if (resultado.rangoTipo === 'mes') {
			const anio = inicio.slice(0, 4);
			return resultado.nombreMes ? `${resultado.nombreMes}_${anio}` : inicio.slice(0, 7);
		}
		if (resultado.rangoTipo === 'semana') return `${inicio}_${fin}`;
		return inicio;
	}
	// #endregion

	// #region Filtros
	updateFilters(partial: Partial<ReporteFilters>): void {
		this.store.updateFilters(partial);
	}
	// #endregion
}
