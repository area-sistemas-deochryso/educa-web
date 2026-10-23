// * Tests de H03 (P110-F10): el peso se pide y se muestra como porcentaje entero; la API sigue recibiendo la fracción 0–1.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services';
import type { CalificacionDto, CrearCalificacionDto, CursoContenidoSemanaDto } from '@features/intranet/pages/profesor/models';
import { TIPOS_EVALUACION, tipoEvaluacionLabel } from '@features/intranet/pages/profesor/models';
import { EvaluacionFormDialogComponent } from './evaluacion-form-dialog.component';
// #endregion

const FECHA = '2026-03-10T00:00:00';

function evaluacion(peso: number): CalificacionDto {
	return {
		id: 1,
		cursoContenidoId: 5,
		tareaId: null,
		semanaId: 3,
		numeroSemana: 1,
		titulo: 'Examen',
		peso,
		fechaEvaluacion: FECHA,
		tipo: 'Examen',
		esGrupal: false,
		estado: true,
	};
}

describe('EvaluacionFormDialogComponent — peso en porcentaje', () => {
	let showWarning: ReturnType<typeof vi.fn>;

	function create(editing: CalificacionDto | null) {
		const fixture = TestBed.createComponent(EvaluacionFormDialogComponent);
		fixture.componentRef.setInput('contenidoId', 5);
		fixture.componentRef.setInput('editing', editing);
		fixture.detectChanges();
		const emitted: CrearCalificacionDto[] = [];
		fixture.componentInstance.save.subscribe((dto) => emitted.push(dto));
		return { component: fixture.componentInstance, emitted };
	}

	beforeEach(() => {
		showWarning = vi.fn();
		TestBed.configureTestingModule({
			imports: [EvaluacionFormDialogComponent],
			providers: [{ provide: ErrorHandlerService, useValue: { showWarning } }],
		});
	});

	it('starts a new evaluation at 20 %, not at 0.2', () => {
		const { component } = create(null);

		expect(component.formData().peso).toBe(20);
	});

	it('loads an existing weight in percent, never 20 for 0.2 or the reverse', () => {
		expect(create(evaluacion(0.2)).component.formData().peso).toBe(20);
		expect(create(evaluacion(0.35)).component.formData().peso).toBe(35);
		expect(create(evaluacion(1)).component.formData().peso).toBe(100);
	});

	it('sends the contract fraction when saving an edited evaluation', () => {
		const { component, emitted } = create(evaluacion(0.35));

		component.onSave();

		expect(emitted).toHaveLength(1);
		expect(emitted[0].peso).toBe(0.35);
	});

	it('sends the contract fraction for a value typed by the teacher', () => {
		const { component, emitted } = create(evaluacion(0.2));
		component.updateField('peso', 15);

		component.onSave();

		expect(emitted[0].peso).toBe(0.15);
	});

	it('rejects a percentage outside 1-100', () => {
		const { component } = create(evaluacion(0.2));

		component.updateField('peso', 0);
		expect(component.isFormValid()).toBe(false);
		component.updateField('peso', 101);
		expect(component.isFormValid()).toBe(false);
		component.updateField('peso', 100);
		expect(component.isFormValid()).toBe(true);
	});

	it('warns in percent when the typed weight is clamped', () => {
		const { component } = create(null);

		component.onPesoInput({ value: 150 } as never);
		component.onPesoBlur();

		expect(showWarning).toHaveBeenCalledWith('Peso ajustado', 'El peso máximo es 100 %, se ajustó automáticamente.');
	});
});

