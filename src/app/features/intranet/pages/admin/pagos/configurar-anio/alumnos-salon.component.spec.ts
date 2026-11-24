import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { SalonAdminListDto } from '@data/models';
import { ClassroomsAdminApiService } from '@features/intranet/pages/admin/classrooms/services';
import { SalonEstudiantesApiService } from '@features/intranet/pages/admin/classrooms/services/salon-estudiantes-api.service';
import { type AlumnosSalonCambio, AlumnosSalonComponent } from './alumnos-salon.component';

interface Handlers {
	elegirSalon(salonId: number | null): void;
}

const alumnos = [
	{ estudianteId: 1, dni: '11111111', nombreCompleto: 'Ana Pérez', estadoMatricula: 'Activa' },
	{ estudianteId: 2, dni: '22222222', nombreCompleto: 'Luis Soto', estadoMatricula: 'Activa' },
];

function montar(opciones: { inscripcion?: boolean } = {}) {
	const getSalonesAdmin = vi.fn(() => of([{ id: 9, grado: '1° Primaria', gradoOrden: 1, seccion: 'A', sede: 'Central' } as SalonAdminListDto]));
	TestBed.configureTestingModule({
		imports: [AlumnosSalonComponent],
		providers: [
			{ provide: ClassroomsAdminApiService, useValue: { getSalonesAdmin } },
			{ provide: SalonEstudiantesApiService, useValue: { listarPorSalon: () => of(alumnos) } },
		],
	});
	const fixture = TestBed.createComponent(AlumnosSalonComponent);
	fixture.componentRef.setInput('anio', 2027);
	fixture.componentRef.setInput('inscripcion', opciones.inscripcion ?? true);
	const emitidos: AlumnosSalonCambio[] = [];
	fixture.componentInstance.cambio.subscribe((c) => emitidos.push(c));
	fixture.detectChanges();
	const el = fixture.nativeElement as HTMLElement;
	const elegir = (id: number | null) => {
		(fixture.componentInstance as unknown as Handlers).elegirSalon(id);
		fixture.detectChanges();
	};
	const casillas = () => Array.from(el.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]'));
	return { fixture, el, emitidos, getSalonesAdmin, elegir, casillas };
}

describe('AlumnosSalonComponent', () => {
	it('al montarse carga los salones del año y emite «todo el año» sin marcas', () => {
		const { getSalonesAdmin, emitidos } = montar();

		expect(getSalonesAdmin).toHaveBeenCalledWith(2027, false);
		expect(emitidos.at(-1)).toEqual({ salonId: null, nuevos: [] });
	});

	// jsdom no calcula CSS: esto solo fija la clase. El efecto (220 px de alto vs ~113 de contenido) se midió en el navegador.
	it('el campo del salón usa `campo--auto`: sin ella `.campo` (flex-basis 220px) estira la altura dentro de la columna', () => {
		const { el } = montar();

		expect(el.querySelector('.campo')?.classList.contains('campo--auto')).toBe(true);
	});

	it('sin salón elegido no muestra la lista de alumnos', () => {
		const { el } = montar();

		expect(el.querySelector('table')).toBeNull();
	});

	it('al elegir un salón lista sus alumnos, con el resumen y sin nadie marcado', () => {
		const { el, elegir, casillas, emitidos } = montar();

		elegir(9);

		expect(casillas()).toHaveLength(2);
		expect(casillas().every((c) => !c.checked)).toBe(true);
		expect(el.querySelector('[data-testid="resumen-nuevos"]')?.textContent).toContain('2 alumnos, ninguno marcado como nuevo.');
		expect(emitidos.at(-1)).toEqual({ salonId: 9, nuevos: [] });
	});

	it('marcar a un alumno emite el salón y sus nuevos; desmarcarlo lo quita', () => {
		const { fixture, elegir, casillas, emitidos } = montar();
		elegir(9);

		casillas()[1].click();
		fixture.detectChanges();
		expect(emitidos.at(-1)).toEqual({ salonId: 9, nuevos: [2] });

		casillas()[1].click();
		fixture.detectChanges();
		expect(emitidos.at(-1)).toEqual({ salonId: 9, nuevos: [] });
	});

	it('cada casilla lleva el nombre del alumno como etiqueta accesible', () => {
		const { elegir, casillas } = montar();
		elegir(9);

		expect(casillas()[0].getAttribute('aria-label')).toBe('Marcar como nuevo a Ana Pérez');
	});

	it('volver a «Todos» borra las marcas: eran de otro salón', () => {
		const { fixture, elegir, casillas, emitidos } = montar();
		elegir(9);
		casillas()[0].click();
		fixture.detectChanges();

		elegir(null);

		expect(emitidos.at(-1)).toEqual({ salonId: null, nuevos: [] });
	});

	it('sin el concepto «Inscripción» las casillas están deshabilitadas y se explica por qué', () => {
		const { el, elegir, casillas } = montar({ inscripcion: false });
		elegir(9);

		expect(casillas().every((c) => c.disabled)).toBe(true);
		expect(el.textContent).toContain('Marca «Inscripción» en los conceptos');
	});

	it('cambiar de año reinicia el salón elegido y recarga los salones', () => {
		const { fixture, elegir, getSalonesAdmin, emitidos } = montar();
		elegir(9);

		fixture.componentRef.setInput('anio', 2028);
		fixture.detectChanges();

		expect(getSalonesAdmin).toHaveBeenLastCalledWith(2028, false);
		expect(emitidos.at(-1)).toEqual({ salonId: null, nuevos: [] });
	});
});
