// * Tests de H05 (P110-F9): el título obligatorio se explica y los cambios sin guardar se detectan.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { CrearTareaRequest } from '@features/intranet/pages/profesor/models';
import { TareaDialogComponent } from './tarea-dialog.component';
// #endregion

describe('TareaDialogComponent — título obligatorio y cambios sin guardar', () => {
	function create() {
		const fixture = TestBed.createComponent(TareaDialogComponent);
		fixture.componentRef.setInput('visible', true);
		fixture.componentRef.setInput('tarea', null);
		fixture.detectChanges();
		const created: CrearTareaRequest[] = [];
		fixture.componentInstance.createTarea.subscribe((r) => created.push(r));
		return { fixture, component: fixture.componentInstance, created };
	}

	beforeEach(() => TestBed.configureTestingModule({ imports: [TareaDialogComponent] }));

	it('sin título no crea y muestra por qué', () => {
		const { fixture, component, created } = create();

		document.querySelector<HTMLElement>('[data-info-anchor="profesor-tarea-dialog-guardar"]')?.click();
		fixture.detectChanges();

		expect(created).toEqual([]);
		expect(component.mostrarErrorTitulo()).toBe(true);
		expect(document.body.textContent).toContain('Escribe un título para crear la tarea.');
	});

	it('con título crea y no muestra error', () => {
		const { component, created } = create();

		component.titulo = 'Ensayo';
		component.onSave();

		expect(created).toHaveLength(1);
		expect(component.mostrarErrorTitulo()).toBe(false);
	});

	it('detecta cambios sin guardar solo cuando algo se escribió', () => {
		const { component } = create();

		expect(component.dirty()).toBe(false);

		component.descripcion = 'Instrucciones';

		expect(component.dirty()).toBe(true);
	});
});
