import { inject, Injectable } from '@angular/core';

import {
	CampusBloqueoDto,
	CampusNodoDto,
	CampusPisoDto,
	EditorNodeType,
	EditorTool,
} from '../models';
import { CampusAdminFacade } from './campus-admin.facade';
import { CampusAdminStore } from './campus-admin.store';
import { CampusEditorService } from './campus-editor.service';

/**
 * UI facade para el editor de campus.
 * Agrupa comandos de dialogs, herramienta activa y resolvers de clicks del editor.
 * La lógica CRUD/carga vive en CampusAdminFacade.
 */
@Injectable({ providedIn: 'root' })
export class CampusAdminUiFacade {
	private store = inject(CampusAdminStore);
	private editor = inject(CampusEditorService);
	private crud = inject(CampusAdminFacade);

	// #region Editor tool

	setActiveTool(tool: EditorTool): void {
		this.editor.setActiveTool(tool);
	}

	setNewNodeType(type: EditorNodeType): void {
		this.editor.setNewNodeType(type);
	}

	// #endregion

	// #region Editor click resolvers
	// Resuelven qué acción dispara cada click según la herramienta activa y delegan al CRUD.

	onEditorClick(x: number, y: number): void {
		const result = this.editor.resolveCanvasClick(x, y);
		if (!result) return;
		if (result.action === 'createNode') this.crud.crearNodo(result.data);
		else if (result.action === 'createBlock') this.crud.crearBloqueo(result.data);
	}

	onNodeClick(nodeId: number): void {
		const result = this.editor.resolveNodeClick(nodeId);
		if (!result) return;
		if (result.action === 'deleteNode') this.crud.eliminarNodo(result.nodeId);
		else if (result.action === 'createEdge') this.crud.crearArista(result.data);
	}

	onAristaClick(aristaId: number): void {
		const result = this.editor.resolveAristaClick(aristaId);
		if (result) this.crud.eliminarArista(result.aristaId);
	}

	onBloqueoClick(bloqueoId: number): void {
		const result = this.editor.resolveBloqueoClick(bloqueoId);
		if (result) this.crud.eliminarBloqueo(result.bloqueoId);
	}

	onConexionVerticalClick(conexionId: number): void {
		const result = this.editor.resolveConexionVerticalClick(conexionId);
		if (result) this.crud.eliminarConexionVertical(result.conexionId);
	}

	// #endregion

	// #region Dialogs

	openPisoDialog(piso?: CampusPisoDto): void {
		this.store.openPisoDialog(piso);
	}

	closePisoDialog(): void {
		this.store.closePisoDialog();
	}

	openNodeDialog(node?: CampusNodoDto): void {
		this.store.openNodeDialog(node);
	}

	closeNodeDialog(): void {
		this.store.closeNodeDialog();
	}

	openBloqueoDialog(bloqueo?: CampusBloqueoDto): void {
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
