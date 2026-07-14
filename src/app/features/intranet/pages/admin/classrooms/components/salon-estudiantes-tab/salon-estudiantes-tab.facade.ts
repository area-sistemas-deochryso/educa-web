import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { UI_SUMMARIES, UI_SALONES_SUCCESS_MESSAGES, UI_SALONES_ERROR_DETAILS, UI_SALONES_CONFIRM_HEADERS } from '@shared/constants';

import { SalonEstudiantesApiService } from '../../services/salon-estudiantes-api.service';
import { ClassroomStudentsStore } from './salon-estudiantes-tab.store';

/**
 * Orquestación de la tab "Estudiantes" — agregar/transferir/retirar de un salón en curso.
 * Todas las mutaciones esperan confirmación del backend antes de tocar el store
 * (mismo criterio que ClassroomsAdminFacade: INV-U01 es responsabilidad del servidor).
 */
@Injectable({ providedIn: 'root' })
export class ClassroomStudentsFacade {
	// #region Dependencias
	private readonly api = inject(SalonEstudiantesApiService);
	private readonly store = inject(ClassroomStudentsStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	readonly vm = this.store.vm;

	// #region Carga
	cargarEstudiantes(salonId: number): void {
		this.store.setLoading(true);
		this.store.setError(null);

		this.api
			.listarPorSalon(salonId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (estudiantes) => {
					this.store.setEstudiantes(estudiantes);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar estudiantes del salón:', err);
					this.store.setError(UI_SALONES_ERROR_DETAILS.loadEstudiantesSalon);
					this.store.setLoading(false);
				},
			});
	}

	buscarSinSalon(query: string): void {
		if (!query || query.trim().length < 2) {
			this.store.clearDisponibles();
			return;
		}

		this.store.setSearchLoading(true);
		this.api
			.buscarSinSalon(query)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (disponibles) => {
					this.store.setDisponibles(disponibles);
					this.store.setSearchLoading(false);
				},
				error: (err) => {
					logger.error('Error al buscar estudiantes sin salón:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.buscarEstudiantesSinSalon);
					this.store.setSearchLoading(false);
				},
			});
	}
	// #endregion

	// #region Comandos
	agregar(salonId: number, estudianteId: number): void {
		this.store.setActionLoading(true);

		this.api
			.agregar(salonId, estudianteId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.errorHandler.showSuccess(UI_SALONES_CONFIRM_HEADERS.estudianteAgregado, UI_SALONES_SUCCESS_MESSAGES.estudianteAgregado);
					this.store.clearDisponibles();
					this.store.setActionLoading(false);
					this.cargarEstudiantes(salonId);
				},
				error: (err) => {
					logger.error('Error al agregar estudiante al salón:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.agregarEstudiante);
					this.store.setActionLoading(false);
				},
			});
	}

	transferir(salonId: number, estudianteId: number, salonDestinoId: number, confirmar = false): void {
		this.store.setActionLoading(true);

		this.api
			.transferir(salonId, estudianteId, { salonDestinoId, confirmar })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (resultado) => {
					this.store.setActionLoading(false);
					if (resultado.requiereConfirmacion) {
						this.store.setPendingConfirm({
							accion: 'transferir',
							estudianteId,
							advertencias: resultado.advertencias,
							salonDestinoId,
						});
						return;
					}
					this.store.setPendingConfirm(null);
					this.errorHandler.showSuccess(UI_SALONES_CONFIRM_HEADERS.estudianteTransferido, UI_SALONES_SUCCESS_MESSAGES.estudianteTransferido);
					this.store.removeEstudiante(estudianteId);
				},
				error: (err) => {
					logger.error('Error al transferir estudiante:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.transferirEstudiante);
					this.store.setActionLoading(false);
				},
			});
	}

	retirar(salonId: number, estudianteId: number, motivo: string, confirmar = false): void {
		this.store.setActionLoading(true);

		this.api
			.retirar(salonId, estudianteId, { motivo, confirmar })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (resultado) => {
					this.store.setActionLoading(false);
					if (resultado.requiereConfirmacion) {
						this.store.setPendingConfirm({
							accion: 'retirar',
							estudianteId,
							advertencias: resultado.advertencias,
							motivo,
						});
						return;
					}
					this.store.setPendingConfirm(null);
					this.errorHandler.showSuccess(UI_SALONES_CONFIRM_HEADERS.estudianteRetirado, UI_SALONES_SUCCESS_MESSAGES.estudianteRetirado);
					this.store.removeEstudiante(estudianteId);
				},
				error: (err) => {
					logger.error('Error al retirar estudiante:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.retirarEstudiante);
					this.store.setActionLoading(false);
				},
			});
	}

	/** Re-envía la acción pendiente con Confirmar=true tras la advertencia mostrada al usuario. */
	confirmarPendiente(salonId: number): void {
		const pending = this.store.pendingConfirm();
		if (!pending) return;

		if (pending.accion === 'transferir' && pending.salonDestinoId !== undefined) {
			this.transferir(salonId, pending.estudianteId, pending.salonDestinoId, true);
		} else if (pending.accion === 'retirar' && pending.motivo !== undefined) {
			this.retirar(salonId, pending.estudianteId, pending.motivo, true);
		}
	}

	cancelarPendiente(): void {
		this.store.setPendingConfirm(null);
	}

	reset(): void {
		this.store.reset();
	}
	// #endregion
}
