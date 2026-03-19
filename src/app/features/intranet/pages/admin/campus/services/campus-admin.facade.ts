import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class CampusAdminFacade {
	private api = inject(CampusAdminApiService);
	private store = inject(CampusAdminStore);
	private errorHandler = inject(ErrorHandlerService);
	private destroyRef = inject(DestroyRef);

	// #region Exponer estado del store

	readonly vm = this.store.vm;

	// #endregion

	// #region Carga de datos

	loadPisos(): void {
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

	// #endregion

	// #region CRUD Pisos

	crearPiso(dto: CrearPisoDto): void {
		this.store.setSaving(true);
		this.api
			.crearPiso(dto)
			.pipe(
				catchError((err) => {
					logger.error('Error creando piso:', err);
					this.errorHandler.showError('Error', 'No se pudo crear el piso');
					this.store.setSaving(false);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.store.setSaving(false);
				this.store.closePisoDialog();
				this.loadPisos();
			});
	}

	actualizarPiso(id: number, dto: ActualizarPisoDto): void {
		this.store.setSaving(true);
		this.api
			.actualizarPiso(id, dto)
			.pipe(
				catchError((err) => {
					logger.error('Error actualizando piso:', err);
					this.errorHandler.showError('Error', 'No se pudo actualizar el piso');
					this.store.setSaving(false);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.store.setSaving(false);
				this.store.closePisoDialog();
				this.loadPisos();
			});
	}

	toggleEstadoPiso(id: number): void {
		this.api
			.toggleEstadoPiso(id)
			.pipe(
				catchError((err) => {
					logger.error('Error cambiando estado piso:', err);
					this.errorHandler.showError('Error', 'No se pudo cambiar el estado');
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => this.loadPisos());
	}

	// #endregion

	// #region CRUD Nodos

	crearNodo(dto: CrearNodoDto): void {
		this.store.setSaving(true);
		this.api
			.crearNodo(dto)
			.pipe(
				catchError((err) => {
					logger.error('Error creando nodo:', err);
					this.errorHandler.showError('Error', 'No se pudo crear el nodo');
					this.store.setSaving(false);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((nodo) => {
				this.store.addNodo(nodo);
				this.store.setSaving(false);
			});
	}

	actualizarNodo(id: number, dto: ActualizarNodoDto): void {
		this.store.setSaving(true);
		this.api
			.actualizarNodo(id, dto)
			.pipe(
				catchError((err) => {
					logger.error('Error actualizando nodo:', err);
					this.errorHandler.showError('Error', 'No se pudo actualizar el nodo');
					this.store.setSaving(false);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.store.updateNodo(id, dto);
				this.store.setSaving(false);
				this.store.closeNodeDialog();
			});
	}

	moveNodo(id: number, x: number, y: number): void {
		const nodo = this.store.nodos().find((n) => n.id === id);
		if (!nodo) return;

		// Optimistic local update
		this.store.updateNodo(id, { x, y });

		const dto: ActualizarNodoDto = {
			salonId: nodo.salonId,
			tipo: nodo.tipo,
			etiqueta: nodo.etiqueta,
			x,
			y,
			width: nodo.width,
			height: nodo.height,
			rotation: nodo.rotation,
			metadataJson: nodo.metadataJson,
		};

		this.api
			.actualizarNodo(id, dto)
			.pipe(
				catchError((err) => {
					logger.error('Error moviendo nodo:', err);
					// Revert on error
					this.store.updateNodo(id, { x: nodo.x, y: nodo.y });
					this.errorHandler.showError('Error', 'No se pudo mover el nodo');
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe();
	}

	eliminarNodo(id: number): void {
		this.api
			.eliminarNodo(id)
			.pipe(
				catchError((err) => {
					logger.error('Error eliminando nodo:', err);
					this.errorHandler.showError('Error', 'No se pudo eliminar el nodo');
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.store.removeNodo(id);
				this.store.clearSelection();
			});
	}

	// #endregion

	// #region CRUD Aristas

	crearArista(dto: CrearAristaDto): void {
		this.store.setSaving(true);
		this.api
			.crearArista(dto)
			.pipe(
				catchError((err) => {
					logger.error('Error creando arista:', err);
					this.errorHandler.showError('Error', 'No se pudo crear la conexión');
					this.store.setSaving(false);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((arista) => {
				this.store.addArista(arista);
				this.store.setSaving(false);
				this.store.setEdgeStartNodeId(null);
			});
	}

	eliminarArista(id: number): void {
		this.api
			.eliminarArista(id)
			.pipe(
				catchError((err) => {
					logger.error('Error eliminando arista:', err);
					this.errorHandler.showError('Error', 'No se pudo eliminar la conexión');
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.store.removeArista(id);
				this.store.clearSelection();
			});
	}

	// #endregion

	// #region CRUD Bloqueos

	crearBloqueo(dto: CrearBloqueoDto): void {
		this.store.setSaving(true);
		this.api
			.crearBloqueo(dto)
			.pipe(
				catchError((err) => {
					logger.error('Error creando bloqueo:', err);
					this.errorHandler.showError('Error', 'No se pudo crear el bloqueo');
					this.store.setSaving(false);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((bloqueo) => {
				this.store.addBloqueo(bloqueo);
				this.store.setSaving(false);
			});
	}

	actualizarBloqueo(id: number, dto: ActualizarBloqueoDto): void {
		this.store.setSaving(true);
		this.api
			.actualizarBloqueo(id, dto)
			.pipe(
				catchError((err) => {
					logger.error('Error actualizando bloqueo:', err);
					this.errorHandler.showError('Error', 'No se pudo actualizar el bloqueo');
					this.store.setSaving(false);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.store.updateBloqueo(id, dto);
				this.store.setSaving(false);
				this.store.closeBloqueoDialog();
			});
	}

	moveBloqueo(id: number, x: number, y: number): void {
		const bloqueo = this.store.bloqueos().find((b) => b.id === id);
		if (!bloqueo) return;

		// Optimistic local update
		this.store.updateBloqueo(id, { x, y });

		const dto: ActualizarBloqueoDto = {
			x,
			y,
			width: bloqueo.width,
			height: bloqueo.height,
			motivo: bloqueo.motivo,
		};

		this.api
			.actualizarBloqueo(id, dto)
			.pipe(
				catchError((err) => {
					logger.error('Error moviendo bloqueo:', err);
					// Revert on error
					this.store.updateBloqueo(id, { x: bloqueo.x, y: bloqueo.y });
					this.errorHandler.showError('Error', 'No se pudo mover el bloqueo');
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe();
	}

	eliminarBloqueo(id: number): void {
		this.api
			.eliminarBloqueo(id)
			.pipe(
				catchError((err) => {
					logger.error('Error eliminando bloqueo:', err);
					this.errorHandler.showError('Error', 'No se pudo eliminar el bloqueo');
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.store.removeBloqueo(id);
				this.store.clearSelection();
			});
	}

	// #endregion

	// #region CRUD Conexiones Verticales

	crearConexionVertical(dto: CrearConexionVerticalDto): void {
		this.store.setSaving(true);
		this.api
			.crearConexionVertical(dto)
			.pipe(
				catchError((err) => {
					logger.error('Error creando conexión vertical:', err);
					this.errorHandler.showError('Error', 'No se pudo crear la conexión vertical');
					this.store.setSaving(false);
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((conexion) => {
				this.store.addConexionVertical(conexion);
				this.store.setSaving(false);
				this.store.closeVerticalDialog();
				this.store.setVerticalStartNodeId(null);
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

	eliminarConexionVertical(id: number): void {
		this.api
			.eliminarConexionVertical(id)
			.pipe(
				catchError((err) => {
					logger.error('Error eliminando conexión vertical:', err);
					this.errorHandler.showError('Error', 'No se pudo eliminar la conexión vertical');
					return EMPTY;
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.store.removeConexionVertical(id);
				this.store.clearSelection();
			});
	}

	// #endregion

	// #region Comandos de editor

	setActiveTool(tool: import('../models').EditorTool): void {
		this.store.setActiveTool(tool);
	}

	setNewNodeType(type: import('../models').EditorNodeType): void {
		this.store.setNewNodeType(type);
	}

	onEditorClick(x: number, y: number): void {
		const tool = this.store.activeTool();
		const pisoId = this.store.selectedPisoId();
		if (!pisoId) return;

		if (tool === 'addNode') {
			const tipo = this.store.newNodeType();
			this.crearNodo({
				pisoId,
				salonId: null,
				tipo,
				etiqueta: null,
				x: Math.round(x),
				y: Math.round(y),
				width: tipo === 'corridor' ? 0 : 90,
				height: tipo === 'corridor' ? 0 : 60,
				rotation: 0,
				metadataJson: null,
			});
		} else if (tool === 'addBlock') {
			this.crearBloqueo({
				pisoId,
				x: Math.round(x) - 40,
				y: Math.round(y) - 25,
				width: 80,
				height: 50,
				motivo: null,
			});
		}
	}

	onNodeClick(nodeId: number): void {
		const tool = this.store.activeTool();

		if (tool === 'select') {
			this.store.setSelectedNodeId(nodeId);
		} else if (tool === 'addEdge') {
			const startId = this.store.edgeStartNodeId();
			if (!startId) {
				this.store.setEdgeStartNodeId(nodeId);
			} else if (startId !== nodeId) {
				const nodos = this.store.nodos();
				const origen = nodos.find((n) => n.id === startId);
				const destino = nodos.find((n) => n.id === nodeId);
				const distancia =
					origen && destino
						? Math.round(Math.sqrt(Math.pow(destino.x - origen.x, 2) + Math.pow(destino.y - origen.y, 2)) * 10) / 10
						: 1.0;
				this.crearArista({
					nodoOrigenId: startId,
					nodoDestinoId: nodeId,
					peso: distancia,
					bidireccional: true,
				});
			}
		} else if (tool === 'addVertical') {
			// Click a node → set as start and open dialog to select destination piso/node
			this.store.setVerticalStartNodeId(nodeId);
			this.store.openVerticalDialog();
		} else if (tool === 'delete') {
			this.eliminarNodo(nodeId);
		}
	}

	onAristaClick(aristaId: number): void {
		const tool = this.store.activeTool();
		if (tool === 'select') {
			this.store.setSelectedAristaId(aristaId);
		} else if (tool === 'delete') {
			this.eliminarArista(aristaId);
		}
	}

	onBloqueoClick(bloqueoId: number): void {
		const tool = this.store.activeTool();
		if (tool === 'select') {
			this.store.setSelectedBloqueoId(bloqueoId);
		} else if (tool === 'delete') {
			this.eliminarBloqueo(bloqueoId);
		}
	}

	onConexionVerticalClick(conexionId: number): void {
		const tool = this.store.activeTool();
		if (tool === 'select') {
			this.store.setSelectedConexionVerticalId(conexionId);
		} else if (tool === 'delete') {
			this.eliminarConexionVertical(conexionId);
		}
	}

	// #endregion

	// #region Comandos de UI

	openPisoDialog(piso?: import('../models').CampusPisoDto): void {
		this.store.openPisoDialog(piso);
	}

	closePisoDialog(): void {
		this.store.closePisoDialog();
	}

	openNodeDialog(node?: import('../models').CampusNodoDto): void {
		this.store.openNodeDialog(node);
	}

	closeNodeDialog(): void {
		this.store.closeNodeDialog();
	}

	openBloqueoDialog(bloqueo?: import('../models').CampusBloqueoDto): void {
		this.store.openBloqueoDialog(bloqueo);
	}

	closeBloqueoDialog(): void {
		this.store.closeBloqueoDialog();
	}

	openVerticalDialog(): void {
		this.store.openVerticalDialog();
	}

	closeVerticalDialog(): void {
		this.store.closeVerticalDialog();
		this.store.setVerticalStartNodeId(null);
	}

	// #endregion
}
