// * Tests for ViewAsPickerComponent (P92 F2 + xrepo-93): precarga inicial sin texto
// * y filtros complementarios de salón/año y curso sobre la búsqueda de usuarios.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { ViewAsFiltrosService, ViewAsSujetosService } from '@core/services/view-as';
import { ViewAsPickerComponent } from './view-as-picker.component';
// #endregion

// #region Tests
describe('ViewAsPickerComponent', () => {
	let fixture: ComponentFixture<ViewAsPickerComponent>;

	const buscar = vi.fn().mockReturnValue(of({ usuarios: [], total: 0 }));
	const listarSalones = vi.fn().mockReturnValue(of([{ value: 1, label: '1RO PRIMARIA A - 2026' }]));
	const listarCursos = vi.fn().mockReturnValue(of([{ value: 5, label: 'Matemática' }]));

	beforeEach(() => {
		buscar.mockClear();
		listarSalones.mockClear();
		listarCursos.mockClear();

		TestBed.configureTestingModule({
			imports: [ViewAsPickerComponent],
			providers: [
				provideZonelessChangeDetection(),
				{ provide: ViewAsSujetosService, useValue: { buscar } },
				{ provide: ViewAsFiltrosService, useValue: { listarSalones, listarCursos } },
			],
		});

		fixture = TestBed.createComponent(ViewAsPickerComponent);
		fixture.componentRef.setInput('rol', 'Profesor');
	});

	it('al iniciar, precarga resultados sin texto ni filtros (no arranca vacío)', () => {
		fixture.detectChanges();

		expect(buscar).toHaveBeenCalledWith('Profesor', undefined, undefined, undefined);
	});

	it('al iniciar, carga las opciones de salón y curso', () => {
		fixture.detectChanges();

		expect(listarSalones).toHaveBeenCalledTimes(1);
		expect(listarCursos).toHaveBeenCalledTimes(1);
		expect(fixture.componentInstance.salonOptions()).toEqual([{ value: 1, label: '1RO PRIMARIA A - 2026' }]);
		expect(fixture.componentInstance.cursoOptions()).toEqual([{ value: 5, label: 'Matemática' }]);
	});

	it('elegir un salón vuelve a buscar con salonId, manteniendo el texto libre anterior', () => {
		fixture.detectChanges();
		buscar.mockClear();

		fixture.componentInstance.onSearch({ query: 'ana' } as never);
		fixture.componentInstance.selectedSalonId.set(1);
		fixture.componentInstance.onFiltroChange();

		expect(buscar).toHaveBeenLastCalledWith('Profesor', 'ana', 1, undefined);
	});

	it('elegir un curso vuelve a buscar con cursoId', () => {
		fixture.detectChanges();
		buscar.mockClear();

		fixture.componentInstance.selectedCursoId.set(5);
		fixture.componentInstance.onFiltroChange();

		expect(buscar).toHaveBeenLastCalledWith('Profesor', undefined, undefined, 5);
	});

	it('onSelect emite el usuario elegido con el rol del input', () => {
		fixture.detectChanges();

		const emitted: unknown[] = [];
		fixture.componentInstance.userSelected.subscribe((v) => emitted.push(v));

		fixture.componentInstance.onSelect({ id: 15, nombreCompleto: 'Mariela Mendo', rol: 'Profesor' });

		expect(emitted).toEqual([{ entityId: 15, rol: 'Profesor', nombreCompleto: 'Mariela Mendo' }]);
	});
});
// #endregion
