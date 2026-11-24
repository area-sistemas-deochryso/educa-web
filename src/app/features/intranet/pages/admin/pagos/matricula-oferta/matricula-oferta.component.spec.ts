import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { VistaPreviaGeneracion } from '@data/models';
import { MatriculaOfertaComponent, type MatriculaOfertaResultado } from './matricula-oferta.component';
import { MatriculaOfertaFacade } from './matricula-oferta.facade';

const vistaPrevia = (aCrear: number): VistaPreviaGeneracion => ({
	anio: 2027,
	aCrear,
	yaExisten: 0,
	nacenSinDato: 0,
	nacenConfirmados: aCrear,
	porConcepto: [],
	omitidos: [],
});

function montar(opciones: { aCrear?: number; quedaSinCargo?: boolean; resultado?: boolean } = {}) {
	const facade = {
		esNuevo: signal(false),
		calculando: signal(false),
		generando: signal(false),
		error: signal<string | null>(null),
		vistaPrevia: signal<VistaPreviaGeneracion | null>(vistaPrevia(opciones.aCrear ?? 1)),
		resultado: signal(opciones.resultado ? { anio: 2027, creados: 1, yaExisten: 0 } : null),
		iniciar: vi.fn(),
		cambiarNuevo: vi.fn(),
		generar: vi.fn(),
		quedaSinCargo: vi.fn(() => Promise.resolve(opciones.quedaSinCargo ?? false)),
	};
	TestBed.configureTestingModule({ imports: [MatriculaOfertaComponent] });
	TestBed.overrideComponent(MatriculaOfertaComponent, { set: { providers: [{ provide: MatriculaOfertaFacade, useValue: facade }] } });

	const fixture = TestBed.createComponent(MatriculaOfertaComponent);
	fixture.componentRef.setInput('estudianteId', 15);
	fixture.componentRef.setInput('anio', 2027);
	fixture.componentRef.setInput('nombre', 'Ana Pérez');
	const emitidos: MatriculaOfertaResultado[] = [];
	fixture.componentInstance.terminado.subscribe((r) => emitidos.push(r));
	fixture.detectChanges();
	return { fixture, facade, emitidos, el: fixture.nativeElement as HTMLElement };
}

describe('MatriculaOfertaComponent', () => {
	it('al montarse inicia el facade con el alumno y el año recibidos', () => {
		const { facade } = montar();

		expect(facade.iniciar).toHaveBeenCalledWith(15, 2027);
	});

	it('muestra el nombre del alumno y el año en el encabezado', () => {
		const { el } = montar();

		expect(el.textContent).toContain('Ana Pérez');
		expect(el.textContent).toContain('2027');
	});

	it('«Omitir» emite generado = false y arrastra el aviso de sin cargo', async () => {
		const { el, emitidos, facade } = montar({ quedaSinCargo: true });

		el.querySelector<HTMLElement>('[data-testid="oferta-omitir"]')?.click();
		await Promise.resolve();
		await Promise.resolve();

		expect(facade.quedaSinCargo).toHaveBeenCalledTimes(1);
		expect(emitidos).toEqual([{ generado: false, sinCargo: true }]);
	});

	it('con el resultado ya generado reemplaza Generar/Omitir por «Listo», que emite generado = true', () => {
		const { el, emitidos } = montar({ resultado: true });

		expect(el.querySelector('[data-testid="oferta-generar"]')).toBeNull();
		expect(el.querySelector('[data-testid="oferta-omitir"]')).toBeNull();
		expect(el.querySelector('[data-testid="oferta-resultado"]')).not.toBeNull();

		el.querySelector<HTMLElement>('[data-testid="oferta-listo"]')?.click();

		expect(emitidos).toEqual([{ generado: true, sinCargo: false }]);
	});

	it('con cargos por crear, «Generar» llama al facade', () => {
		const { el, facade } = montar({ aCrear: 2 });

		const boton = el.querySelector<HTMLButtonElement>('[data-testid="oferta-generar"] button');
		expect(boton?.disabled).toBe(false);
		boton?.click();

		expect(facade.generar).toHaveBeenCalledTimes(1);
	});

	it('sin nada que crear no ofrece generar: repetir no duplica', () => {
		const { el, facade } = montar({ aCrear: 0 });

		// El clic real cae en el <button> interno de edu-button, que deshabilitado no propaga el evento.
		const boton = el.querySelector<HTMLButtonElement>('[data-testid="oferta-generar"] button');
		expect(boton?.disabled).toBe(true);
		boton?.click();

		expect(facade.generar).not.toHaveBeenCalled();
	});
});
