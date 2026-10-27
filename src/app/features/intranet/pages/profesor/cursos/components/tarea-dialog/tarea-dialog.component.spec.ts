// * Tests de H05 (P110-F9): el título obligatorio se explica y los cambios sin guardar se detectan.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { CalificacionDto, CrearTareaRequest, CursoContenidoTareaDto } from '@features/intranet/pages/profesor/models';
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
		component.pesoPct = 20;
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

describe('TareaDialogComponent — placeholder según el tipo (P114-F6 D2)', () => {
	it('nombra el tipo elegido con su artículo', () => {
		const fixture = TestBed.createComponent(TareaDialogComponent);
		fixture.componentRef.setInput('visible', true);
		fixture.componentRef.setInput('tarea', null);
		fixture.detectChanges();
		const component = fixture.componentInstance;

		component.tipo = 'TAREA';
		expect(component.deLaEtiqueta()).toBe('de la tarea');
		component.tipo = 'ACTIVIDAD';
		expect(component.deLaEtiqueta()).toBe('de la actividad');
		component.tipo = 'EXAMEN';
		expect(component.deLaEtiqueta()).toBe('del examen');
	});
});

describe('TareaDialogComponent — es calificable y modalidad enlazada (P114-F5b, INV-C16)', () => {
	const tarea = {
		id: 7,
		titulo: 'Ensayo',
		descripcion: null,
		fechaLimite: null,
		esGrupal: true,
		fechaReg: '2026-10-01T00:00:00',
		archivos: [],
		tipo: 'TAREA',
	} as CursoContenidoTareaDto;

	const evaluacion = {
		id: 11,
		cursoContenidoId: 5,
		tareaId: 7,
		semanaId: 3,
		numeroSemana: 1,
		titulo: 'Ensayo (nota)',
		peso: 0.25,
		fechaEvaluacion: '2026-10-10T00:00:00',
		tipo: 'Tarea',
		esGrupal: true,
		estado: true,
	} as CalificacionDto;

	function create(inputs: Record<string, unknown>) {
		const fixture = TestBed.createComponent(TareaDialogComponent);
		fixture.componentRef.setInput('visible', true);
		fixture.componentRef.setInput('tarea', tarea);
		for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
		fixture.detectChanges();
		return { fixture, component: fixture.componentInstance };
	}

	beforeEach(() => TestBed.configureTestingModule({ imports: [TareaDialogComponent] }));

	it('con evaluación enlazada explica de quién es la modalidad y deja ir a la evaluación', () => {
		const { fixture, component } = create({ evaluacionEnlazada: evaluacion });
		const irA: number[] = [];
		component.irAEvaluacion.subscribe((id) => irA.push(id));

		expect(document.body.textContent).toContain('La define la evaluación enlazada.');
		expect(document.body.textContent).toContain('Evaluación enlazada: «Ensayo (nota)» · peso 25%');

		document.querySelector<HTMLElement>('.task-eval__link')?.click();
		fixture.detectChanges();
		expect(irA).toEqual([11]);
	});

	it('sin evaluación ofrece crearla o enlazar una existente', () => {
		const { fixture, component } = create({ evaluacionEnlazada: null, evaluacionesEnlazables: [{ ...evaluacion, id: 12, tareaId: null }] });
		let creadas = 0;
		const enlazadas: number[] = [];
		component.crearEvaluacion.subscribe(() => creadas++);
		component.enlazarEvaluacion.subscribe((id) => enlazadas.push(id));

		document.querySelector<HTMLElement>('[data-info-anchor="profesor-tarea-dialog-crear-evaluacion"]')?.click();
		fixture.detectChanges();
		expect(creadas).toBe(1);

		component.evaluacionAEnlazar = 12;
		component.onEnlazar();
		expect(enlazadas).toEqual([12]);
		expect(component.evaluacionAEnlazar).toBeNull();
	});

	it('una tarea nueva no usa el flujo de editar (crear/enlazar evaluación)', () => {
		const fixture = TestBed.createComponent(TareaDialogComponent);
		fixture.componentRef.setInput('visible', true);
		fixture.componentRef.setInput('tarea', null);
		fixture.detectChanges();

		expect(fixture.componentInstance.puedeSerCalificable()).toBe(false);
		expect(document.body.textContent).not.toContain('Guarda la tarea para poder hacerla calificable.');
	});
});

