import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { logger } from '@core/helpers';
import {
	CrearAsistenciaCompletaRequest,
	CrearEntradaManualRequest,
	CrearSalidaManualRequest,
	ActualizarHorasRequest,
	AsistenciaAdminLista,
	CrearCierreMensualRequest,
	RevertirCierreMensualRequest,
} from '../models';
import { AsistenciasAdminService } from './asistencias-admin.service';
import { AsistenciasAdminStore } from './asistencias-admin.store';
import { AsistenciasDataFacade } from './asistencias-data.facade';

@Injectable({ providedIn: 'root' })
export class AsistenciasCrudFacade {
	// #region Dependencias
	private api = inject(AsistenciasAdminService);
	private store = inject(AsistenciasAdminStore);
	private dataFacade = inject(AsistenciasDataFacade);
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

		const dto: ActualizarHorasRequest = {
			horaEntrada: fd.horaEntrada?.toISOString(),
			horaSalida: fd.horaSalida?.toISOString(),
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
			endpoint: '',
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
