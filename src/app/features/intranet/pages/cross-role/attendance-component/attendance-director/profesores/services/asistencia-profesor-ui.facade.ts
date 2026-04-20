import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { ErrorHandlerService } from '@core/services';
import { downloadBlob, logger, viewBlobInNewTab } from '@core/helpers';
import { AttendanceStatus } from '@data/models/attendance.models';
import { AsistenciaProfesorApiService } from '@shared/services/attendance/asistencia-profesor-api.service';

import { AsistenciaProfesorDataFacade } from './asistencia-profesor-data.facade';
import {
	AsistenciaProfesorStore,
	AsistenciaProfesorViewMode,
} from './asistencia-profesor.store';

/**
 * Facade UI para la vista admin de asistencia de profesores.
 * Orquesta: selección de profesor, cambio de modo (día/mes), filtros y
 * exportaciones PDF.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaProfesorUiFacade {
	private readonly store = inject(AsistenciaProfesorStore);
	private readonly dataFacade = inject(AsistenciaProfesorDataFacade);
	private readonly api = inject(AsistenciaProfesorApiService);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);

	// * Re-exponemos signals UI del store sin que el componente lo importe directo.
	readonly viewMode = this.store.viewMode;
	readonly selectedDate = this.store.selectedDate;
	readonly selectedMes = this.store.selectedMes;
	readonly selectedAnio = this.store.selectedAnio;
	readonly downloadingPdf = this.store.downloadingPdf;

	// #region Selección de profesor

	selectProfesor(dni: string | null): void {
		this.store.setSelectedProfesorDni(dni);
		this.store.setSelectedProfesorDetalle(null);

		if (!dni) return;
		this.dataFacade.refreshDetail();
	}

	// #endregion
	// #region Modo de vista

	setViewMode(mode: AsistenciaProfesorViewMode): void {
		if (this.store.viewMode() === mode) return;
		this.store.setViewMode(mode);
		this.dataFacade.refreshDetail();
	}

	setSelectedDate(fecha: Date): void {
		this.store.setSelectedDate(fecha);
		if (this.store.viewMode() === 'dia') {
			this.dataFacade.refreshDetail();
		}
	}

	setSelectedMes(mes: number): void {
		this.store.setSelectedMes(mes);
		if (this.store.viewMode() === 'mes') {
			this.dataFacade.refreshDetail();
		}
	}

	setSelectedAnio(anio: number): void {
		this.store.setSelectedAnio(anio);
		if (this.store.viewMode() === 'mes') {
			this.dataFacade.refreshDetail();
		}
	}

	// #endregion
	// #region Filtros de lista

	setFechaInicio(fecha: Date): void {
		this.store.updateFilter('fechaInicio', fecha);
	}

	setFechaFin(fecha: Date): void {
		this.store.updateFilter('fechaFin', fecha);
	}

	setFilterEstado(estado: AttendanceStatus | null): void {
		this.store.updateFilter('estado', estado);
	}

	applyFilters(): void {
		this.dataFacade.applyFilters(this.store.filters());
	}

	// #endregion
	// #region PDFs

	verPdfDia(): void {
		const dni = this.store.selectedProfesorDni();
		if (!dni) return;
		this.runPdf(this.api.descargarPdfProfesorDia(dni, this.store.selectedDate()), (blob) =>
			viewBlobInNewTab(blob),
		);
	}

	descargarPdfDia(): void {
		const dni = this.store.selectedProfesorDni();
		if (!dni) return;
		const fileName = `Asistencia_Profesor_${dni}_${this.formatDateLocal(this.store.selectedDate())}.pdf`;
		this.runPdf(this.api.descargarPdfProfesorDia(dni, this.store.selectedDate()), (blob) =>
			downloadBlob(blob, fileName),
		);
	}

	verPdfMes(): void {
		const dni = this.store.selectedProfesorDni();
		if (!dni) return;
		this.runPdf(
			this.api.descargarPdfProfesorMes(dni, this.store.selectedMes(), this.store.selectedAnio()),
			(blob) => viewBlobInNewTab(blob),
		);
	}

	descargarPdfMes(): void {
		const dni = this.store.selectedProfesorDni();
		if (!dni) return;
		const fileName = `Asistencia_Profesor_${dni}_${this.store.selectedAnio()}-${String(this.store.selectedMes()).padStart(2, '0')}.pdf`;
		this.runPdf(
			this.api.descargarPdfProfesorMes(dni, this.store.selectedMes(), this.store.selectedAnio()),
			(blob) => downloadBlob(blob, fileName),
		);
	}

	verPdfFiltrado(): void {
		const { fechaInicio, fechaFin, estado } = this.store.filters();
		this.runPdf(
			this.api.descargarPdfReporteFiltradoProfesores(fechaInicio, fechaFin, estado),
			(blob) => viewBlobInNewTab(blob),
		);
	}

	descargarPdfFiltrado(): void {
		const { fechaInicio, fechaFin, estado } = this.store.filters();
		const fileName = `Reporte_Profesores_${this.formatDateLocal(fechaInicio)}_a_${this.formatDateLocal(fechaFin)}.pdf`;
		this.runPdf(
			this.api.descargarPdfReporteFiltradoProfesores(fechaInicio, fechaFin, estado),
			(blob) => downloadBlob(blob, fileName),
		);
	}

	// #endregion
	// #region Helpers privados

	private runPdf(
		obs$: ReturnType<AsistenciaProfesorApiService['descargarPdfProfesorDia']>,
		handle: (blob: Blob) => void,
	): void {
		this.store.setDownloadingPdf(true);
		obs$
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				catchError((err) => {
					logger.error('Error generando PDF:', err);
					this.errorHandler.showError('Error', 'No se pudo generar el reporte PDF.');
					return of(null);
				}),
				finalize(() => this.store.setDownloadingPdf(false)),
			)
			.subscribe((blob) => {
				if (blob) handle(blob);
			});
	}

	private formatDateLocal(fecha: Date): string {
		const year = fecha.getFullYear();
		const month = String(fecha.getMonth() + 1).padStart(2, '0');
		const day = String(fecha.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	// #endregion
}
