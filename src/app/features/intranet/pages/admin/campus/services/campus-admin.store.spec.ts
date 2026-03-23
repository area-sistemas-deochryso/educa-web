// * Tests for CampusAdminStore — validates campus editor state with graph mutations.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CampusAdminStore } from './campus-admin.store';

// #endregion

// #region Test fixtures
const mockPisos = [
	{ id: 1, nombre: 'Piso 1', orden: 1, estado: true },
	{ id: 2, nombre: 'Piso 2', orden: 2, estado: false },
] as never[];

const mockPisoCompleto = {
	id: 1,
	nombre: 'Piso 1',
	nodos: [
		{ id: 10, tipo: 'classroom', nombre: 'Aula 1A', x: 100, y: 200 },
		{ id: 11, tipo: 'hallway', nombre: 'Pasillo 1', x: 150, y: 200 },
		{ id: 12, tipo: 'staircase', nombre: 'Escalera', x: 200, y: 200 },
	],
	aristas: [
		{ id: 20, nodoOrigenId: 10, nodoDestinoId: 11, peso: 5 },
		{ id: 21, nodoOrigenId: 11, nodoDestinoId: 12, peso: 3 },
	],
	bloqueos: [
		{ id: 30, aristaId: 20, motivo: 'Mantenimiento', activo: true },
	],
	conexionesVerticales: [
		{ id: 40, nodoOrigenId: 12, nodoDestinoId: 50, pisoDestinoId: 2 },
	],
} as never;
// #endregion