describe('TareaDialogComponent — «Es calificable» activo al crear (P118-F2, INV-C04, INV-C16)', () => {
	function create(tipoInicial: 'TAREA' | 'ACTIVIDAD' | 'EXAMEN' = 'TAREA', inputs: Record<string, unknown> = {}) {
		const fixture = TestBed.createComponent(TareaDialogComponent);
		fixture.componentRef.setInput('visible', true);
		fixture.componentRef.setInput('tarea', null);
		fixture.componentRef.setInput('tipoInicial', tipoInicial);
		for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
		fixture.detectChanges();
		const created: CrearTareaRequest[] = [];
		fixture.componentInstance.createTarea.subscribe((r) => created.push(r));
		return { fixture, component: fixture.componentInstance, created };
	}

	beforeEach(() => TestBed.configureTestingModule({ imports: [TareaDialogComponent] }));

	it.each(['TAREA', 'ACTIVIDAD'] as const)('%s nueva: calificable activo y peso vacío; sin peso no crea', (tipo) => {
		const { fixture, component, created } = create(tipo);
		component.titulo = 'Ensayo';

		expect(component.esCalificable).toBe(true);
		expect(component.pesoPct).toBeNull();

		document.querySelector<HTMLElement>('[data-info-anchor="profesor-tarea-dialog-guardar"]')?.click();
		fixture.detectChanges();

		expect(created).toEqual([]);
		expect(component.errorPeso()).toBe('Escribe el peso (entre 1 % y 100 %).');
		expect(document.body.textContent).toContain('Escribe el peso');
	});

	it('examen nuevo: sin control de calificable, mantiene su aviso y envía lo de siempre', () => {
		const { component, created } = create('EXAMEN');
		component.titulo = 'Parcial';
		component.duracionMinutos = 45;

		expect(component.mostrarCalificableAlCrear()).toBe(false);
		expect(document.body.textContent).toContain('Esto no se calificará automáticamente.');

		component.onSave();

		expect(created).toHaveLength(1);
		expect(created[0]).not.toHaveProperty('evaluacion');
	});

	it('apagar el control crea sin bloque de evaluación', () => {
		const { component, created } = create();
		component.titulo = 'Ensayo';
		component.esCalificable = false;

		component.onSave();

		expect(created).toHaveLength(1);
		expect(created[0]).not.toHaveProperty('evaluacion');
	});

	it('con el control activo manda el peso como fracción en la misma petición', () => {
		const { component, created } = create();
		component.titulo = 'Ensayo';
		component.pesoPct = 25;

		component.onSave();

		expect(created).toEqual([expect.objectContaining({ titulo: 'Ensayo', evaluacion: { peso: 0.25 } })]);
	});

	it('el peso no puede salir del rango 1–100 ni superar el cupo conocido', () => {
		const { component, created } = create('TAREA', { cupo: { pesoUsado: 0.8, cupoRestante: 0.2 } });
		component.titulo = 'Ensayo';

		component.pesoPct = 0;
		expect(component.errorPeso()).toBe('El peso debe estar entre 1 % y 100 %.');
		component.pesoPct = 30;
		expect(component.errorPeso()).toBe('El peso no puede superar el cupo disponible (20 %).');
		component.onSave();
		expect(created).toEqual([]);

		component.pesoPct = 20;
		expect(component.errorPeso()).toBeNull();
		component.onSave();
		expect(created).toHaveLength(1);
	});

	it('sin cupo restante explica que hay que apagar el control', () => {
		const { component } = create('TAREA', { cupo: { pesoUsado: 1, cupoRestante: 0 } });
		component.pesoPct = 5;

		expect(component.errorPeso()).toContain('ya no tiene cupo');
	});

	it('muestra el rechazo del servidor sin vaciar lo escrito', () => {
		const { fixture, component } = create();
		component.titulo = 'Ensayo';
		component.pesoPct = 25;

		fixture.componentRef.setInput('errorServidor', 'El peso supera el cupo de evaluaciones del curso.');
		fixture.detectChanges();

		expect(document.body.textContent).toContain('El peso supera el cupo de evaluaciones del curso.');
		expect(component.titulo).toBe('Ensayo');
		expect(component.pesoPct).toBe(25);
	});
});
