/* eslint-disable max-lines -- Razón: store de editor 3D con ~15 signals de estado + setters expandidos. Candidato a split por dominio (piso/nodo/arista) si crece. */
import { computed, Injectable, signal } from '@angular/core';

import {
	CampusPisoDto,
	CampusPisoCompletoDto,
	CampusNodoDto,
	CampusAristaDto,
	CampusBloqueoDto,
	CampusConexionVerticalDto,
	EditorTool,
	EditorNodeType,
} from '../models';

@Injectable({ providedIn: 'root' })
export class CampusAdminStore {
	// #region Estado privado

	private readonly _pisos = signal<CampusPisoDto[]>([]);
	private readonly _selectedPisoId = signal<number | null>(null);
	private readonly _pisoCompleto = signal<CampusPisoCompletoDto | null>(null);
	private readonly _loading = signal(false);
	private readonly _editorLoading = signal(false);
	private readonly _saving = signal(false);

	// Editor state
	private readonly _activeTool = signal<EditorTool>('select');
	private readonly _selectedNodeId = signal<number | null>(null);
	private readonly _selectedAristaId = signal<number | null>(null);
	private readonly _selectedBloqueoId = signal<number | null>(null);
	private readonly _selectedConexionVerticalId = signal<number | null>(null);
	private readonly _newNodeType = signal<EditorNodeType>('classroom');
	private readonly _edgeStartNodeId = signal<number | null>(null);
	private readonly _verticalStartNodeId = signal<number | null>(null);

	// Dialog state
	private readonly _pisoDialogVisible = signal(false);
	private readonly _editingPiso = signal<CampusPisoDto | null>(null);
	private readonly _nodeDialogVisible = signal(false);
	private readonly _editingNode = signal<CampusNodoDto | null>(null);
	private readonly _bloqueoDialogVisible = signal(false);
	private readonly _editingBloqueo = signal<CampusBloqueoDto | null>(null);
	private readonly _verticalDialogVisible = signal(false);
	private readonly _editingConexionVertical = signal<CampusConexionVerticalDto | null>(null);
	private readonly _destPisoNodos = signal<CampusNodoDto[]>([]);
	private readonly _destPisoLoading = signal(false);

	// #endregion

	// #region Lecturas públicas (readonly)

	readonly pisos = this._pisos.asReadonly();
	readonly selectedPisoId = this._selectedPisoId.asReadonly();
	readonly pisoCompleto = this._pisoCompleto.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly editorLoading = this._editorLoading.asReadonly();
	readonly saving = this._saving.asReadonly();

	readonly activeTool = this._activeTool.asReadonly();
	readonly selectedNodeId = this._selectedNodeId.asReadonly();
	readonly selectedAristaId = this._selectedAristaId.asReadonly();
	readonly selectedBloqueoId = this._selectedBloqueoId.asReadonly();
	readonly selectedConexionVerticalId = this._selectedConexionVerticalId.asReadonly();
	readonly newNodeType = this._newNodeType.asReadonly();
	readonly edgeStartNodeId = this._edgeStartNodeId.asReadonly();
	readonly verticalStartNodeId = this._verticalStartNodeId.asReadonly();

	readonly pisoDialogVisible = this._pisoDialogVisible.asReadonly();
	readonly editingPiso = this._editingPiso.asReadonly();
	readonly nodeDialogVisible = this._nodeDialogVisible.asReadonly();
	readonly editingNode = this._editingNode.asReadonly();
	readonly bloqueoDialogVisible = this._bloqueoDialogVisible.asReadonly();
	readonly editingBloqueo = this._editingBloqueo.asReadonly();
	readonly verticalDialogVisible = this._verticalDialogVisible.asReadonly();
	readonly editingConexionVertical = this._editingConexionVertical.asReadonly();
	readonly destPisoNodos = this._destPisoNodos.asReadonly();
	readonly destPisoLoading = this._destPisoLoading.asReadonly();

	// #endregion

	// #region Computed

	readonly selectedPiso = computed(() => {
		const id = this._selectedPisoId();
		return this._pisos().find((p) => p.id === id) ?? null;
	});

	readonly nodos = computed(() => this._pisoCompleto()?.nodos ?? []);
	readonly aristas = computed(() => this._pisoCompleto()?.aristas ?? []);
	readonly bloqueos = computed(() => this._pisoCompleto()?.bloqueos ?? []);
	readonly conexionesVerticales = computed(() => this._pisoCompleto()?.conexionesVerticales ?? []);

	readonly selectedNode = computed(() => {
		const id = this._selectedNodeId();
		return id ? (this.nodos().find((n) => n.id === id) ?? null) : null;
	});

	readonly selectedArista = computed(() => {
		const id = this._selectedAristaId();
		return id ? (this.aristas().find((a) => a.id === id) ?? null) : null;
	});

	readonly selectedBloqueo = computed(() => {
		const id = this._selectedBloqueoId();
		return id ? (this.bloqueos().find((b) => b.id === id) ?? null) : null;
	});

