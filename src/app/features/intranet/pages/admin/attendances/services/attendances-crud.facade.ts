import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { logger } from '@core/helpers';
import { environment } from '@env/environment';
import {
	CrearAsistenciaCompletaRequest,
	CrearEntradaManualRequest,
	CrearSalidaManualRequest,
	ActualizarHorasRequest,
	AsistenciaAdminLista,
	CrearCierreMensualRequest,
	RevertirCierreMensualRequest,
} from '../models';
import { AttendancesAdminService } from './attendances-admin.service';
import { AttendancesAdminStore } from './attendances-admin.store';
import { AttendancesDataFacade } from './attendances-data.facade';

@Injectable({ providedIn: 'root' })
export class AttendancesCrudFacade {
	// #region Dependencias
	private api = inject(AttendancesAdminService);
	private store = inject(AttendancesAdminStore);
	private dataFacade = inject(AttendancesDataFacade);
	private errorHandler = inject(ErrorHandlerService);
	private wal = inject(WalFacadeHelper);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Save (create/update dispatcher)

	save(): void {
		const fd = this.store.formData();
		const isEditing = this.store.isEditing();

		if (isEditing) {
			this.actualizarHoras();
		} else if (fd.tipoOperacion === 'entrada') {
			this.crearEntrada();
		} else if (fd.tipoOperacion === 'salida') {
			this.crearSalida();
		} else {
			this.crearCompleta();
		}
	}

	// #endregion

	// #region Crear entrada

