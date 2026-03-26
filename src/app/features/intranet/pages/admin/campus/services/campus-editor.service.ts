import { Injectable, inject } from '@angular/core';

import type { EditorNodeType, EditorTool } from '../models';
import { CampusAdminStore } from './campus-admin.store';

/**
 * Encapsula la lógica de interacción del editor de campus.
 * Traduce clicks del usuario en intenciones según la herramienta activa.
 *
 * No hace HTTP ni maneja estado — solo decide qué operación ejecutar.
 */
@Injectable({ providedIn: 'root' })
export class CampusEditorService {
	private store = inject(CampusAdminStore);

	// #region Tool state

	setActiveTool(tool: EditorTool): void {
		this.store.setActiveTool(tool);
	}

	setNewNodeType(type: EditorNodeType): void {
		this.store.setNewNodeType(type);
	}

	// #endregion

	// #region Click resolution

	/**
	 * Resuelve un click en el canvas según la herramienta activa.
	 * Retorna la intención para que el facade la ejecute.
	 */
	resolveCanvasClick(x: number, y: number): CanvasClickResult | null {
		const tool = this.store.activeTool();
		const pisoId = this.store.selectedPisoId();
		if (!pisoId) return null;

		if (tool === 'addNode') {
			const tipo = this.store.newNodeType();
			return {
				action: 'createNode',
				data: {
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
				},
			};
		} else if (tool === 'addBlock') {
			return {
				action: 'createBlock',
				data: {
					pisoId,
					x: Math.round(x) - 40,
					y: Math.round(y) - 25,
					width: 80,
					height: 50,
					motivo: null,
				},
			};
		}

		return null;
	}

	/**
	 * Resuelve un click en un nodo según la herramienta activa.
	 */
	resolveNodeClick(nodeId: number): NodeClickResult | null {
		const tool = this.store.activeTool();

		if (tool === 'select') {
			this.store.setSelectedNodeId(nodeId);
			return null;
		} else if (tool === 'addEdge') {
			return this.resolveEdgeCreation(nodeId);
		} else if (tool === 'addVertical') {
			this.store.setVerticalStartNodeId(nodeId);
			this.store.openVerticalDialog();
			return null;
		} else if (tool === 'delete') {
			return { action: 'deleteNode', nodeId };
		}

		return null;
	}

	/**
	 * Resuelve un click en una arista según la herramienta activa.
	 */
	resolveAristaClick(aristaId: number): { action: 'deleteEdge'; aristaId: number } | null {
		const tool = this.store.activeTool();
		if (tool === 'select') {
			this.store.setSelectedAristaId(aristaId);
			return null;
		} else if (tool === 'delete') {
			return { action: 'deleteEdge', aristaId };
		}
		return null;
	}

	/**
	 * Resuelve un click en un bloqueo según la herramienta activa.
	 */
	resolveBloqueoClick(bloqueoId: number): { action: 'deleteBlock'; bloqueoId: number } | null {
		const tool = this.store.activeTool();
		if (tool === 'select') {
			this.store.setSelectedBloqueoId(bloqueoId);
			return null;
		} else if (tool === 'delete') {
			return { action: 'deleteBlock', bloqueoId };
		}
		return null;
	}

	/**
	 * Resuelve un click en una conexión vertical según la herramienta activa.
	 */
	resolveConexionVerticalClick(conexionId: number): { action: 'deleteVertical'; conexionId: number } | null {
		const tool = this.store.activeTool();
		if (tool === 'select') {
			this.store.setSelectedConexionVerticalId(conexionId);
			return null;
		} else if (tool === 'delete') {
			return { action: 'deleteVertical', conexionId };
		}
		return null;
	}

	// #endregion

	// #region Private helpers

	private resolveEdgeCreation(nodeId: number): NodeClickResult | null {
		const startId = this.store.edgeStartNodeId();
		if (!startId) {
			this.store.setEdgeStartNodeId(nodeId);
			return null;
		}

		if (startId === nodeId) return null;

		const nodos = this.store.nodos();
		const origen = nodos.find((n) => n.id === startId);
		const destino = nodos.find((n) => n.id === nodeId);
		const distancia =
			origen && destino
				? Math.round(Math.sqrt(Math.pow(destino.x - origen.x, 2) + Math.pow(destino.y - origen.y, 2)) * 10) / 10
				: 1.0;

		return {
			action: 'createEdge',
			data: {
				nodoOrigenId: startId,
				nodoDestinoId: nodeId,
				peso: distancia,
				bidireccional: true,
			},
		};
	}

	// #endregion
}

// #region Result types

export type CanvasClickResult =
	| { action: 'createNode'; data: import('../models').CrearNodoDto }
	| { action: 'createBlock'; data: import('../models').CrearBloqueoDto };

export type NodeClickResult =
	| { action: 'deleteNode'; nodeId: number }
	| { action: 'createEdge'; data: import('../models').CrearAristaDto };

// #endregion