	readonly selectedConexionVertical = computed(() => {
		const id = this._selectedConexionVerticalId();
		return id ? (this.conexionesVerticales().find((c) => c.id === id) ?? null) : null;
	});

	/** Nodos de tipo escalera/ascensor/rampa que tienen conexiones verticales */
	readonly nodosConConexionVertical = computed(() => {
		const conexiones = this.conexionesVerticales();
		const ids = new Set<number>();
		for (const c of conexiones) {
			ids.add(c.nodoOrigenId);
			ids.add(c.nodoDestinoId);
		}
		return ids;
	});

	readonly hasPisos = computed(() => this._pisos().length > 0);

	readonly vm = computed(() => ({
		pisos: this._pisos(),
		selectedPisoId: this._selectedPisoId(),
		selectedPiso: this.selectedPiso(),
		pisoCompleto: this._pisoCompleto(),
		loading: this._loading(),
		editorLoading: this._editorLoading(),
		saving: this._saving(),
		hasPisos: this.hasPisos(),

		activeTool: this._activeTool(),
		selectedNodeId: this._selectedNodeId(),
		selectedAristaId: this._selectedAristaId(),
		selectedBloqueoId: this._selectedBloqueoId(),
		selectedConexionVerticalId: this._selectedConexionVerticalId(),
		newNodeType: this._newNodeType(),
		edgeStartNodeId: this._edgeStartNodeId(),
		verticalStartNodeId: this._verticalStartNodeId(),

		nodos: this.nodos(),
		aristas: this.aristas(),
		bloqueos: this.bloqueos(),
		conexionesVerticales: this.conexionesVerticales(),
		selectedNode: this.selectedNode(),
		selectedArista: this.selectedArista(),
		selectedBloqueo: this.selectedBloqueo(),
		selectedConexionVertical: this.selectedConexionVertical(),
		nodosConConexionVertical: this.nodosConConexionVertical(),

		pisoDialogVisible: this._pisoDialogVisible(),
		editingPiso: this._editingPiso(),
		nodeDialogVisible: this._nodeDialogVisible(),
		editingNode: this._editingNode(),
		bloqueoDialogVisible: this._bloqueoDialogVisible(),
		editingBloqueo: this._editingBloqueo(),
		verticalDialogVisible: this._verticalDialogVisible(),
		editingConexionVertical: this._editingConexionVertical(),
		destPisoNodos: this._destPisoNodos(),
		destPisoLoading: this._destPisoLoading(),
	}));

	// #endregion

	// #region Comandos de mutación

