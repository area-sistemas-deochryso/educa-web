import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	ErrorGroupEstado,
	ErrorGroupLista,
} from '../../models';
import { ErrorGroupsKanbanBoardComponent } from './error-groups-kanban-board.component';

function makeGroup(
	id: number,
	estado: ErrorGroupEstado,
	ultimaFecha = '2026-04-25T10:00:00',
): ErrorGroupLista {
	return {
		id,
		fingerprintCorto: `fp${id}`,
		severidad: 'ERROR',
		mensajeRepresentativo: `Error ${id}`,
		url: `/api/test/${id}`,
		httpStatus: 500,
		errorCode: null,
		origen: 'BACKEND',
		estado,
		primeraFecha: '2026-04-25T09:00:00',
		ultimaFecha,
		contadorTotal: 3,
		contadorPostResolucion: 0,
		rowVersion: `RV-${id}`,
	};
}

interface FakeCdkDrag {
	data: ErrorGroupLista | undefined;
}

describe('ErrorGroupsKanbanBoardComponent', () => {
	let fixture: ComponentFixture<ErrorGroupsKanbanBoardComponent>;
	let component: ErrorGroupsKanbanBoardComponent;
	let componentRef: ComponentRef<ErrorGroupsKanbanBoardComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [ErrorGroupsKanbanBoardComponent],
		});
		fixture = TestBed.createComponent(ErrorGroupsKanbanBoardComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;
	});

	it('renderiza 5 columnas vacías cuando no hay grupos', () => {
		componentRef.setInput('groups', []);
		fixture.detectChanges();

		const cols = component.columns();
		expect(cols).toHaveLength(5);
		cols.forEach((c) => {
			expect(c.allItems).toHaveLength(0);
			expect(c.visibleItems).toHaveLength(0);
		});
	});

	it('distribuye los grupos en sus columnas correctas y los ordena por ultimaFecha DESC', () => {
		const groups = [
			makeGroup(1, 'NUEVO', '2026-04-20T10:00:00'),
			makeGroup(2, 'NUEVO', '2026-04-25T10:00:00'),
			makeGroup(3, 'EN_PROGRESO', '2026-04-22T10:00:00'),
			makeGroup(4, 'RESUELTO', '2026-04-23T10:00:00'),
		];
		componentRef.setInput('groups', groups);
		fixture.detectChanges();

		const cols = component.columns();
		const nuevoCol = cols.find((c) => c.estado === 'NUEVO');
		expect(nuevoCol?.visibleItems.map((g) => g.id)).toEqual([2, 1]);
		expect(cols.find((c) => c.estado === 'EN_PROGRESO')?.visibleItems.map((g) => g.id)).toEqual([3]);
		expect(cols.find((c) => c.estado === 'RESUELTO')?.visibleItems.map((g) => g.id)).toEqual([4]);
	});

	it('drop predicate desde NUEVO permite VISTO/EN_PROGRESO/RESUELTO/IGNORADO', () => {
		componentRef.setInput('groups', []);
		fixture.detectChanges();

		const drag = { data: makeGroup(1, 'NUEVO') } as FakeCdkDrag;
		expect(component.dropPredicate('VISTO')(drag as never)).toBe(true);
		expect(component.dropPredicate('EN_PROGRESO')(drag as never)).toBe(true);
		expect(component.dropPredicate('RESUELTO')(drag as never)).toBe(true);
		expect(component.dropPredicate('IGNORADO')(drag as never)).toBe(true);
	});

	it('drop predicate desde RESUELTO solo permite NUEVO', () => {
		componentRef.setInput('groups', []);
		fixture.detectChanges();

		const drag = { data: makeGroup(1, 'RESUELTO') } as FakeCdkDrag;
		expect(component.dropPredicate('NUEVO')(drag as never)).toBe(true);
		expect(component.dropPredicate('VISTO')(drag as never)).toBe(false);
		expect(component.dropPredicate('EN_PROGRESO')(drag as never)).toBe(false);
		expect(component.dropPredicate('RESUELTO')(drag as never)).toBe(false);
		expect(component.dropPredicate('IGNORADO')(drag as never)).toBe(false);
	});

	it('emite cardClick cuando se llama onCardClick', () => {
		const spy = vi.fn();
		componentRef.setInput('groups', []);
		component.cardClick.subscribe(spy);
		fixture.detectChanges();

		const group = makeGroup(7, 'NUEVO');
		component.onCardClick(group);
		expect(spy).toHaveBeenCalledWith(group);
	});

	it('hideResolvedIgnored=true oculta las columnas RESUELTO e IGNORADO', () => {
		componentRef.setInput('groups', []);
		componentRef.setInput('hideResolvedIgnored', true);
		fixture.detectChanges();

		const estados = component.columns().map((c) => c.estado);
		expect(estados).toEqual(['NUEVO', 'VISTO', 'EN_PROGRESO']);
	});
});
