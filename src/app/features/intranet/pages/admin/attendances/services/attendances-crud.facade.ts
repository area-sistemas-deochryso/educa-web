import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { facadeErrorHandler, toLocalIso, type FacadeErrorHandler } from '@core/helpers';
import { environment } from '@env/environment';
import {
	CrearAsistenciaCompletaRequest,
	CrearEntradaManualRequest,
	CrearSalidaManualRequest,
	ActualizarHorasRequest,
	AsistenciaAdminLista,
	TipoPersonaAsistencia,
} from '../models';
import { AttendancesAdminService } from './attendances-admin.service';
import { AttendancesAdminStore } from './attendances-admin.store';
import { AttendancesDataFacade } from './attendances-data.facade';
import { tipoPersonaLabel } from './attendances-template-helpers';
import {
	applyActualizarHorasDelta,
	applyItemStatsDelta,
	applySalidaTransitionDelta,
} from './attendances-stats-helpers';

const RESOURCE = 'asistencia-admin';
const API_BASE = `${environment.apiUrl}/api/asistencia-admin`;


@Injectable({ providedIn: 'root' })
export class AttendancesCrudFacade {
	// #region Dependencias
	private api = inject(AttendancesAdminService);
	private store = inject(AttendancesAdminStore);
	private dataFacade = inject(AttendancesDataFacade);
	private errorHandler = inject(ErrorHandlerService);
	private wal = inject(WalFacadeHelper);
	private destroyRef = inject(DestroyRef);
	private errHandler: FacadeErrorHandler = facadeErrorHandler({
		tag: 'AttendancesCrudFacade',
		errorHandler: this.errorHandler,
	});
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

	/**
	 * Plan 23 Chat 4 + Plan 28 Chat 4b: toast de éxito diferenciado por tipoPersona — INV-AD05 ampliado.
	 * `'P'` → "Profesor"; `'A'` → "Asistente Administrativo"; default → "Estudiante".
	 */
	private notificarExito(tipo: TipoPersonaAsistencia | null | undefined, verbo: string, detalle: string): void {
		const persona = tipoPersonaLabel(tipo ?? 'E');
		this.errorHandler.showSuccess(`${persona} ${verbo}`, detalle);
	}

	// #endregion

	// #region Crear entrada (CREATE optimista)

	private crearEntrada(): void {
		const fd = this.store.formData();
		if (!fd.estudianteId || !fd.sedeId || !fd.horaEntrada) return;

		const dto: CrearEntradaManualRequest = {
			estudianteId: fd.estudianteId,
			sedeId: fd.sedeId,
			horaEntrada: toLocalIso(fd.horaEntrada),
			observacion: fd.observacion || undefined,
			tipoPersona: fd.tipoPersona,
		};

		this.wal.execute({
			operation: 'CREATE',
			resourceType: RESOURCE,
			endpoint: `${API_BASE}/entrada`,
			method: 'POST',
			payload: dto,
			http$: () => this.api.crearEntrada(dto),
			optimistic: {
				apply: () => this.store.closeDialog(),
				rollback: () => {},
			},
			onCommit: (created) => {
				if (!created) return;
				this.store.addItem(created);
				applyItemStatsDelta(this.store,created, 1);
				this.notificarExito(fd.tipoPersona, 'registrado', 'Entrada registrada correctamente');
			},
			onError: (err) => this.errHandler.handle(err, 'registrar la entrada'),
		});
	}

	// #endregion

	// #region Crear salida (UPDATE optimista — agrega salida a registro existente)