	private crearEntrada(): void {
		const fd = this.store.formData();
		if (!fd.estudianteId || !fd.sedeId || !fd.horaEntrada) return;

		const dto: CrearEntradaManualRequest = {
			estudianteId: fd.estudianteId,
			sedeId: fd.sedeId,
			horaEntrada: fd.horaEntrada.toISOString(),
			observacion: fd.observacion || undefined,
		};

		this.store.closeDialog();

		this.api
			.crearEntrada(dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.dataFacade.refreshItemsOnly();
					this.dataFacade.loadEstadisticas();
				},
				error: (err) => {
					logger.error('Error al crear entrada:', err);
					this.errorHandler.showError('Error', 'No se pudo registrar la entrada');
				},
			});
	}

	// #endregion

	// #region Crear salida

	private crearSalida(): void {
		const fd = this.store.formData();
		if (!fd.asistenciaId || !fd.horaSalida) return;

		const dto: CrearSalidaManualRequest = {
			asistenciaId: fd.asistenciaId,
			horaSalida: fd.horaSalida.toISOString(),
			observacion: fd.observacion || undefined,
		};

		this.store.closeDialog();

		this.api
			.crearSalida(dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					if (result) {
						this.store.updateItem(fd.asistenciaId!, {
							horaSalida: result.horaSalida,
							estado: result.estado,
							origenManual: true,
						});
						this.store.incrementarEstadistica('completas', 1);
						this.store.incrementarEstadistica('incompletas', -1);
						this.store.incrementarEstadistica('registrosManuales', 1);
					}
				},
				error: (err) => {
					logger.error('Error al crear salida:', err);
					this.errorHandler.showError('Error', 'No se pudo registrar la salida');
				},
			});
	}

	// #endregion

	// #region Crear completa

	private crearCompleta(): void {
		const fd = this.store.formData();
		if (!fd.estudianteId || !fd.sedeId || !fd.horaEntrada || !fd.horaSalida) return;

		const dto: CrearAsistenciaCompletaRequest = {
			estudianteId: fd.estudianteId,
			sedeId: fd.sedeId,
			horaEntrada: fd.horaEntrada.toISOString(),
			horaSalida: fd.horaSalida.toISOString(),
			observacion: fd.observacion || undefined,
		};

		this.store.closeDialog();

		this.api
			.crearCompleta(dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.dataFacade.refreshItemsOnly();
					this.dataFacade.loadEstadisticas();
				},
				error: (err) => {
					logger.error('Error al crear asistencia completa:', err);
					this.errorHandler.showError('Error', 'No se pudo registrar la asistencia');
				},
			});
	}

	// #endregion

	// #region Actualizar horas

	private actualizarHoras(): void {
		const fd = this.store.formData();
		const selected = this.store.selectedItem();
		if (!selected) return;

		// Si tenía salida y ahora no, indicar al backend que la limpie
		const teniaHoraSalida = !!selected.horaSalida;
		const limpiarSalida = teniaHoraSalida && !fd.horaSalida;

		// En edición, timeOnly=true devuelve Date con fecha de hoy.
		// Combinar la hora editada con la fecha original del registro.
		const fechaBase = new Date(selected.fecha);
		const combinarFechaHora = (hora: Date | null): string | undefined => {
			if (!hora) return undefined;
			const combined = new Date(fechaBase);
			combined.setHours(hora.getHours(), hora.getMinutes(), 0, 0);
			return combined.toISOString();
		};

		const dto: ActualizarHorasRequest = {
			horaEntrada: combinarFechaHora(fd.horaEntrada),
			horaSalida: combinarFechaHora(fd.horaSalida),
			limpiarSalida: limpiarSalida || undefined,
			observacion: fd.observacion || undefined,
			rowVersion: selected.rowVersion,
		};

		this.store.closeDialog();

		this.api
			.actualizarHoras(selected.asistenciaId, dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					if (result) {
						this.store.updateItem(selected.asistenciaId, {
							horaEntrada: result.horaEntrada,
							horaSalida: result.horaSalida,
							estado: result.estado,
							observacion: result.observacion,
							origenManual: true,
							rowVersion: result.rowVersion,
						});
					}
				},
				error: (err) => {
					logger.error('Error al actualizar horas:', err);
					this.errorHandler.showError('Error', 'No se pudo actualizar las horas');
				},
			});
	}

	// #endregion

	// #region Eliminar

	delete(item: AsistenciaAdminLista): void {
		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'asistencia-admin',
			resourceId: item.asistenciaId,
			endpoint: `${environment.apiUrl}/api/asistencia-admin/${item.asistenciaId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminar(item.asistenciaId),
			onCommit: () => {},
			onError: (err) => {
				logger.error('Error al eliminar asistencia:', err);
				this.errorHandler.showError('Error', 'No se pudo eliminar el registro');
			},
			optimistic: {
				apply: () => {
					this.store.removeItem(item.asistenciaId);
					this.store.incrementarEstadistica('totalRegistros', -1);
					if (item.estado === 'Completa') {
						this.store.incrementarEstadistica('completas', -1);
					} else {
						this.store.incrementarEstadistica('incompletas', -1);
					}
					if (item.origenManual) {
						this.store.incrementarEstadistica('registrosManuales', -1);
					} else {
						this.store.incrementarEstadistica('registrosWebhook', -1);
					}
				},
				rollback: () => {
					this.dataFacade.loadData();
				},
			},
		});
	}

	// #endregion

	// #region Enviar correos masivos

	enviarCorreos(): void {
		const ids = Array.from(this.store.selectedIds());
		if (ids.length === 0) return;

		this.store.setEnviandoCorreos(true);

		this.api
			.enviarCorreos({ asistenciaIds: ids })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.store.setEnviandoCorreos(false);
					this.store.clearSelection();

					const msg = `${result.encolados} correo(s) encolados de ${result.total} seleccionados` +
						(result.sinCorreo > 0 ? `. ${result.sinCorreo} sin correo de apoderado` : '');
					this.errorHandler.showSuccess('Correos enviados', msg);
				},
				error: (err) => {
					this.store.setEnviandoCorreos(false);
					logger.error('Error al enviar correos masivos:', err);
					this.errorHandler.showError('Error', 'No se pudieron enviar los correos');
				},
			});
	}

	// #endregion

	// #region Cierres mensuales

	crearCierre(dto: CrearCierreMensualRequest): void {
		this.api
			.crearCierre(dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (cierre) => {
					if (cierre) {
						this.store.addCierre(cierre);
					}
				},
				error: (err) => {
					logger.error('Error al crear cierre:', err);
					this.errorHandler.showError('Error', 'No se pudo cerrar el mes');
				},
			});
	}

	revertirCierre(cierreId: number, dto: RevertirCierreMensualRequest): void {
		this.api
			.revertirCierre(cierreId, dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					if (result) {
						this.store.updateCierre(cierreId, { activo: false, observacion: result.observacion });
					}
				},
				error: (err) => {
					logger.error('Error al revertir cierre:', err);
					this.errorHandler.showError('Error', 'No se pudo revertir el cierre');
				},
			});
	}

	// #endregion
}
