// * Tests de H04 (P110-F9): el máximo de semanas se informa mientras se escribe y no se puede crear con un valor inválido.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CursoBuilderDialogComponent } from './curso-builder-dialog.component';
// #endregion

describe('CursoBuilderDialogComponent — máximo de semanas', () => {
	function create() {
		const fixture = TestBed.createComponent(CursoBuilderDialogComponent);
		fixture.componentRef.setInput('visible', true);
		fixture.detectChanges();
		const emitted: number[] = [];
		fixture.componentInstance.create.subscribe((n) => emitted.push(n));
		// Los miembros protegidos se leen vía `as never` solo en el test.
		const internals = fixture.componentInstance as unknown as {
			numeroSemanas: { set(v: number | null): void };
			excedeMaximo(): boolean;
			semanasValidas(): boolean;
			dirty(): boolean;
		};
		return { fixture, component: fixture.componentInstance, internals, emitted };
	}

	beforeEach(() => TestBed.configureTestingModule({ imports: [CursoBuilderDialogComponent] }));

	it('crea con el valor por defecto y no marca cambios', () => {
		const { component, internals, emitted } = create();

		expect(internals.dirty()).toBe(false);
		component.onCreate();

		expect(emitted).toEqual([16]);
	});

	it('informa el máximo con 60 y no deja crear', () => {
		const { fixture, component, internals, emitted } = create();

		internals.numeroSemanas.set(60);
		fixture.detectChanges();
		component.onCreate();

		expect(internals.excedeMaximo()).toBe(true);
		expect(internals.semanasValidas()).toBe(false);
		expect(emitted).toEqual([]);
		expect(document.body.textContent).toContain('Máximo 52 semanas');
	});

	it('marca cambios sin guardar al editar el número', () => {
		const { internals } = create();

		internals.numeroSemanas.set(20);

		expect(internals.dirty()).toBe(true);
	});

	it('no deja crear con el campo vacío', () => {
		const { component, internals, emitted } = create();

		internals.numeroSemanas.set(null);
		component.onCreate();

		expect(emitted).toEqual([]);
	});
});
