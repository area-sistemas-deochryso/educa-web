import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { ConceptoGenerable, EstudianteBusqueda, VistaPreviaGeneracion } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { GenerarCargosComponent } from './generar-cargos.component';
import { GenerarCargosFacade } from './generar-cargos.facade';

const vistaPrevia: VistaPreviaGeneracion = {
	anio: 2027,
	aCrear: 30,
	yaExisten: 0,
	nacenSinDato: 0,
	nacenConfirmados: 30,
	porConcepto: [{ concepto: 'MATRICULA', aCrear: 30, yaExisten: 0 }],
	omitidos: [],
};

/** Los handlers de la sección son `protected`: el spec los llama como lo haría la plantilla. */
interface Handlers {
	alternar(concepto: ConceptoGenerable, marcado: boolean): void;
	agregarAlumno(alumno: EstudianteBusqueda): void;
}

function crear(api: Record<string, unknown> = {}) {
	const vistaPreviaGeneracion = vi.fn(() => of(vistaPrevia));
	TestBed.configureTestingModule({
		imports: [GenerarCargosComponent],
		providers: [
			GenerarCargosFacade,
			{
				provide: PagosApiService,
				useValue: { vistaPreviaGeneracion, buscarEstudiantes: () => of([]), ...api },
			},
		],
	});
	const fixture = TestBed.createComponent(GenerarCargosComponent);
	fixture.componentRef.setInput('anio', 2027);
	fixture.detectChanges();
	return { fixture, vistaPreviaGeneracion, elemento: fixture.nativeElement as HTMLElement };
}

const SELECTOR_CALCULAR = 'edu-button[label="Calcular vista previa"]';

function botonCalcular(elemento: HTMLElement): HTMLButtonElement | null {
	return elemento.querySelector(`${SELECTOR_CALCULAR} button`);
}

function clic(elemento: HTMLElement, selector: string): void {
	const objetivo = elemento.querySelector<HTMLElement>(selector);
	expect(objetivo, `no existe ${selector}`).toBeTruthy();
	objetivo?.click();
}

describe('GenerarCargosComponent — paso 4', () => {
	it('el título dice «4. Generar cargos del año» y se puede enfocar desde la guía', () => {
		const { elemento } = crear();

		const titulo = elemento.querySelector('#generar-title');
		expect(titulo?.textContent).toContain('4. Generar cargos del año 2027');
		expect(titulo?.getAttribute('tabindex')).toBe('-1');
	});

	it('sin bloqueo se puede calcular la vista previa', () => {
		const { fixture, vistaPreviaGeneracion, elemento } = crear();

		expect(botonCalcular(elemento)?.disabled).toBe(false);
		clic(elemento, SELECTOR_CALCULAR);
		fixture.detectChanges();

		expect(vistaPreviaGeneracion).toHaveBeenCalledTimes(1);
		expect(elemento.querySelector('.tabla-scroll table.tabla')).not.toBeNull();
	});
});

describe('GenerarCargosComponent — bloqueo y avisos', () => {
	it('con bloqueo, «Calcular vista previa» queda deshabilitado y se ve el motivo', () => {
		const { fixture, vistaPreviaGeneracion, elemento } = crear();

		fixture.componentRef.setInput('bloqueo', 'Primero guarda los parámetros del año (paso 1).');
		fixture.componentRef.setInput('avisos', ['x']);
		fixture.detectChanges();

		expect(botonCalcular(elemento)?.disabled).toBe(true);
		const motivo = elemento.querySelector('[data-testid="motivo-bloqueo"]');
		expect(motivo?.textContent).toContain('Primero guarda los parámetros del año (paso 1).');
		expect(elemento.querySelector('[data-testid="avisos-generacion"]')).toBeNull();

		clic(elemento, SELECTOR_CALCULAR);
		fixture.detectChanges();
		expect(vistaPreviaGeneracion).not.toHaveBeenCalled();
	});

	it('sin bloqueo se ven los avisos', () => {
		const { fixture, elemento } = crear();

		fixture.componentRef.setInput('avisos', ['x']);
		fixture.detectChanges();

		const avisos = elemento.querySelector('[data-testid="avisos-generacion"]');
		expect(avisos?.textContent).toContain('x');
		expect(elemento.querySelector('[data-testid="motivo-bloqueo"]')).toBeNull();
	});

	it('quedar bloqueado deja sin efecto la vista previa ya calculada', () => {
		const { fixture, elemento } = crear();
		clic(elemento, SELECTOR_CALCULAR);
		fixture.detectChanges();
		expect(elemento.querySelector('.vista-previa')).not.toBeNull();

		fixture.componentRef.setInput('bloqueo', 'Tienes cambios sin guardar en los montos.');
		fixture.detectChanges();

		expect(elemento.querySelector('.vista-previa')).toBeNull();
	});
});

describe('GenerarCargosComponent — accesibilidad', () => {
	it('«Quitar» lleva el nombre del alumno en el <button> interno', () => {
		const { fixture, elemento } = crear();
		const handlers = fixture.componentInstance as unknown as Handlers;

		handlers.alternar('INSCRIPCION', true);
		handlers.agregarAlumno({ estudianteId: 7, nombreCompleto: 'Ana Pérez', salon: null });
		fixture.detectChanges();

		const quitar = elemento.querySelector('.inscritos edu-button button');
		expect(quitar?.getAttribute('aria-label')).toBe('Quitar a Ana Pérez');
	});
});
