import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, Observable } from 'rxjs';

import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';

import {
	CrearPisoDto,
	ActualizarPisoDto,
	CrearNodoDto,
	ActualizarNodoDto,
	CrearAristaDto,
	CrearBloqueoDto,
	ActualizarBloqueoDto,
	CrearConexionVerticalDto,
} from '../models';
import { CampusAdminApiService } from './campus-admin-api.service';
import { CampusAdminStore } from './campus-admin.store';

interface CrudOptions<T> {
	apiCall: Observable<T>;
	onSuccess: (result: T) => void;
	errorMsg: string;
	onError?: () => void;
	saving?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CampusAdminFacade {
	private api = inject(CampusAdminApiService);
	private store = inject(CampusAdminStore);
	private errorHandler = inject(ErrorHandlerService);
	private destroyRef = inject(DestroyRef);

	// #region Exponer estado del store

	readonly vm = this.store.vm;

	// #endregion

	// #region Ejecución genérica

	/**
	 * Ejecuta una operación CRUD con manejo uniforme de saving, error y cleanup.
	 * La orquestación (qué hacer) vive en cada método público.
	 * La ejecución (cómo hacerlo) vive aquí.
	 */
	private executeCrud<T>({ apiCall, onSuccess, errorMsg, onError, saving = true }: CrudOptions<T>): void {
		if (saving) this.store.setSaving(true);

		apiCall
			.pipe(
				catchError((err) => {
					logger.error(`Error: ${errorMsg}`, err);
					this.errorHandler.showError('Error', errorMsg);
					if (saving) this.store.setSaving(false);
					onError?.();
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				onSuccess(result);
				if (saving) this.store.setSaving(false);
			});
	}

	// #endregion

	// #region Carga de datos

	loadPisos(): void {
		if (this.store.loading()) return;
		this.store.setLoading(true);

		this.api
			.listarPisos()
			.pipe(
				withRetry({ tag: 'CampusAdmin:loadPisos' }),
				catchError((err) => {
					logger.error('Error cargando pisos:', err);
					this.errorHandler.showError('Error', 'No se pudieron cargar los pisos');
					this.store.setLoading(false);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((pisos) => {
				this.store.setPisos(pisos);
				this.store.setLoading(false);

				// Auto-seleccionar primer piso
				if (pisos.length > 0 && !this.store.selectedPisoId()) {
					this.selectPiso(pisos[0].id);
				}
			});
	}

	selectPiso(pisoId: number): void {
		this.store.setSelectedPisoId(pisoId);
		this.loadPisoCompleto(pisoId);
	}

	private loadPisoCompleto(pisoId: number): void {
		if (this.store.editorLoading()) return;
		this.store.setEditorLoading(true);

		this.api
			.getPisoCompleto(pisoId)
			.pipe(
				withRetry({ tag: 'CampusAdmin:loadPisoCompleto' }),
				catchError((err) => {
					logger.error('Error cargando piso completo:', err);
					this.errorHandler.showError('Error', 'No se pudo cargar el piso');
					this.store.setEditorLoading(false);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((piso) => {
				this.store.setPisoCompleto(piso);
				this.store.setEditorLoading(false);
			});
	}

	loadDestPisoNodos(pisoId: number): void {
		this.store.setDestPisoLoading(true);

		this.api
			.getPisoCompleto(pisoId)
			.pipe(
				catchError((err) => {
					logger.error('Error cargando nodos del piso destino:', err);
					this.store.setDestPisoLoading(false);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((piso) => {
				this.store.setDestPisoNodos(piso.nodos);
				this.store.setDestPisoLoading(false);
			});
	}

	// #endregion

	// #region CRUD Pisos

	crearPiso(dto: CrearPisoDto): void {
		this.executeCrud({
			apiCall: this.api.crearPiso(dto),
			onSuccess: () => { this.store.closePisoDialog(); this.loadPisos(); },
			errorMsg: 'No se pudo crear el piso',
		});
	}

	actualizarPiso(id: number, dto: ActualizarPisoDto): void {
		this.executeCrud({
			apiCall: this.api.actualizarPiso(id, dto),
			onSuccess: () => { this.store.updatePiso(id, dto); this.store.closePisoDialog(); },
			errorMsg: 'No se pudo actualizar el piso',
		});
	}

	toggleEstadoPiso(id: number): void {
		this.executeCrud({
			apiCall: this.api.toggleEstadoPiso(id),
			onSuccess: () => this.store.togglePisoEstado(id),
			errorMsg: 'No se pudo cambiar el estado',
			saving: false,
		});
	}

	// #endregion

	// #region CRUD Nodos

	crearNodo(dto: CrearNodoDto): void {
		this.executeCrud({
			apiCall: this.api.crearNodo(dto),
			onSuccess: (nodo) => this.store.addNodo(nodo),
			errorMsg: 'No se pudo crear el nodo',
		});
	}

	actualizarNodo(id: number, dto: ActualizarNodoDto): void {
		this.executeCrud({
			apiCall: this.api.actualizarNodo(id, dto),
			onSuccess: () => { this.store.updateNodo(id, dto); this.store.closeNodeDialog(); },
			errorMsg: 'No se pudo actualizar el nodo',
		});
	}

	moveNodo(id: number, x: number, y: number): void {
		const nodo = this.store.nodos().find((n) => n.id === id);
		if (!nodo) return;

		// Optimistic local update
		this.store.updateNodo(id, { x, y });

		this.executeCrud({
			apiCall: this.api.actualizarNodo(id, {
				salonId: nodo.salonId,
				tipo: nodo.tipo,
				etiqueta: nodo.etiqueta,
				x,
				y,
				width: nodo.width,
				height: nodo.height,
				rotation: nodo.rotation,
				metadataJson: nodo.metadataJson,
			}),
			onSuccess: () => {},
			onError: () => this.store.updateNodo(id, { x: nodo.x, y: nodo.y }),
			errorMsg: 'No se pudo mover el nodo',
			saving: false,
		});
	}

	eliminarNodo(id: number): void {
		this.executeCrud({
			apiCall: this.api.eliminarNodo(id),
			onSuccess: () => { this.store.removeNodo(id); this.store.clearSelection(); },
			errorMsg: 'No se pudo eliminar el nodo',
			saving: false,
		});
	}

	// #endregion

	// #region CRUD Aristas

	crearArista(dto: CrearAristaDto): void {
		this.executeCrud({
			apiCall: this.api.crearArista(dto),
			onSuccess: (arista) => { this.store.addArista(arista); this.store.setEdgeStartNodeId(null); },
			errorMsg: 'No se pudo crear la conexión',
		});
	}

	eliminarArista(id: number): void {
		this.executeCrud({
			apiCall: this.api.eliminarArista(id),
			onSuccess: () => { this.store.removeArista(id); this.store.clearSelection(); },
			errorMsg: 'No se pudo eliminar la conexión',
			saving: false,
		});
	}

	// #endregion

	// #region CRUD Bloqueos

	crearBloqueo(dto: CrearBloqueoDto): void {
		this.executeCrud({
			apiCall: this.api.crearBloqueo(dto),
			onSuccess: (bloqueo) => this.store.addBloqueo(bloqueo),
			errorMsg: 'No se pudo crear el bloqueo',
		});
	}

	actualizarBloqueo(id: number, dto: ActualizarBloqueoDto): void {
		this.executeCrud({
			apiCall: this.api.actualizarBloqueo(id, dto),
			onSuccess: () => { this.store.updateBloqueo(id, dto); this.store.closeBloqueoDialog(); },
			errorMsg: 'No se pudo actualizar el bloqueo',
		});
	}

	moveBloqueo(id: number, x: number, y: number): void {
		const bloqueo = this.store.bloqueos().find((b) => b.id === id);
		if (!bloqueo) return;

		// Optimistic local update
		this.store.updateBloqueo(id, { x, y });

		this.executeCrud({
			apiCall: this.api.actualizarBloqueo(id, {
				x,
				y,
				width: bloqueo.width,
				height: bloqueo.height,
				motivo: bloqueo.motivo,
			}),
			onSuccess: () => {},
			onError: () => this.store.updateBloqueo(id, { x: bloqueo.x, y: bloqueo.y }),
			errorMsg: 'No se pudo mover el bloqueo',
			saving: false,
		});
	}

	eliminarBloqueo(id: number): void {
		this.executeCrud({
			apiCall: this.api.eliminarBloqueo(id),
			onSuccess: () => { this.store.removeBloqueo(id); this.store.clearSelection(); },
			errorMsg: 'No se pudo eliminar el bloqueo',
			saving: false,
		});
	}

	// #endregion

	// #region CRUD Conexiones Verticales

	crearConexionVertical(dto: CrearConexionVerticalDto): void {
		this.executeCrud({
			apiCall: this.api.crearConexionVertical(dto),
			onSuccess: (conexion) => {
				this.store.addConexionVertical(conexion);
				this.store.closeVerticalDialog();
				this.store.setVerticalStartNodeId(null);
			},
			errorMsg: 'No se pudo crear la conexión vertical',
		});
	}

	eliminarConexionVertical(id: number): void {
		this.executeCrud({
			apiCall: this.api.eliminarConexionVertical(id),
			onSuccess: () => { this.store.removeConexionVertical(id); this.store.clearSelection(); },
			errorMsg: 'No se pudo eliminar la conexión vertical',
			saving: false,
		});
	}

	// #endregion
}
