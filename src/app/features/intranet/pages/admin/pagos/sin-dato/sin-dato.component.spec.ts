import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { SinDato } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { SinDatoComponent } from './sin-dato.component';

const respuesta: SinDato = {
	fecha: '2026-11-09T00:00:00',
	alumnos: 1,
	cargos: 2,
	salones: [{ salonId: 3, nombre: '5TO PRIMARIA B' }],
	filas: {
		data: [{ estudianteId: 280, estudiante: 'PÉREZ, ANA', salonId: 3, salon: '5TO PRIMARIA B', cargos: 2, detalle: [] }],
		total: 1,
		page: 1,
		pageSize: 20,
	},
};

function crear(query: Record<string, string> = {}) {
	const sinDato = vi.fn(() => of(respuesta));
	TestBed.configureTestingModule({
		imports: [SinDatoComponent],
		providers: [
			provideRouter([]),
			{ provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
			{ provide: PagosApiService, useValue: { sinDato } },
		],
	});
	const fixture = TestBed.createComponent(SinDatoComponent);
	fixture.detectChanges();
	return { fixture, sinDato };
}

describe('SinDatoComponent — filtro que llega desde el estado de cuenta', () => {
	it('con ?buscar= abre la lista ya filtrada por ese nombre y lo muestra en el buscador', () => {
		const { fixture, sinDato } = crear({ buscar: 'PÉREZ, ANA' });

		expect(sinDato).toHaveBeenCalledTimes(1);
		expect(sinDato).toHaveBeenCalledWith(expect.objectContaining({ buscar: 'PÉREZ, ANA' }));
		const entrada = fixture.nativeElement.querySelector('input.filters__input') as HTMLInputElement;
		expect(entrada.value).toBe('PÉREZ, ANA');
	});

	it('sin ?buscar= consulta sin filtro, como siempre', () => {
		const { fixture, sinDato } = crear();

		expect(sinDato).toHaveBeenCalledWith(expect.objectContaining({ buscar: '' }));
		const entrada = fixture.nativeElement.querySelector('input.filters__input') as HTMLInputElement;
		expect(entrada.value).toBe('');
	});

	it('un ?buscar= vacío o de solo espacios se ignora', () => {
		const { sinDato } = crear({ buscar: '   ' });

		expect(sinDato).toHaveBeenCalledWith(expect.objectContaining({ buscar: '' }));
	});
});