// #region Tests
describe('CampusAdminStore', () => {
	let store: CampusAdminStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [CampusAdminStore] });
		store = TestBed.inject(CampusAdminStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty pisos', () => {
			expect(store.pisos()).toEqual([]);
			expect(store.hasPisos()).toBe(false);
			expect(store.loading()).toBe(false);
		});

		it('should have default editor state', () => {
			expect(store.activeTool()).toBe('select');
			expect(store.selectedNodeId()).toBeNull();
			expect(store.newNodeType()).toBe('classroom');
		});

		it('should have all dialogs closed', () => {
			expect(store.pisoDialogVisible()).toBe(false);
			expect(store.nodeDialogVisible()).toBe(false);
			expect(store.bloqueoDialogVisible()).toBe(false);
			expect(store.verticalDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Pisos
	describe('pisos', () => {
		it('should set pisos', () => {
			store.setPisos(mockPisos);
			expect(store.pisos()).toHaveLength(2);
			expect(store.hasPisos()).toBe(true);
		});

		it('should find selected piso', () => {
			store.setPisos(mockPisos);
			store.setSelectedPisoId(1);
			expect((store.selectedPiso() as { nombre: string })?.nombre).toBe('Piso 1');
		});

		it('should update piso', () => {
			store.setPisos(mockPisos);
			store.updatePiso(1, { nombre: 'Planta Baja' } as never);
			expect((store.pisos()[0] as { nombre: string }).nombre).toBe('Planta Baja');
		});

		it('should toggle piso estado', () => {
			store.setPisos(mockPisos);
			store.togglePisoEstado(2);
			expect((store.pisos()[1] as { estado: boolean }).estado).toBe(true);
		});
	});
	// #endregion

	// #region Computed — nodos/aristas/bloqueos from pisoCompleto
	describe('pisoCompleto computed', () => {
		beforeEach(() => {
			store.setPisoCompleto(mockPisoCompleto);
		});

		it('should derive nodos', () => {
			expect(store.nodos()).toHaveLength(3);
		});

		it('should derive aristas', () => {
			expect(store.aristas()).toHaveLength(2);
		});

		it('should derive bloqueos', () => {
			expect(store.bloqueos()).toHaveLength(1);
		});

		it('should derive conexionesVerticales', () => {
			expect(store.conexionesVerticales()).toHaveLength(1);
		});

		it('should find selected node', () => {
			store.setSelectedNodeId(10);
			expect((store.selectedNode() as { nombre: string })?.nombre).toBe('Aula 1A');
		});

		it('should compute nodosConConexionVertical', () => {
			const ids = store.nodosConConexionVertical();
			expect(ids.has(12)).toBe(true);
			expect(ids.has(50)).toBe(true);
			expect(ids.has(10)).toBe(false);
		});

		it('should return empty when no pisoCompleto', () => {
			store.setPisoCompleto(null);
			expect(store.nodos()).toEqual([]);
			expect(store.aristas()).toEqual([]);
		});
	});
	// #endregion

	// #region Editor tool selection
	describe('editor tools', () => {
		it('should set active tool and clear selection', () => {
			store.setPisoCompleto(mockPisoCompleto);
			store.setSelectedNodeId(10);

			store.setActiveTool('addNode');

			expect(store.activeTool()).toBe('addNode');
			expect(store.selectedNodeId()).toBeNull();
		});

		it('should clear edge start when switching away from addEdge', () => {
			store.setEdgeStartNodeId(10);
			store.setActiveTool('select');
			expect(store.edgeStartNodeId()).toBeNull();
		});

		it('should select node and clear other selections', () => {
			store.setSelectedAristaId(20);
			store.setSelectedNodeId(10);

			expect(store.selectedNodeId()).toBe(10);
			expect(store.selectedAristaId()).toBeNull();
		});

		it('should select arista and clear other selections', () => {
			store.setSelectedNodeId(10);
			store.setSelectedAristaId(20);

			expect(store.selectedAristaId()).toBe(20);
			expect(store.selectedNodeId()).toBeNull();
		});
	});
	// #endregion

	// #region Graph mutations — nodos
	describe('nodo mutations', () => {
		beforeEach(() => {
			store.setPisoCompleto(mockPisoCompleto);
		});

		it('should add nodo', () => {
			store.addNodo({ id: 13, tipo: 'bathroom', nombre: 'Baño', x: 300, y: 200 } as never);
			expect(store.nodos()).toHaveLength(4);
		});

		it('should update nodo', () => {
			store.updateNodo(10, { nombre: 'Aula 1B' } as never);
			expect((store.nodos()[0] as { nombre: string }).nombre).toBe('Aula 1B');
		});

		it('should remove nodo and cascade-delete connected aristas and conexiones', () => {
			store.removeNodo(12);

			expect(store.nodos()).toHaveLength(2);
			expect(store.aristas()).toHaveLength(1); // arista 21 removed (connected to node 12)
			expect(store.conexionesVerticales()).toHaveLength(0); // conexion 40 removed
		});

		it('should do nothing when pisoCompleto is null', () => {
			store.setPisoCompleto(null);
			store.addNodo({ id: 99 } as never);
			expect(store.nodos()).toEqual([]);
		});
	});
	// #endregion

	// #region Graph mutations — aristas
	describe('arista mutations', () => {
		beforeEach(() => {
			store.setPisoCompleto(mockPisoCompleto);
		});

		it('should add arista', () => {
			store.addArista({ id: 22, nodoOrigenId: 10, nodoDestinoId: 12, peso: 8 } as never);
			expect(store.aristas()).toHaveLength(3);
		});

		it('should remove arista', () => {
			store.removeArista(20);
			expect(store.aristas()).toHaveLength(1);
		});
	});
	// #endregion

	// #region Graph mutations — bloqueos
	describe('bloqueo mutations', () => {
		beforeEach(() => {
			store.setPisoCompleto(mockPisoCompleto);
		});

		it('should add bloqueo', () => {
			store.addBloqueo({ id: 31, aristaId: 21, motivo: 'Pintura' } as never);
			expect(store.bloqueos()).toHaveLength(2);
		});

		it('should update bloqueo', () => {
			store.updateBloqueo(30, { motivo: 'Reparación' } as never);
			expect((store.bloqueos()[0] as { motivo: string }).motivo).toBe('Reparación');
		});

		it('should remove bloqueo', () => {
			store.removeBloqueo(30);
			expect(store.bloqueos()).toHaveLength(0);
		});
	});
	// #endregion

	// #region Graph mutations — conexiones verticales
	describe('conexion vertical mutations', () => {
		beforeEach(() => {
			store.setPisoCompleto(mockPisoCompleto);
		});

		it('should add conexion', () => {
			store.addConexionVertical({ id: 41, nodoOrigenId: 11, nodoDestinoId: 60 } as never);
			expect(store.conexionesVerticales()).toHaveLength(2);
		});

		it('should remove conexion', () => {
			store.removeConexionVertical(40);
			expect(store.conexionesVerticales()).toHaveLength(0);
		});
	});
	// #endregion

	// #region Dialog management
	describe('dialogs', () => {
		it('should open/close piso dialog', () => {
			store.openPisoDialog();
			expect(store.pisoDialogVisible()).toBe(true);
			expect(store.editingPiso()).toBeNull();

			store.closePisoDialog();
			expect(store.pisoDialogVisible()).toBe(false);
		});

		it('should open piso dialog for edit', () => {
			store.openPisoDialog(mockPisos[0] as never);
			expect(store.editingPiso()).toEqual(mockPisos[0]);
		});

		it('should open/close node dialog', () => {
			store.openNodeDialog();
			expect(store.nodeDialogVisible()).toBe(true);
			store.closeNodeDialog();
			expect(store.nodeDialogVisible()).toBe(false);
		});

		it('should open/close bloqueo dialog', () => {
			store.openBloqueoDialog();
			expect(store.bloqueoDialogVisible()).toBe(true);
			store.closeBloqueoDialog();
			expect(store.bloqueoDialogVisible()).toBe(false);
		});

		it('should open/close vertical dialog and clear destPisoNodos', () => {
			store.setDestPisoNodos([{ id: 1 }] as never[]);
			store.openVerticalDialog();
			expect(store.verticalDialogVisible()).toBe(true);

			store.closeVerticalDialog();
			expect(store.verticalDialogVisible()).toBe(false);
			expect(store.destPisoNodos()).toEqual([]);
		});
	});
	// #endregion
});
// #endregion