	private crearSalida(): void {
		const fd = this.store.formData();
		if (!fd.asistenciaId || !fd.horaSalida) return;

		const asistenciaId = fd.asistenciaId;
		const snapshot = this.store.items().find((i) => i.asistenciaId === asistenciaId);
		const horaSalidaIso = toLocalIso(fd.horaSalida);
		const observacion = fd.observacion || undefined;

		const dto: CrearSalidaManualRequest = {
			asistenciaId,
			horaSalida: horaSalidaIso,
			observacion,
			tipoPersona: fd.tipoPersona,
		};

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: RESOURCE,
			resourceId: asistenciaId,
			endpoint: `${API_BASE}/salida`,
			method: 'POST',
			payload: dto,
			http$: () => this.api.crearSalida(dto),
			optimistic: {
				apply: () => {
					this.store.updateItem(asistenciaId, {
						horaSalida: horaSalidaIso,
						estado: 'Completa',
						origenManual: true,
						editadoManualmente: true,
						observacion: observacion ?? snapshot?.observacion ?? null,
					});
					applySalidaTransitionDelta(this.store,snapshot, 1);
					this.store.closeDialog();
				},
				rollback: () => {
					if (!snapshot) return;
					this.store.updateItem(asistenciaId, snapshot);
					applySalidaTransitionDelta(this.store,snapshot, -1);
				},
			},
			onCommit: (result) => {
				if (!result) return;
				this.store.updateItem(asistenciaId, {
					horaSalida: result.horaSalida,
					estado: result.estado,
					rowVersion: result.rowVersion,
					origenManual: true,
					editadoManualmente: true,
				});
				this.notificarExito(fd.tipoPersona, 'actualizado', 'Salida registrada correctamente');
			},
			onError: (err) => this.errHandler.handle(err, 'registrar la salida'),
		});
	}

	// #endregion

	// #region Crear completa (CREATE optimista)

	private crearCompleta(): void {
		const fd = this.store.formData();
		if (!fd.estudianteId || !fd.sedeId || !fd.horaEntrada || !fd.horaSalida) return;

		const dto: CrearAsistenciaCompletaRequest = {
			estudianteId: fd.estudianteId,
			sedeId: fd.sedeId,
			horaEntrada: toLocalIso(fd.horaEntrada),
			horaSalida: toLocalIso(fd.horaSalida),
			observacion: fd.observacion || undefined,
			tipoPersona: fd.tipoPersona,
		};

		this.wal.execute({
			operation: 'CREATE',
			resourceType: RESOURCE,
			endpoint: `${API_BASE}/completa`,
			method: 'POST',
			payload: dto,
			http$: () => this.api.crearCompleta(dto),
			optimistic: {
				apply: () => this.store.closeDialog(),
				rollback: () => {},
			},
			onCommit: (created) => {
				if (!created) return;
				this.store.addItem(created);
				applyItemStatsDelta(this.store,created, 1);
				this.notificarExito(fd.tipoPersona, 'registrado', 'Asistencia completa registrada correctamente');
			},
			onError: (err) => this.errHandler.handle(err, 'registrar la asistencia'),
		});
	}

	// #endregion

	// #region Actualizar horas (UPDATE optimista con snapshot)

	private actualizarHoras(): void {
		const fd = this.store.formData();
		const selected = this.store.selectedItem();
		if (!selected) return;

		const asistenciaId = selected.asistenciaId;
		const snapshot = this.store.items().find((i) => i.asistenciaId === asistenciaId) ?? selected;

		const teniaHoraEntrada = !!selected.horaEntrada;
		const teniaHoraSalida = !!selected.horaSalida;
		const limpiarEntrada = teniaHoraEntrada && !fd.horaEntrada;
		const limpiarSalida = teniaHoraSalida && !fd.horaSalida;

		// En edición, timeOnly=true devuelve Date con fecha de hoy.
		// Combinar la hora editada con la fecha original del registro (hora local Perú).
		const fechaBase = new Date(selected.fecha);
		const combinarFechaHora = (hora: Date | null): string | undefined => {
			if (!hora) return undefined;
			const combined = new Date(fechaBase);
			combined.setHours(hora.getHours(), hora.getMinutes(), 0, 0);
			return toLocalIso(combined);
		};

		const horaEntradaIso = combinarFechaHora(fd.horaEntrada);
		const horaSalidaIso = combinarFechaHora(fd.horaSalida);
		const observacion = fd.observacion || undefined;

		const dto: ActualizarHorasRequest = {
			horaEntrada: horaEntradaIso,
			horaSalida: horaSalidaIso,
			limpiarEntrada: limpiarEntrada || undefined,
			limpiarSalida: limpiarSalida || undefined,
			observacion,
			rowVersion: selected.rowVersion,
			tipoPersona: selected.tipoPersona,
		};

		const nuevoEstado: 'Completa' | 'Incompleta' = horaSalidaIso ? 'Completa' : 'Incompleta';

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: RESOURCE,
			resourceId: asistenciaId,
			endpoint: `${API_BASE}/${asistenciaId}/horas`,
			method: 'PUT',
			payload: dto,
			http$: () => this.api.actualizarHoras(asistenciaId, dto),
			optimistic: {
				apply: () => {
					this.store.updateItem(asistenciaId, {
						horaEntrada: limpiarEntrada ? null : horaEntradaIso ?? snapshot.horaEntrada,
						horaSalida: limpiarSalida ? null : horaSalidaIso ?? snapshot.horaSalida,
						estado: nuevoEstado,
						observacion: observacion ?? snapshot.observacion,
						origenManual: true,
						editadoManualmente: true,
					});
					applyActualizarHorasDelta(this.store,snapshot, nuevoEstado, 1);
					this.store.closeDialog();
				},
				rollback: () => {
					this.store.updateItem(asistenciaId, snapshot);
					applyActualizarHorasDelta(this.store,snapshot, nuevoEstado, -1);
				},
			},
			onCommit: (result) => {
				if (!result) return;
				this.store.updateItem(asistenciaId, {
					horaEntrada: result.horaEntrada,
					horaSalida: result.horaSalida,
					estado: result.estado,
					observacion: result.observacion,
					rowVersion: result.rowVersion,
					origenManual: true,
					editadoManualmente: true,
				});
				this.notificarExito(selected.tipoPersona, 'actualizado', 'Horas actualizadas correctamente');
			},
			onError: (err) => this.errHandler.handle(err, 'actualizar las horas'),
		});
	}

	// #endregion

	// #region Eliminar (DELETE optimista con snapshot)

	delete(item: AsistenciaAdminLista): void {
		this.wal.execute({
			operation: 'DELETE',
			resourceType: RESOURCE,
			resourceId: item.asistenciaId,
			endpoint: `${API_BASE}/${item.asistenciaId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminar(item.asistenciaId),
			optimistic: {
				apply: () => {
					this.store.removeItem(item.asistenciaId);
					applyItemStatsDelta(this.store,item, -1);
				},
				rollback: () => {
					this.store.addItem(item);
					applyItemStatsDelta(this.store,item, 1);
				},
			},
			onCommit: () => {
				this.notificarExito(item.tipoPersona, 'eliminado', 'Registro de asistencia eliminado correctamente');
			},
			onError: (err) => this.errHandler.handle(err, 'eliminar el registro'),
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
				error: (err) => this.errHandler.handle(err, 'enviar los correos', () => {
					this.store.setEnviandoCorreos(false);
				}),
			});
	}

	// #endregion
}
