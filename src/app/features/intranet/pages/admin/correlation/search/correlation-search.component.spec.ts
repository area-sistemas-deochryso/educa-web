import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { CorrelationSearchComponent } from './correlation-search.component';
import { CorrelationService } from '../services';

describe('CorrelationSearchComponent', () => {
	let fixture: ComponentFixture<CorrelationSearchComponent>;
	let component: CorrelationSearchComponent;
	let search: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		search = vi.fn().mockReturnValue(of([]));

		await TestBed.configureTestingModule({
			imports: [CorrelationSearchComponent],
			providers: [provideRouter([]), { provide: CorrelationService, useValue: { search } }],
		}).compileComponents();

		fixture = TestBed.createComponent(CorrelationSearchComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('no dispara búsqueda con query vacía (botón queda deshabilitado por template, pero también onSearch es un no-op)', () => {
		component.query.set('');
		component.onSearch();

		expect(search).not.toHaveBeenCalled();
	});

	it('no dispara búsqueda con query menor al mínimo (3 chars)', () => {
		component.query.set('ab');
		component.onSearch();

		expect(search).not.toHaveBeenCalled();
	});

	it('dispara la búsqueda con la query trimeada y filtros vacíos como null', () => {
		component.query.set('  timeout  ');
		component.onSearch();

		expect(search).toHaveBeenCalledWith({
			query: 'timeout',
			dni: null,
			desde: null,
			hasta: null,
		});
	});

	it('no dispara búsqueda si el DNI no son 4 dígitos', () => {
		component.query.set('timeout');
		component.dni.set('12a4');
		component.onSearch();

		expect(search).not.toHaveBeenCalled();
		expect(component.validationError()).toContain('4 dígitos');
	});

	it('carga los resultados en el signal `results` cuando el service responde', () => {
		search.mockReturnValue(of(['trace-1', 'trace-2']));
		component.query.set('timeout');

		component.onSearch();

		expect(component.results()).toEqual(['trace-1', 'trace-2']);
		expect(component.loading()).toBe(false);
	});

	it('setea un error legible cuando el service responde 400', () => {
		search.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
		component.query.set('timeout');

		component.onSearch();

		expect(component.results()).toBeNull();
		expect(component.error()).toContain('inválidos');
	});

	it('onClear resetea query, filtros y resultados', () => {
		component.query.set('timeout');
		component.dni.set('1234');
		component.results.set(['trace-1']);
		component.error.set('algo');

		component.onClear();

		expect(component.query()).toBe('');
		expect(component.dni()).toBe('');
		expect(component.results()).toBeNull();
		expect(component.error()).toBeNull();
	});

	it('validationError detecta rango de fechas invertido', () => {
		component.query.set('timeout');
		component.desde.set(new Date(2026, 4, 10));
		component.hasta.set(new Date(2026, 4, 1));

		expect(component.validationError()).toContain('Desde no puede ser posterior');
	});
});
