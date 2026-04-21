import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';

import { AttendanceService } from '@core/services';
import { viewBlobInNewTab, downloadBlob } from '@core/helpers';
import { SelectorContext } from './attendance-view.models';

/**
 * Servicio scoped que encapsula la descarga y visualización de reportes
 * (PDF + Excel) de asistencia en sus variantes día, mes, periodo y año.
 */
@Injectable()
export class AttendancePdfService {
	private asistenciaService = inject(AttendanceService);
	private destroyRef = inject(DestroyRef);

	readonly downloadingPdf = signal(false);

	private getSelectorContext!: () => SelectorContext | null;

	/** Debe llamarse antes de cualquier operación. */
	init(getSelectorContext: () => SelectorContext | null): void {
		this.getSelectorContext = getSelectorContext;
	}

	// #region PDF — día / mes / periodo / salón
	verPdfAsistenciaDia(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		this.run(this.asistenciaService.descargarPdfAsistenciaDia(ctx.grado, ctx.seccion, fecha), viewBlobInNewTab);
	}

	descargarPdfAsistenciaDia(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		const fechaStr = fecha.toISOString().split('T')[0];
		this.run(
			this.asistenciaService.descargarPdfAsistenciaDia(ctx.grado, ctx.seccion, fecha),
			(blob) => downloadBlob(blob, `Asistencia_${ctx.grado}_${ctx.seccion}_${fechaStr}.pdf`),
		);
	}

	verPdfAsistenciaMes(grado: string, seccion: string, mes: number, anio: number): void {
		this.run(this.asistenciaService.descargarPdfAsistenciaMes(grado, seccion, mes, anio), viewBlobInNewTab);
	}

	descargarPdfAsistenciaMes(grado: string, seccion: string, mes: number, anio: number): void {
		const mesStr = mes.toString().padStart(2, '0');
		this.run(
			this.asistenciaService.descargarPdfAsistenciaMes(grado, seccion, mes, anio),
			(blob) => downloadBlob(blob, `Asistencia_${grado}_${seccion}_${anio}-${mesStr}.pdf`),
		);
	}

	verPdfAsistenciaPeriodo(grado: string, seccion: string, mesI: number, anio: number, mesF: number): void {
		this.run(
			this.asistenciaService.descargarPdfAsistenciaPeriodo(grado, seccion, mesI, anio, mesF, anio),
			viewBlobInNewTab,
		);
	}

	descargarPdfAsistenciaPeriodo(grado: string, seccion: string, mesI: number, anio: number, mesF: number): void {
		const inicio = `${anio}-${mesI.toString().padStart(2, '0')}`;
		const fin = `${anio}-${mesF.toString().padStart(2, '0')}`;
		this.run(
			this.asistenciaService.descargarPdfAsistenciaPeriodo(grado, seccion, mesI, anio, mesF, anio),
			(blob) => downloadBlob(blob, `Asistencia_${grado}_${seccion}_Periodo_${inicio}_a_${fin}.pdf`),
		);
	}

	verPdfSalonMes(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		this.verPdfAsistenciaMes(ctx.grado, ctx.seccion, fecha.getMonth() + 1, fecha.getFullYear());
	}

	descargarPdfSalonMes(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		this.descargarPdfAsistenciaMes(ctx.grado, ctx.seccion, fecha.getMonth() + 1, fecha.getFullYear());
	}

	verPdfSalonAnio(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		const { mesFin, anio } = this.salonAnioRange(fecha);
		this.verPdfAsistenciaPeriodo(ctx.grado, ctx.seccion, 1, anio, mesFin);
	}

	descargarPdfSalonAnio(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		const { mesFin, anio } = this.salonAnioRange(fecha);
		this.run(
			this.asistenciaService.descargarPdfAsistenciaPeriodo(ctx.grado, ctx.seccion, 1, anio, mesFin, anio),
			(blob) => downloadBlob(blob, `Asistencia_${ctx.grado}_${ctx.seccion}_Anio_${anio}.pdf`),
		);
	}
	// #endregion

