import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { ConceptoGenerable, EstudianteBusqueda, VistaPreviaGeneracion } from '@data/models';
import { ClassroomsAdminApiService } from '@features/intranet/pages/admin/classrooms/services';
import { SalonEstudiantesApiService } from '@features/intranet/pages/admin/classrooms/services/salon-estudiantes-api.service';
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
	cambiarSalon(cambio: { salonId: number | null; nuevos: number[] }): void;
	calcular(): void;
}

function crear(api: Record<string, unknown> = {}) {
	const vistaPreviaGeneracion = vi.fn(() => of(vistaPrevia));
	TestBed.configureTestingModule({
		imports: [GenerarCargosComponent],
		providers: [
			// El filtro por salón (P123 F8) lee de classrooms: sin esto la prueba dispararía HTTP real.
			{ provide: ClassroomsAdminApiService, useValue: { getSalonesAdmin: () => of([]) } },
			{ provide: SalonEstudiantesApiService, useValue: { listarPorSalon: () => of([]) } },
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

describe('GenerarCargosComponent — filtro por salón (P123 F8)', () => {
	it('con salón elegido viaja su id y solo se inscribe a los marcados en su lista, no a los del buscador', () => {
		const { fixture, vistaPreviaGeneracion } = crear();
		const handlers = fixture.componentInstance as unknown as Handlers;
		handlers.alternar('INSCRIPCION', true);
		handlers.agregarAlumno({ estudianteId: 6, nombreCompleto: 'Ana Pérez', salon: null });

		handlers.cambiarSalon({ salonId: 9, nuevos: [5, 7] });
		handlers.calcular();

		expect(vistaPreviaGeneracion).toHaveBeenCalledWith({
			anio: 2027,
			conceptos: ['MATRICULA', 'PENSION', 'INSCRIPCION'],
			salonId: 9,
			inscripcionEstudianteIds: [5, 7],
		});
	});

	it('sin salón, los alumnos del buscador sí viajan; al elegir salón dejan de viajar y vuelven al quitarlo', () => {
		const { fixture, vistaPreviaGeneracion } = crear();
		const handlers = fixture.componentInstance as unknown as Handlers;
		handlers.alternar('INSCRIPCION', true);
		handlers.agregarAlumno({ estudianteId: 6, nombreCompleto: 'Ana Pérez', salon: null });

		handlers.calcular();
		expect(vistaPreviaGeneracion).toHaveBeenLastCalledWith(expect.objectContaining({ salonId: null, inscripcionEstudianteIds: [6] }));

		handlers.cambiarSalon({ salonId: 9, nuevos: [] });
		handlers.calcular();
		expect(vistaPreviaGeneracion).toHaveBeenLastCalledWith(expect.objectContaining({ salonId: 9, inscripcionEstudianteIds: null }));

		handlers.cambiarSalon({ salonId: null, nuevos: [] });
		handlers.calcular();
		expect(vistaPreviaGeneracion).toHaveBeenLastCalledWith(expect.objectContaining({ salonId: null, inscripcionEstudianteIds: [6] }));
	});

	it('el buscador de alumnos nuevos solo se ve sin salón elegido; con salón y alumnos ya elegidos se avisa que no se inscribirán', () => {
		const { fixture, elemento } = crear();
		const handlers = fixture.componentInstance as unknown as Handlers;
		handlers.alternar('INSCRIPCION', true);
		handlers.agregarAlumno({ estudianteId: 6, nombreCompleto: 'Ana Pérez', salon: null });
		fixture.detectChanges();
		expect(elemento.querySelector('edu-autocomplete')).not.toBeNull();
		expect(elemento.querySelector('[data-testid="aviso-buscador-ignorado"]')).toBeNull();

		handlers.cambiarSalon({ salonId: 9, nuevos: [] });
		fixture.detectChanges();

		expect(elemento.querySelector('edu-autocomplete')).toBeNull();
		expect(elemento.querySelector('[data-testid="aviso-buscador-ignorado"]')?.textContent).toContain('no se');
	});

	// jsdom no calcula CSS: esto solo fija la clase (ver alumnos-salon.component.spec.ts).
	it('el campo del buscador de alumnos nuevos usa `campo--auto` para no estirarse en altura', () => {
		const { fixture, elemento } = crear();
		(fixture.componentInstance as unknown as Handlers).alternar('INSCRIPCION', true);
		fixture.detectChanges();

		expect(elemento.querySelector('.inscripcion label.campo')?.classList.contains('campo--auto')).toBe(true);
	});

	it('sin salón elegido el payload sigue siendo de todo el año', () => {
		const { fixture, vistaPreviaGeneracion } = crear();
		const handlers = fixture.componentInstance as unknown as Handlers;

		handlers.calcular();

		expect(vistaPreviaGeneracion).toHaveBeenCalledWith(expect.objectContaining({ salonId: null, inscripcionEstudianteIds: null }));
	});

	it('cambiar de salón deja sin efecto la vista previa ya calculada', () => {
		const { fixture, elemento } = crear();
		const handlers = fixture.componentInstance as unknown as Handlers;
		clic(elemento, SELECTOR_CALCULAR);
		fixture.detectChanges();
		expect(elemento.querySelector('.vista-previa')).not.toBeNull();

		handlers.cambiarSalon({ salonId: 9, nuevos: [] });
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
