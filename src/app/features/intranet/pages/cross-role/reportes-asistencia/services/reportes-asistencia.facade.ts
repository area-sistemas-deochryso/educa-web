import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserProfileService } from '@core/services';
import { logger } from '@core/helpers';
import {
	DirectorAsistenciaApiService,
	ProfesorAsistenciaApiService,
} from '@shared/services/asistencia';
import { isAdminRole } from '@shared/utils/role-policies.utils';
import { forkJoin } from 'rxjs';
import { ReportesAsistenciaApiService } from './reportes-asistencia-api.service';
import { ReportesAsistenciaStore } from './reportes-asistencia.store';
import type { ReporteFilters, SalonReporteFiltrado } from '../models';

@Injectable({ providedIn: 'root' })
export class ReportesAsistenciaFacade {
	// #region Dependencias
	private readonly store = inject(ReportesAsistenciaStore);
	private readonly api = inject(ReportesAsistenciaApiService);
	private readonly directorApi = inject(DirectorAsistenciaApiService);
	private readonly profesorApi = inject(ProfesorAsistenciaApiService);
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
					window.open(url, '_blank');
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

		try {
			const mod = await import('exceljs');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const resolved = mod as any;
			const WorkbookClass = resolved.Workbook ?? resolved.default?.Workbook;
			if (!WorkbookClass) {
				logger.error('[ReportesAsistencia] ExcelJS no disponible');
				return;
			}

			const workbook = new WorkbookClass();
			const esDia = resultado.rangoTipo === 'dia';

			if (esDia) {
				// Una sola hoja con todas las tablas de salones
				const sheet = workbook.addWorksheet(resultado.filtroEstadoDescripcion);
				this.configurarAnchoColumnas(sheet, esDia);
				let currentRow = this.escribirLeyenda(sheet, 1);
				currentRow++;
				for (const salon of resultado.salones) {
					if (salon.totalFiltrados === 0) continue;
					currentRow = this.escribirSalonEnHoja(sheet, salon, esDia, currentRow);
					currentRow++; // Espacio entre salones
				}
			} else {
				// Una hoja por salón
				for (const salon of resultado.salones) {
					if (salon.totalFiltrados === 0) continue;
					const nombreHoja = `${salon.grado} ${salon.seccion}`.substring(0, 31);
					const sheet = workbook.addWorksheet(nombreHoja);
					this.configurarAnchoColumnas(sheet, esDia);
					const startRow = this.escribirLeyenda(sheet, 1);
					this.escribirSalonEnHoja(sheet, salon, esDia, startRow + 1);
				}
			}

			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer)], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `Reporte_${resultado.filtroEstado}_${resultado.fechaInicio}.xlsx`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			logger.error('[ReportesAsistencia] Error al exportar Excel', err);
		} finally {
			this.store.setExporting(false);
		}
	}

	private static readonly NIVELES_LEYENDA: { label: string; color: string }[] = [
		{ label: 'Excelente (90–100%)', color: 'FF1565C0' },
		{ label: 'Bueno (80–89%)', color: 'FF2E7D32' },
		{ label: 'Regular (51–79%)', color: 'FFFF8F00' },
		{ label: 'Bajo (20–50%)', color: 'FFE65100' },
		{ label: 'Crítico (0–19%)', color: 'FFC62828' },
	];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private escribirLeyenda(sheet: any, startRow: number): number {
		let row = startRow;

		const titleRow = sheet.getRow(row);
		titleRow.getCell(1).value = 'Leyenda — Nivel de asistencia';
		titleRow.getCell(1).font = { bold: true, size: 9, color: { argb: 'FF333333' } };
		row++;

		const legendRow = sheet.getRow(row);
		for (let i = 0; i < ReportesAsistenciaFacade.NIVELES_LEYENDA.length; i++) {
			const nivel = ReportesAsistenciaFacade.NIVELES_LEYENDA[i];
			const cell = legendRow.getCell(i + 1);
			cell.value = nivel.label;
			cell.font = { bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: nivel.color } };
			cell.alignment = { horizontal: 'center', vertical: 'middle' };
		}
		legendRow.height = 20;
		row++;

		return row;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private configurarAnchoColumnas(sheet: any, esDia: boolean): void {
		const anchos = esDia
			? [{ width: 5 }, { width: 12 }, { width: 35 }, { width: 8 }, { width: 10 }, { width: 10 }, { width: 30 }]
			: [{ width: 5 }, { width: 12 }, { width: 35 }, { width: 8 }, { width: 8 }, { width: 30 }];
		sheet.columns = anchos;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private escribirSalonEnHoja(sheet: any, salon: SalonReporteFiltrado, esDia: boolean, startRow: number): number {
		const colCount = esDia ? 7 : 6;
		let row = startRow;

		// Cabecera del salón con color según porcentaje
		const colorBg = this.colorPorPorcentaje(salon.porcentajeAsistencia);
		const headerRow = sheet.getRow(row);
		const titulo = `${salon.grado} "${salon.seccion}" — ${salon.porcentajeAsistencia}% asistencia (${salon.totalFiltrados}/${salon.totalEstudiantes})`;
		headerRow.getCell(1).value = titulo;
		sheet.mergeCells(row, 1, row, colCount);
		headerRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
		headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorBg } };
		headerRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
		headerRow.height = 28;
		row++;

		// Mini estadísticas
		const s = salon.estadisticas;
		const statsRow = sheet.getRow(row);
		const statsText = `T:${s.temprano}  A:${s.aTiempo}  F:${s.fueraHora}  N:${s.noAsistio}  J:${s.justificado}  -:${s.pendiente}`;
		statsRow.getCell(1).value = statsText;
		sheet.mergeCells(row, 1, row, colCount);
		statsRow.getCell(1).font = { size: 9, color: { argb: 'FF666666' } };
		statsRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
		row++;

		// Header de tabla
		const headers = esDia
			? ['#', 'DNI', 'Nombre', 'Estado', 'Entrada', 'Salida', 'Observación']
			: ['#', 'DNI', 'Nombre', 'Estado', 'Días', 'Observación'];
		const thRow = sheet.getRow(row);
		headers.forEach((h, i) => {
			const cell = thRow.getCell(i + 1);
			cell.value = h;
			cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B3B3B' } };
			cell.alignment = { horizontal: 'center', vertical: 'middle' };
		});
		thRow.height = 22;
		row++;

		// Filas de estudiantes
		for (let i = 0; i < salon.estudiantes.length; i++) {
			const est = salon.estudiantes[i];
			const dataRow = sheet.getRow(row);
			const bgArgb = i % 2 === 0 ? 'FFFFFFFF' : 'FFF9F9F9';

			const values: (string | number)[] = esDia
				? [
						i + 1,
						est.dni,
						est.nombreCompleto,
						est.estadoCodigo,
						est.horaLlegada ? new Date(est.horaLlegada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—',
						est.horaSalida ? new Date(est.horaSalida).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—',
						est.observacion ?? '',
					]
				: [i + 1, est.dni, est.nombreCompleto, est.estadoCodigo, est.cantidadDias, est.observacion ?? ''];

			values.forEach((v, ci) => {
				const cell = dataRow.getCell(ci + 1);
				cell.value = v;
				cell.font = { size: 9 };
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
			});

			// Color del badge de estado
			const estadoCell = dataRow.getCell(4);
			const estadoColor = this.colorPorEstado(est.estadoCodigo);
			estadoCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
			estadoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: estadoColor } };
			estadoCell.alignment = { horizontal: 'center' };

			row++;
		}

		return row;
	}

	private colorPorPorcentaje(pct: number): string {
		if (pct >= 90) return 'FF1565C0'; // Azul
		if (pct >= 80) return 'FF2E7D32'; // Verde
		if (pct >= 51) return 'FFFF8F00'; // Amarillo/Amber
		if (pct >= 20) return 'FFE65100'; // Naranja
		return 'FFC62828'; // Rojo
	}

	private colorPorEstado(codigo: string): string {
		switch (codigo) {
			case 'T': return 'FF506AD0';
			case 'A': return 'FF77A02D';
			case 'F': return 'FFF59E0B';
			case 'N': return 'FFF44336';
			case 'J': return 'FF9C27B0';
			default: return 'FF9E9E9E';
		}
	}
	// #endregion

	// #region Filtros
	updateFilters(partial: Partial<ReporteFilters>): void {
		this.store.updateFilters(partial);
	}
	// #endregion
}