	// #region PDF con contexto del selector
	verMesFromContext(mes: number, anio: number): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		this.verPdfAsistenciaMes(ctx.grado, ctx.seccion, mes, anio);
	}

	descargarMesFromContext(mes: number, anio: number): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		this.descargarPdfAsistenciaMes(ctx.grado, ctx.seccion, mes, anio);
	}

	verPeriodoFromContext(mesI: number, anio: number, mesF: number): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		this.verPdfAsistenciaPeriodo(ctx.grado, ctx.seccion, mesI, anio, mesF);
	}

	descargarPeriodoFromContext(mesI: number, anio: number, mesF: number): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		this.descargarPdfAsistenciaPeriodo(ctx.grado, ctx.seccion, mesI, anio, mesF);
	}
	// #endregion

	// #region Excel — día / mes / periodo / salón
	descargarExcelAsistenciaDia(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		const fechaStr = fecha.toISOString().split('T')[0];
		this.run(
			this.asistenciaService.descargarExcelAsistenciaDia(ctx.grado, ctx.seccion, fecha),
			(blob) => downloadBlob(blob, `Asistencia_${ctx.grado}_${ctx.seccion}_${fechaStr}.xlsx`),
		);
	}

	descargarExcelAsistenciaMes(grado: string, seccion: string, mes: number, anio: number): void {
		const mesStr = mes.toString().padStart(2, '0');
		this.run(
			this.asistenciaService.descargarExcelAsistenciaMes(grado, seccion, mes, anio),
			(blob) => downloadBlob(blob, `Asistencia_${grado}_${seccion}_${anio}-${mesStr}.xlsx`),
		);
	}

	descargarExcelAsistenciaPeriodo(grado: string, seccion: string, mesI: number, anio: number, mesF: number): void {
		const inicio = `${anio}-${mesI.toString().padStart(2, '0')}`;
		const fin = `${anio}-${mesF.toString().padStart(2, '0')}`;
		this.run(
			this.asistenciaService.descargarExcelAsistenciaPeriodo(grado, seccion, mesI, anio, mesF, anio),
			(blob) => downloadBlob(blob, `Asistencia_${grado}_${seccion}_Periodo_${inicio}_a_${fin}.xlsx`),
		);
	}

	descargarExcelSalonMes(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		this.descargarExcelAsistenciaMes(ctx.grado, ctx.seccion, fecha.getMonth() + 1, fecha.getFullYear());
	}

	descargarExcelSalonAnio(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		const { mesFin, anio } = this.salonAnioRange(fecha);
		this.run(
			this.asistenciaService.descargarExcelAsistenciaPeriodo(ctx.grado, ctx.seccion, 1, anio, mesFin, anio),
			(blob) => downloadBlob(blob, `Asistencia_${ctx.grado}_${ctx.seccion}_Anio_${anio}.xlsx`),
		);
	}

	descargarExcelMesFromContext(mes: number, anio: number): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		this.descargarExcelAsistenciaMes(ctx.grado, ctx.seccion, mes, anio);
	}

	descargarExcelPeriodoFromContext(mesI: number, anio: number, mesF: number): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;
		this.descargarExcelAsistenciaPeriodo(ctx.grado, ctx.seccion, mesI, anio, mesF);
	}
	// #endregion

	// #region Helpers privados
	private run(obs$: Observable<Blob>, handle: (blob: Blob) => void): void {
		this.downloadingPdf.set(true);
		obs$
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({ next: handle });
	}

	private salonAnioRange(fecha: Date): { mesFin: number; anio: number } {
		const anio = fecha.getFullYear();
		const hoy = new Date();
		const mesFin = anio === hoy.getFullYear() ? hoy.getMonth() + 1 : 12;
		return { mesFin, anio };
	}
	// #endregion
}
