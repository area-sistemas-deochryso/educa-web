import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserProfileService } from '@core/services';
import { ExcelService } from '@core/services/excel/excel.service';
import { logger } from '@core/helpers';
import {
	DirectorAsistenciaApiService,
	ProfesorAsistenciaApiService,
} from '@shared/services/asistencia';
import { isAdminRole } from '@shared/utils/role-policies.utils';
import { forkJoin } from 'rxjs';
import { ReportesAsistenciaApiService } from './reportes-asistencia-api.service';
import { ReportesAsistenciaStore } from './reportes-asistencia.store';
import type { ReporteFilters } from '../models';

@Injectable({ providedIn: 'root' })
export class ReportesAsistenciaFacade {
	// #region Dependencias
	private readonly store = inject(ReportesAsistenciaStore);
	private readonly api = inject(ReportesAsistenciaApiService);
	private readonly directorApi = inject(DirectorAsistenciaApiService);
	private readonly profesorApi = inject(ProfesorAsistenciaApiService);
	private readonly userProfile = inject(UserProfileService);
	private readonly excelService = inject(ExcelService);
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

		if (filters.salonesSeleccionados.length === 0) {
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
					logger.error('[ReportesAsistencia] Error al generar reporte', err);
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
					const a = document.createElement('a');
					a.href = url;
					a.download = `Reporte_${filters.estado}_${filters.fecha.toISOString().split('T')[0]}.pdf`;
					a.click();
					URL.revokeObjectURL(url);
					this.store.setExporting(false);
				},
				error: (err) => {
					logger.error('[ReportesAsistencia] Error al exportar PDF', err);
					this.store.setExporting(false);
				},
			});
	}
	// #endregion

	// #region Exportar Excel
	async exportarExcel(): Promise<void> {
		const resultado = this.store.resultado();
		if (!resultado) return;

		this.store.setExporting(true);

		const rows: Record<string, unknown>[] = [];
		for (const salon of resultado.salones) {
			for (const est of salon.estudiantes) {
				rows.push({
					salon: `${salon.grado} "${salon.seccion}"`,
					dni: est.dni,
					nombre: est.nombreCompleto,
					dias: est.cantidadDias,
					hora: est.horaLlegada ?? '-',
					observacion: est.observacion ?? '',
				});
			}
		}

		const esDia = resultado.rangoTipo === 'dia';

		await this.excelService.exportToXlsx({
			sheetName: resultado.filtroEstadoDescripcion,
			fileName: `Reporte_${resultado.filtroEstado}_${resultado.fechaInicio}`,
			columns: [
				{ header: 'Salón', key: 'salon', width: 15 },
				{ header: 'DNI', key: 'dni', width: 12 },
				{ header: 'Nombre', key: 'nombre', width: 35 },
				...(esDia
					? [{ header: 'Hora', key: 'hora', width: 10 }]
					: [{ header: 'Días', key: 'dias', width: 8 }]),
				{ header: 'Observación', key: 'observacion', width: 25 },
			],
			data: rows,
		});

		this.store.setExporting(false);
	}
	// #endregion

	// #region Filtros
	updateFilters(partial: Partial<ReporteFilters>): void {
		this.store.updateFilters(partial);
	}
	// #endregion
}
