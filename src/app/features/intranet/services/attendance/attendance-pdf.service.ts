import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { AsistenciaService } from '@core/services';
import { viewBlobInNewTab, downloadBlob } from '@core/helpers';
import { SelectorContext } from './attendance-view.service';

/**
 * Servicio scoped que encapsula toda la lógica de generación y descarga de PDFs
 * de asistencia (día, mes, periodo, salón mes/anual).
 *
 * Requiere un getter para obtener el contexto del selector activo
 * y señales de estado del controller padre.
 */
@Injectable()
export class AttendancePdfService {
	private asistenciaService = inject(AsistenciaService);
	private destroyRef = inject(DestroyRef);

	// #region Estado
	readonly downloadingPdf = signal(false);
	// #endregion

	// #region Configuración
	private getSelectorContext!: () => SelectorContext | null;

	/**
	 * Debe llamarse antes de cualquier operación de PDF.
	 * Recibe un getter que devuelve el contexto del selector activo.
	 */
	init(getSelectorContext: () => SelectorContext | null): void {
		this.getSelectorContext = getSelectorContext;
	}
	// #endregion

	// #region PDF Día
	verPdfAsistenciaDia(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;

		this.downloadingPdf.set(true);

		this.asistenciaService
			.descargarPdfAsistenciaDia(ctx.grado, ctx.seccion, fecha)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => viewBlobInNewTab(blob),
			});
	}

	descargarPdfAsistenciaDia(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;

		this.downloadingPdf.set(true);

		this.asistenciaService
			.descargarPdfAsistenciaDia(ctx.grado, ctx.seccion, fecha)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => {
					const fechaStr = fecha.toISOString().split('T')[0];
					downloadBlob(blob, `Asistencia_${ctx.grado}_${ctx.seccion}_${fechaStr}.pdf`);
				},
			});
	}
	// #endregion

	// #region PDF Mes
	verPdfAsistenciaMes(grado: string, seccion: string, mes: number, anio: number): void {
		this.downloadingPdf.set(true);

		this.asistenciaService
			.descargarPdfAsistenciaMes(grado, seccion, mes, anio)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => viewBlobInNewTab(blob),
			});
	}

	descargarPdfAsistenciaMes(grado: string, seccion: string, mes: number, anio: number): void {
		this.downloadingPdf.set(true);

		this.asistenciaService
			.descargarPdfAsistenciaMes(grado, seccion, mes, anio)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => {
					const mesStr = mes.toString().padStart(2, '0');
					downloadBlob(blob, `Asistencia_${grado}_${seccion}_${anio}-${mesStr}.pdf`);
				},
			});
	}
	// #endregion

	// #region PDF Periodo
	verPdfAsistenciaPeriodo(grado: string, seccion: string, mesI: number, anio: number, mesF: number): void {
		this.downloadingPdf.set(true);

		this.asistenciaService
			.descargarPdfAsistenciaPeriodo(grado, seccion, mesI, anio, mesF, anio)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => viewBlobInNewTab(blob),
			});
	}

	descargarPdfAsistenciaPeriodo(
		grado: string,
		seccion: string,
		mesI: number,
		anio: number,
		mesF: number,
	): void {
		this.downloadingPdf.set(true);

		this.asistenciaService
			.descargarPdfAsistenciaPeriodo(grado, seccion, mesI, anio, mesF, anio)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => {
					const inicio = `${anio}-${mesI.toString().padStart(2, '0')}`;
					const fin = `${anio}-${mesF.toString().padStart(2, '0')}`;
					downloadBlob(
						blob,
						`Asistencia_${grado}_${seccion}_Periodo_${inicio}_a_${fin}.pdf`,
					);
				},
			});
	}
	// #endregion

	// #region PDF Salón (derivado de fechaDia)
	verPdfSalonMes(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;

		this.downloadingPdf.set(true);
		const mes = fecha.getMonth() + 1;
		const anio = fecha.getFullYear();

		this.asistenciaService
			.descargarPdfAsistenciaMes(ctx.grado, ctx.seccion, mes, anio)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => viewBlobInNewTab(blob),
			});
	}

	descargarPdfSalonMes(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;

		this.downloadingPdf.set(true);
		const mes = fecha.getMonth() + 1;
		const anio = fecha.getFullYear();

		this.asistenciaService
			.descargarPdfAsistenciaMes(ctx.grado, ctx.seccion, mes, anio)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => {
					const mesStr = mes.toString().padStart(2, '0');
					downloadBlob(
						blob,
						`Asistencia_${ctx.grado}_${ctx.seccion}_${anio}-${mesStr}.pdf`,
					);
				},
			});
	}

	verPdfSalonAnio(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;

		this.downloadingPdf.set(true);
		const anio = fecha.getFullYear();
		const hoy = new Date();
		const mesFin = anio === hoy.getFullYear() ? hoy.getMonth() + 1 : 12;

		this.asistenciaService
			.descargarPdfAsistenciaPeriodo(ctx.grado, ctx.seccion, 1, anio, mesFin, anio)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => viewBlobInNewTab(blob),
			});
	}

	descargarPdfSalonAnio(fecha: Date): void {
		const ctx = this.getSelectorContext();
		if (!ctx) return;

		this.downloadingPdf.set(true);
		const anio = fecha.getFullYear();
		const hoy = new Date();
		const mesFin = anio === hoy.getFullYear() ? hoy.getMonth() + 1 : 12;

		this.asistenciaService
			.descargarPdfAsistenciaPeriodo(ctx.grado, ctx.seccion, 1, anio, mesFin, anio)
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				finalize(() => this.downloadingPdf.set(false)),
			)
			.subscribe({
				next: (blob) => {
					downloadBlob(
						blob,
						`Asistencia_${ctx.grado}_${ctx.seccion}_Anio_${anio}.pdf`,
					);
				},
			});
	}
	// #endregion
}