	setPisos(pisos: CampusPisoDto[]): void {
		this._pisos.set(pisos);
	}
	setSelectedPisoId(id: number | null): void {
		this._selectedPisoId.set(id);
	}
	setPisoCompleto(piso: CampusPisoCompletoDto | null): void {
		this._pisoCompleto.set(piso);
	}
	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}
	setEditorLoading(loading: boolean): void {
		this._editorLoading.set(loading);
	}
	setSaving(saving: boolean): void {
		this._saving.set(saving);
	}

	updatePiso(id: number, updates: Partial<CampusPisoDto>): void {
		this._pisos.update((pisos) =>
			pisos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
		);
	}

	togglePisoEstado(id: number): void {
		this._pisos.update((pisos) =>
			pisos.map((p) => (p.id === id ? { ...p, estado: !p.estado } : p)),
		);
	}

	// #endregion

	// #region Comandos de editor

	setActiveTool(tool: EditorTool): void {
		this._activeTool.set(tool);
		this.clearSelection();
		if (tool !== 'addEdge') this._edgeStartNodeId.set(null);
		if (tool !== 'addVertical') this._verticalStartNodeId.set(null);
	}

	setSelectedNodeId(id: number | null): void {
		this._selectedNodeId.set(id);
		this._selectedAristaId.set(null);
		this._selectedBloqueoId.set(null);
		this._selectedConexionVerticalId.set(null);
	}

	setSelectedAristaId(id: number | null): void {
		this._selectedAristaId.set(id);
		this._selectedNodeId.set(null);
		this._selectedBloqueoId.set(null);
		this._selectedConexionVerticalId.set(null);
	}

	setSelectedBloqueoId(id: number | null): void {
		this._selectedBloqueoId.set(id);
		this._selectedNodeId.set(null);
		this._selectedAristaId.set(null);
		this._selectedConexionVerticalId.set(null);
	}

	setSelectedConexionVerticalId(id: number | null): void {
		this._selectedConexionVerticalId.set(id);
		this._selectedNodeId.set(null);
		this._selectedAristaId.set(null);
		this._selectedBloqueoId.set(null);
	}

	setNewNodeType(type: EditorNodeType): void {
		this._newNodeType.set(type);
	}
	setEdgeStartNodeId(id: number | null): void {
		this._edgeStartNodeId.set(id);
	}
	setVerticalStartNodeId(id: number | null): void {
		this._verticalStartNodeId.set(id);
	}

	clearSelection(): void {
		this._selectedNodeId.set(null);
		this._selectedAristaId.set(null);
		this._selectedBloqueoId.set(null);
		this._selectedConexionVerticalId.set(null);
	}

	// #endregion

	// #region Comandos de UI (diálogos)

	openPisoDialog(piso?: CampusPisoDto): void {
		this._editingPiso.set(piso ?? null);
		this._pisoDialogVisible.set(true);
	}

	closePisoDialog(): void {
		this._pisoDialogVisible.set(false);
		this._editingPiso.set(null);
	}

	openNodeDialog(node?: CampusNodoDto): void {
		this._editingNode.set(node ?? null);
		this._nodeDialogVisible.set(true);
	}

	closeNodeDialog(): void {
		this._nodeDialogVisible.set(false);
		this._editingNode.set(null);
	}

	openBloqueoDialog(bloqueo?: CampusBloqueoDto): void {
		this._editingBloqueo.set(bloqueo ?? null);
		this._bloqueoDialogVisible.set(true);
	}

	closeBloqueoDialog(): void {
		this._bloqueoDialogVisible.set(false);
		this._editingBloqueo.set(null);
	}

	openVerticalDialog(conexion?: CampusConexionVerticalDto): void {
		this._editingConexionVertical.set(conexion ?? null);
		this._verticalDialogVisible.set(true);
	}

	closeVerticalDialog(): void {
		this._verticalDialogVisible.set(false);
		this._editingConexionVertical.set(null);
		this._destPisoNodos.set([]);
	}

	setDestPisoNodos(nodos: CampusNodoDto[]): void {
		this._destPisoNodos.set(nodos);
	}
	setDestPisoLoading(loading: boolean): void {
		this._destPisoLoading.set(loading);
	}

	// #endregion

	// #region Mutaciones quirúrgicas

	addNodo(nodo: CampusNodoDto): void {
		const piso = this._pisoCompleto();
		if (!piso) return;
		this._pisoCompleto.set({ ...piso, nodos: [...piso.nodos, nodo] });
	}

	updateNodo(id: number, updates: Partial<CampusNodoDto>): void {
		const piso = this._pisoCompleto();
		if (!piso) return;
		this._pisoCompleto.set({
			...piso,
			nodos: piso.nodos.map((n) => (n.id === id ? { ...n, ...updates } : n)),
		});
	}

	removeNodo(id: number): void {
		const piso = this._pisoCompleto();
		if (!piso) return;
		this._pisoCompleto.set({
			...piso,
			nodos: piso.nodos.filter((n) => n.id !== id),
			// Also remove aristas connected to this node
			aristas: piso.aristas.filter((a) => a.nodoOrigenId !== id && a.nodoDestinoId !== id),
			// Also remove vertical connections connected to this node
			conexionesVerticales: piso.conexionesVerticales.filter(
				(c) => c.nodoOrigenId !== id && c.nodoDestinoId !== id,
			),
		});
	}

	addArista(arista: CampusAristaDto): void {
		const piso = this._pisoCompleto();
		if (!piso) return;
		this._pisoCompleto.set({ ...piso, aristas: [...piso.aristas, arista] });
	}

	removeArista(id: number): void {
		const piso = this._pisoCompleto();
		if (!piso) return;
		this._pisoCompleto.set({
			...piso,
			aristas: piso.aristas.filter((a) => a.id !== id),
		});
	}

	addBloqueo(bloqueo: CampusBloqueoDto): void {
		const piso = this._pisoCompleto();
		if (!piso) return;
		this._pisoCompleto.set({ ...piso, bloqueos: [...piso.bloqueos, bloqueo] });
	}

	updateBloqueo(id: number, updates: Partial<CampusBloqueoDto>): void {
		const piso = this._pisoCompleto();
		if (!piso) return;
		this._pisoCompleto.set({
			...piso,
			bloqueos: piso.bloqueos.map((b) => (b.id === id ? { ...b, ...updates } : b)),
		});
	}

	removeBloqueo(id: number): void {
		const piso = this._pisoCompleto();
		if (!piso) return;
		this._pisoCompleto.set({
			...piso,
			bloqueos: piso.bloqueos.filter((b) => b.id !== id),
		});
	}

	addConexionVertical(conexion: CampusConexionVerticalDto): void {
		const piso = this._pisoCompleto();
		if (!piso) return;
		this._pisoCompleto.set({
			...piso,
			conexionesVerticales: [...piso.conexionesVerticales, conexion],
		});
	}

	removeConexionVertical(id: number): void {
		const piso = this._pisoCompleto();
		if (!piso) return;
		this._pisoCompleto.set({
			...piso,
			conexionesVerticales: piso.conexionesVerticales.filter((c) => c.id !== id),
		});
	}

	// #endregion
}
