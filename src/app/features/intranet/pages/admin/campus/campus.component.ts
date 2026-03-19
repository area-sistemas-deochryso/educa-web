import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import { CampusAdminFacade } from './services/campus-admin.facade';
import { CampusPisosPanelComponent } from './components/campus-pisos-panel/campus-pisos-panel.component';
import { CampusEditorComponent } from './components/campus-editor/campus-editor.component';
import {
	CampusPisoDto,
	CampusNodoDto,
	CampusBloqueoDto,
	EditorTool,
	EditorNodeType,
	NODE_TYPE_OPTIONS,
	VERTICAL_CONNECTION_TYPE_OPTIONS,
	VerticalConnectionType,
} from './models';

@Component({
	selector: 'app-campus-admin',
	standalone: true,
	imports: [
		DecimalPipe,
		FormsModule,
		ButtonModule,
		DialogModule,
		InputTextModule,
		InputNumberModule,
		SelectModule,
		TagModule,
		ToggleSwitchModule,
		TooltipModule,
		CampusPisosPanelComponent,
		CampusEditorComponent,
	],
	templateUrl: './campus.component.html',
	styleUrl: './campus.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusComponent implements OnInit {
	// #region Dependencias

	readonly facade = inject(CampusAdminFacade);

	// #endregion

	// #region Estado del facade

	readonly vm = this.facade.vm;

	// #endregion

	// #region Estado local

	readonly nodeTypeOptions = NODE_TYPE_OPTIONS;

	readonly pisoFormNombre = signal('');
	readonly pisoFormOrden = signal(0);
	readonly pisoFormAltura = signal(3.0);

	// Node edit form
	readonly nodeFormEtiqueta = signal('');
	readonly nodeFormTipo = signal<EditorNodeType>('classroom');
	readonly nodeFormWidth = signal(0);
	readonly nodeFormHeight = signal(0);

	// Bloqueo edit form
	readonly bloqueoFormWidth = signal(80);
	readonly bloqueoFormHeight = signal(50);
	readonly bloqueoFormMotivo = signal('');

	// Vertical connection form
	readonly verticalConnectionTypeOptions = VERTICAL_CONNECTION_TYPE_OPTIONS;
	readonly verticalFormTipo = signal<VerticalConnectionType>('escalera');
	readonly verticalFormPesoSubida = signal(1.5);
	readonly verticalFormPesoBajada = signal(1.0);
	readonly verticalFormBidireccional = signal(true);
	readonly verticalFormDestPisoId = signal<number | null>(null);
	readonly verticalFormDestNodoId = signal<number | null>(null);

	/** Pisos disponibles como destino (excluye el piso actual) */
	readonly otherPisos = computed(() => {
		const currentPisoId = this.vm().selectedPisoId;
		return this.vm().pisos.filter((p) => p.id !== currentPisoId && p.estado);
	});

	// #endregion

	// #region Computed locales

	readonly tools: { tool: EditorTool; icon: string; label: string }[] = [
		{ tool: 'select', icon: 'pi pi-arrow-up-right', label: 'Seleccionar' },
		{ tool: 'addNode', icon: 'pi pi-plus-circle', label: 'Agregar nodo' },
		{ tool: 'addEdge', icon: 'pi pi-arrows-h', label: 'Conectar nodos' },
		{ tool: 'addBlock', icon: 'pi pi-ban', label: 'Agregar bloqueo' },
		{ tool: 'addVertical', icon: 'pi pi-arrows-v', label: 'Conexión vertical' },
		{ tool: 'delete', icon: 'pi pi-trash', label: 'Eliminar' },
	];

	// #endregion

	// #region Lifecycle

	ngOnInit(): void {
		this.facade.loadPisos();
	}

	// #endregion

	// #region Toolbar handlers

	onToolSelect(tool: EditorTool): void {
		this.facade.setActiveTool(tool);
	}

	onNodeTypeChange(type: EditorNodeType): void {
		this.facade.setNewNodeType(type);
	}

	// #endregion

	// #region Pisos panel handlers

	onSelectPiso(pisoId: number): void {
		this.facade.selectPiso(pisoId);
	}

	onCreatePiso(): void {
		this.pisoFormNombre.set('');
		this.pisoFormOrden.set(this.vm().pisos.length);
		this.pisoFormAltura.set(3.0);
		this.facade.openPisoDialog();
	}

	onEditPiso(piso: CampusPisoDto): void {
		this.pisoFormNombre.set(piso.nombre);
		this.pisoFormOrden.set(piso.orden);
		this.pisoFormAltura.set(piso.alturaMetros);
		this.facade.openPisoDialog(piso);
	}

	onToggleEstadoPiso(pisoId: number): void {
		this.facade.toggleEstadoPiso(pisoId);
	}

	// #endregion

	// #region Piso dialog handlers

	onPisoDialogVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closePisoDialog();
	}

	savePiso(): void {
		const dto = {
			nombre: this.pisoFormNombre(),
			orden: this.pisoFormOrden(),
			alturaMetros: this.pisoFormAltura(),
		};

		const editing = this.vm().editingPiso;
		if (editing) {
			this.facade.actualizarPiso(editing.id, dto);
		} else {
			this.facade.crearPiso(dto);
		}
	}

	// #endregion

	// #region Node dialog handlers

	openNodeEditDialog(node: CampusNodoDto): void {
		this.nodeFormEtiqueta.set(node.etiqueta ?? '');
		this.nodeFormTipo.set(node.tipo as EditorNodeType);
		this.nodeFormWidth.set(node.width);
		this.nodeFormHeight.set(node.height);
		this.facade.openNodeDialog(node);
	}

	onNodeDialogVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeNodeDialog();
	}

	saveNode(): void {
		const editing = this.vm().editingNode;
		if (!editing) return;

		this.facade.actualizarNodo(editing.id, {
			salonId: editing.salonId,
			tipo: this.nodeFormTipo(),
			etiqueta: this.nodeFormEtiqueta().trim() || null,
			x: editing.x,
			y: editing.y,
			width: this.nodeFormWidth(),
			height: this.nodeFormHeight(),
			rotation: editing.rotation,
			metadataJson: editing.metadataJson,
		});
	}

	// #endregion

	// #region Bloqueo dialog handlers

	openBloqueoEditDialog(bloqueo: CampusBloqueoDto): void {
		this.bloqueoFormWidth.set(bloqueo.width);
		this.bloqueoFormHeight.set(bloqueo.height);
		this.bloqueoFormMotivo.set(bloqueo.motivo ?? '');
		this.facade.openBloqueoDialog(bloqueo);
	}

	onBloqueoDialogVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeBloqueoDialog();
	}

	saveBloqueo(): void {
		const editing = this.vm().editingBloqueo;
		if (!editing) return;

		this.facade.actualizarBloqueo(editing.id, {
			x: editing.x,
			y: editing.y,
			width: this.bloqueoFormWidth(),
			height: this.bloqueoFormHeight(),
			motivo: this.bloqueoFormMotivo().trim() || null,
		});
	}

	// #endregion

	// #region Vertical connection dialog handlers

	onVerticalDialogVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeVerticalDialog();
	}

	onDestPisoChange(pisoId: number | null): void {
		this.verticalFormDestPisoId.set(pisoId);
		this.verticalFormDestNodoId.set(null);
		if (pisoId) {
			this.facade.loadDestPisoNodos(pisoId);
		}
	}

	saveVerticalConnection(): void {
		const startNodeId = this.vm().verticalStartNodeId;
		const destNodoId = this.verticalFormDestNodoId();
		if (!startNodeId || !destNodoId) return;

		this.facade.crearConexionVertical({
			nodoOrigenId: startNodeId,
			nodoDestinoId: destNodoId,
			tipo: this.verticalFormTipo(),
			pesoSubida: this.verticalFormPesoSubida(),
			pesoBajada: this.verticalFormPesoBajada(),
			bidireccional: this.verticalFormBidireccional(),
		});
	}

	// #endregion

	// #region Editor handlers

	onEditorClick(pos: { x: number; y: number }): void {
		this.facade.onEditorClick(pos.x, pos.y);
	}

	onNodeClick(nodeId: number): void {
		this.facade.onNodeClick(nodeId);
	}

	onNodeDblClick(nodeId: number): void {
		const node = this.vm().nodos.find((n) => n.id === nodeId);
		if (node) this.openNodeEditDialog(node);
	}

	onNodeMoved(event: { id: number; x: number; y: number }): void {
		this.facade.moveNodo(event.id, event.x, event.y);
	}

	onAristaClick(aristaId: number): void {
		this.facade.onAristaClick(aristaId);
	}

	onBloqueoClick(bloqueoId: number): void {
		this.facade.onBloqueoClick(bloqueoId);
	}

	onBloqueoDblClick(bloqueoId: number): void {
		const bloqueo = this.vm().bloqueos.find((b) => b.id === bloqueoId);
		if (bloqueo) this.openBloqueoEditDialog(bloqueo);
	}

	onBloqueoMoved(event: { id: number; x: number; y: number }): void {
		this.facade.moveBloqueo(event.id, event.x, event.y);
	}

	// #endregion
}