describe('EvaluacionFormDialogComponent — tipo y fecha de la semana', () => {
	function semana(id: number, fechaInicio: string | null, fechaFin: string | null): CursoContenidoSemanaDto {
		return { id, numeroSemana: id, titulo: null, fechaInicio, fechaFin } as unknown as CursoContenidoSemanaDto;
	}

	function create() {
		TestBed.configureTestingModule({
			imports: [EvaluacionFormDialogComponent],
			providers: [{ provide: ErrorHandlerService, useValue: { showWarning: vi.fn() } }],
		});
		const fixture = TestBed.createComponent(EvaluacionFormDialogComponent);
		fixture.componentRef.setInput('contenidoId', 5);
		fixture.componentRef.setInput('semanas', [
			semana(1, '2026-03-02T00:00:00', '2026-03-08T00:00:00'),
			semana(2, '2026-03-09T00:00:00', '2026-03-15T00:00:00'),
			semana(3, null, null),
		]);
		fixture.detectChanges();
		return fixture.componentInstance;
	}

	it('labels types with accents while the value sent to the BE stays unaccented', () => {
		const component = create();

		const exposicion = component.tiposOptions.find((o) => o.value === 'Exposicion');
		expect(exposicion).toEqual({ label: 'Exposición', value: 'Exposicion' });
		expect(tipoEvaluacionLabel('Participacion')).toBe('Participación');
		expect(tipoEvaluacionLabel('desconocido')).toBe('desconocido');
		expect(component.tiposOptions).toHaveLength(TIPOS_EVALUACION.length);
	});

	it('bounds the datepicker to the selected week', () => {
		const component = create();

		component.onSemanaChange(2);

		const rango = component.rangoSemana();
		expect(rango?.min).toEqual(new Date(2026, 2, 9));
		expect(rango?.max).toEqual(new Date(2026, 2, 15));
	});

	it('leaves the datepicker free when the week has no dates', () => {
		const component = create();

		component.onSemanaChange(3);

		expect(component.rangoSemana()).toBeNull();
	});

	it('clears a date that falls outside the newly selected week', () => {
		const component = create();
		component.onSemanaChange(1);
		component.updateField('fechaEvaluacion', new Date(2026, 2, 5));

		component.onSemanaChange(2);

		expect(component.formData().fechaEvaluacion).toBeNull();
	});

	it('keeps a date that is inside the newly selected week', () => {
		const component = create();
		component.updateField('fechaEvaluacion', new Date(2026, 2, 10));

		component.onSemanaChange(2);

		expect(component.formData().fechaEvaluacion).toEqual(new Date(2026, 2, 10));
	});

	it('changes the title placeholder with the type', () => {
		const component = create();

		component.updateField('tipo', 'Exposicion');

		expect(component.tituloPlaceholder()).toContain('Exposición');
	});
});

describe('EvaluacionFormDialogComponent — alta desde una tarea (P114-F5b, INV-C16)', () => {
	const semana = { id: 3, numeroSemana: 1, titulo: null, fechaInicio: '2026-10-05', fechaFin: '2026-10-11' } as CursoContenidoSemanaDto;

	function create(fecha: string | null) {
		const fixture = TestBed.createComponent(EvaluacionFormDialogComponent);
		fixture.componentRef.setInput('contenidoId', 5);
		fixture.componentRef.setInput('semanas', [semana]);
		fixture.componentRef.setInput('prefill', { titulo: 'Ensayo', semanaId: 3, fechaEvaluacion: fecha, tareaId: 7, esGrupal: true });
		fixture.detectChanges();
		const emitted: CrearCalificacionDto[] = [];
		fixture.componentInstance.save.subscribe((dto) => emitted.push(dto));
		return { component: fixture.componentInstance, emitted };
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [EvaluacionFormDialogComponent],
			providers: [{ provide: ErrorHandlerService, useValue: { showWarning: vi.fn() } }],
		});
	});

	it('prellena título, semana, fecha, modalidad y tarea, pero no el peso', () => {
		const { component } = create('2026-10-08T00:00:00');

		const data = component.formData();
		expect(data).toMatchObject({ titulo: 'Ensayo', semanaId: 3, tareaId: 7, esGrupal: true, tipo: 'Tarea', peso: null });
		expect(data.fechaEvaluacion).not.toBeNull();
		expect(component.isFormValid()).toBe(false);
	});

	it('descarta la fecha de la tarea si cae fuera de su semana', () => {
		const { component } = create('2026-11-20T00:00:00');

		expect(component.formData().fechaEvaluacion).toBeNull();
	});

	it('envía la evaluación enlazada una vez que el profesor elige el peso', () => {
		const { component, emitted } = create('2026-10-08T00:00:00');

		component.onSave();
		expect(emitted).toEqual([]);

		component.updateField('peso', 25);
		component.onSave();
		expect(emitted).toHaveLength(1);
		expect(emitted[0]).toMatchObject({ tareaId: 7, semanaId: 3, esGrupal: true, peso: 0.25, titulo: 'Ensayo' });
	});
});
