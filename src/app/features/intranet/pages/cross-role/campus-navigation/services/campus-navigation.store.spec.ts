// * Tests for CampusNavigationStore — validates navigation state with path computation.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CampusNavigationStore } from './campus-navigation.store';
import { PathfindingHelper } from './pathfinding.helper';

// #endregion

// #region Test fixtures
const mockNodes = [
	{ id: 'n1', label: 'Aula 1A', type: 'classroom', floor: 0, x: 100, y: 100, salonId: 10 },
	{ id: 'n2', label: 'Pasillo', type: 'corridor', floor: 0, x: 200, y: 100, salonId: null },
	{ id: 'n3', label: 'Aula 2A', type: 'classroom', floor: 0, x: 300, y: 100, salonId: 20 },
	{ id: 'n4', label: 'Escalera', type: 'staircase', floor: 1, x: 200, y: 100, salonId: null },
	{ id: 'n5', label: 'Lab', type: 'laboratory', floor: 1, x: 300, y: 100, salonId: 30 },
] as never[];

const mockEdges = [
	{ from: 'n1', to: 'n2', weight: 5 },
	{ from: 'n2', to: 'n3', weight: 5 },
	{ from: 'n4', to: 'n5', weight: 3 },
] as never[];

const mockSchedule = [
	{ horaInicio: '08:00', horaFin: '09:30', cursoNombre: 'Mat', salonId: 10 },
	{ horaInicio: '10:00', horaFin: '11:30', cursoNombre: 'Com', salonId: 20 },
] as never[];
// #endregion

// #region Tests
describe('CampusNavigationStore', () => {
	let store: CampusNavigationStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				CampusNavigationStore,
				{ provide: PathfindingHelper, useValue: { generateSafePathPoints: vi.fn().mockReturnValue('100,100 200,100') } },
			],
		});
		store = TestBed.inject(CampusNavigationStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should be empty', () => {
			expect(store.nodes()).toEqual([]);
			expect(store.edges()).toEqual([]);
			expect(store.campusReady()).toBe(false);
			expect(store.loading()).toBe(false);
			expect(store.selectedFloor()).toBe(0);
		});

		it('should have no path', () => {
			expect(store.startNodeId()).toBeNull();
			expect(store.destinationNodeId()).toBeNull();
			expect(store.pathResult()).toBeNull();
		});
	});
	// #endregion

	// #region Computed — floors
	describe('floors', () => {
		it('should derive unique floors sorted', () => {
			store.setNodes(mockNodes);
			expect(store.floors()).toEqual([0, 1]);
		});

		it('should return empty for no nodes', () => {
			expect(store.floors()).toEqual([]);
		});
	});
	// #endregion

	// #region Computed — currentFloorNodes/Edges
	describe('currentFloorNodes/Edges', () => {
		beforeEach(() => {
			store.setNodes(mockNodes);
			store.setEdges(mockEdges);
		});

		it('should filter nodes by selected floor', () => {
			store.setSelectedFloor(0);
			expect(store.currentFloorNodes()).toHaveLength(3);

			store.setSelectedFloor(1);
			expect(store.currentFloorNodes()).toHaveLength(2);
		});

		it('should filter edges where both nodes are on same floor', () => {
			store.setSelectedFloor(0);
			expect(store.currentFloorEdges()).toHaveLength(2);

			store.setSelectedFloor(1);
			expect(store.currentFloorEdges()).toHaveLength(1);
		});
	});
	// #endregion

	// #region Computed — salonToNodeMap
	describe('salonToNodeMap', () => {
		it('should map salonId to nodeId', () => {
			store.setNodes(mockNodes);
			const map = store.salonToNodeMap();

			expect(map.get(10)).toBe('n1');
			expect(map.get(20)).toBe('n3');
			expect(map.get(30)).toBe('n5');
		});
	});
	// #endregion

	// #region Computed — allNodeOptions (excludes corridors)
	describe('allNodeOptions', () => {
		it('should exclude corridor nodes', () => {
			store.setNodes(mockNodes);
			const options = store.allNodeOptions();

			expect(options).toHaveLength(4); // n1, n3, n4, n5 (not n2 corridor)
			expect(options.every((o) => o.label !== 'Pasillo')).toBe(true);
		});
	});
	// #endregion

	// #region Schedule
	describe('schedule', () => {
		it('should set schedule items', () => {
			store.setScheduleItems(mockSchedule);
			expect(store.scheduleItems()).toHaveLength(2);
			expect(store.vm().hasSchedule).toBe(true);
		});

		it('should mark schedule ready', () => {
			store.setScheduleReady(true);
			expect(store.scheduleReady()).toBe(true);
		});
	});
	// #endregion

	// #region Path management
	describe('path', () => {
		it('should set path result', () => {
			store.setPathResult({ path: ['n1', 'n2', 'n3'], distance: 10 } as never);
			expect(store.pathResult()).not.toBeNull();
			expect(store.vm().hasPath).toBe(true);
		});

		it('should clear path', () => {
			store.setDestinationNodeId('n3');
			store.setPathResult({ path: ['n1', 'n3'], distance: 5 } as never);

			store.clearPath();

			expect(store.destinationNodeId()).toBeNull();
			expect(store.pathResult()).toBeNull();
		});
	});
	// #endregion

	// #region ViewModel
	describe('vm', () => {
		it('should compose all state', () => {
			store.setNodes(mockNodes);
			store.setEdges(mockEdges);
			store.setCampusReady(true);

			const vm = store.vm();
			expect(vm.hasCampusData).toBe(true);
			expect(vm.campusReady).toBe(true);
			expect(vm.floors).toEqual([0, 1]);
			expect(vm.currentFloorNodes).toHaveLength(3);
		});
	});
	// #endregion
});
// #endregion
