// #region Imports
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CalificacionConNotasDto, CalificacionNotaDto } from '@features/intranet/pages/profesor/models';
import { CalificacionesPanelComponent } from './calificaciones-panel.component';
// #endregion

// #region Fixtures
/** Nota con la forma real del BE: solo existe para quien fue calificado (los demás se omiten). */
function nota(estudianteId: number): CalificacionNotaDto {
	return {
		id: estudianteId,
		calificacionId: 1,
		estudianteId,
		estudianteNombre: `Alumno ${estudianteId}`,
		nota: 15,
		observacion: null,
		fechaCalificacion: '2026-10-10T09:00:00',
		esOverride: false,
		grupoId: null,
		grupoNombre: null,
		esEditable: true,
	};
}

function evaluacion(fechaEvaluacion: string, calificados: number[], esGrupal = false): CalificacionConNotasDto {
	return {
		id: 1,
		titulo: 'Práctica 1',
		peso: 0.2,
		tipo: 'Tarea',
		esGrupal,
		fechaEvaluacion,
		notas: calificados.map(nota),
	} as unknown as CalificacionConNotasDto;
}
// #endregion

describe('CalificacionesPanelComponent', () => {
	// Hoy = 13/10/2026 15:00 (la hora del BE puede ser anterior a «ahora» el mismo día).
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 9, 13, 15, 0, 0));
		TestBed.configureTestingModule({ imports: [CalificacionesPanelComponent] });
	});

	afterEach(() => vi.useRealTimers());

	function create(total: number, evaluaciones: CalificacionConNotasDto[] = []) {
		const fixture = TestBed.createComponent(CalificacionesPanelComponent);
		fixture.componentRef.setInput('calificacionesPorSemana', new Map([[1, evaluaciones]]));
		fixture.componentRef.setInput('periodos', []);
		fixture.componentRef.setInput('totalEstudiantes', total);
		fixture.detectChanges();
		return { fixture, cmp: fixture.componentInstance };
	}

	describe('chip de estado', () => {
		it('fecha de ayer y 0/N calificados → Atrasada', () => {
			const { cmp } = create(10);
			expect(cmp.getEstado(evaluacion('2026-10-12T00:00:00', []))).toBe('atrasada');
		});

		it('fecha de hoy con faltantes → Pendiente aunque la hora del BE sea anterior a «ahora»', () => {
			const { cmp } = create(10);
			expect(cmp.getEstado(evaluacion('2026-10-13T08:00:00', [1, 2]))).toBe('pendiente');
		});

		it('fecha futura con faltantes → Pendiente', () => {
			const { cmp } = create(10);
			expect(cmp.getEstado(evaluacion('2026-10-20T00:00:00', []))).toBe('pendiente');
		});

		it('N/N calificados → Completa, aunque la fecha ya pasó', () => {
			const { cmp } = create(2);
			expect(cmp.getEstado(evaluacion('2026-09-01T00:00:00', [1, 2]))).toBe('completa');
		});

		it('sin total de alumnos conocido → sin estado', () => {
			const { cmp } = create(0);
			expect(cmp.getEstado(evaluacion('2026-10-12T00:00:00', []))).toBeNull();
		});

		it('nunca muestra «Vencida» (INV-C12)', () => {
			const { fixture } = create(10, [evaluacion('2025-01-01T00:00:00', [])]);
			expect(fixture.nativeElement.textContent).not.toContain('Vencida');
			expect(fixture.nativeElement.textContent).toContain('Atrasada');
		});
	});

	describe('progreso', () => {
		it('una evaluación sin notas (omitida por el BE) no cuenta como calificada', () => {
			const { cmp } = create(5);
			const sinNotas = evaluacion('2026-10-13T00:00:00', []);
			expect(cmp.getNotasCount(sinNotas)).toBe(0);
			expect(cmp.getProgresoPercent(sinNotas)).toBe(0);
		});

		it('cuenta estudiantes distintos y calcula el porcentaje', () => {
			const { cmp } = create(4);
			const cal = evaluacion('2026-10-13T00:00:00', [1, 2]);
			expect(cmp.getNotasCount(cal)).toBe(2);
			expect(cmp.getProgresoPercent(cal)).toBe(50);
		});

		it('renderiza «calificados / alumnos»', () => {
			const { fixture } = create(4, [evaluacion('2026-10-13T00:00:00', [1, 2])]);
			expect(fixture.nativeElement.textContent).toContain('2/4 calificados');
		});
	});

	describe('acciones de la fila', () => {
		it('«Calificar» tiene texto visible y emite la evaluación', () => {
			const cal = evaluacion('2026-10-13T00:00:00', []);
			const { fixture, cmp } = create(3, [cal]);
			const emitted: unknown[] = [];
			cmp.calificarEstudiantes.subscribe((c) => emitted.push(c));

			const btn = fixture.nativeElement.querySelector('[data-info-anchor="profesor-calificaciones-calificar-estudiantes"]');
			expect(btn.textContent).toContain('Calificar');
			btn.click();
			expect(emitted).toEqual([cal]);
		});

		it('el menú ⋯ conserva editar, cambiar tipo y eliminar', () => {
			const cal = evaluacion('2026-10-13T00:00:00', [], false);
			const { cmp } = create(3, [cal]);
			const editar: unknown[] = [];
			const tipo: unknown[] = [];
			const eliminar: unknown[] = [];
			cmp.editarEvaluacion.subscribe((c) => editar.push(c));
			cmp.cambiarTipo.subscribe((c) => tipo.push(c));
			cmp.eliminarEvaluacion.subscribe((c) => eliminar.push(c));

			cmp.openMenu(new Event('click'), cal);
			const items = cmp.menuItems();
			expect(items.map((i) => i.label)).toEqual(['Editar evaluación', 'Cambiar a grupal', 'Eliminar evaluación']);

			for (const item of items) item.command?.({ item });
			expect(editar).toEqual([cal]);
			expect(tipo).toEqual([cal]);
			expect(eliminar).toEqual([cal]);
		});

		it('una evaluación grupal ofrece «Cambiar a individual»', () => {
			const cal = evaluacion('2026-10-13T00:00:00', [], true);
			const { cmp } = create(3, [cal]);
			cmp.openMenu(new Event('click'), cal);
			expect(cmp.menuItems().map((i) => i.label)).toContain('Cambiar a individual');
		});

		it('el botón ⋯ tiene aria-label', () => {
			const { fixture } = create(3, [evaluacion('2026-10-13T00:00:00', [])]);
			const btn = fixture.nativeElement.querySelector('[data-info-anchor="profesor-calificaciones-mas-acciones"]');
			expect(btn.getAttribute('aria-label') ?? btn.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe(
				'Más acciones de la evaluación',
			);
		});
	});

	describe('foco desde el Inicio', () => {
		let scrollIntoView: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			scrollIntoView = vi.fn();
			HTMLElement.prototype.scrollIntoView = scrollIntoView as unknown as typeof HTMLElement.prototype.scrollIntoView;
		});

		function createWithFocus(focusId: number | null, loading = false) {
			const fixture = TestBed.createComponent(CalificacionesPanelComponent);
			const consumed = vi.fn();
			fixture.componentInstance.focusConsumed.subscribe(consumed);
			fixture.componentRef.setInput('calificacionesPorSemana', new Map([[3, [evaluacion('2026-10-20T00:00:00', [])]]]));
			fixture.componentRef.setInput('periodos', []);
			fixture.componentRef.setInput('totalEstudiantes', 10);
			fixture.componentRef.setInput('loading', loading);
			fixture.componentRef.setInput('focusEvaluacionId', focusId);
			fixture.detectChanges();
			return { fixture, consumed, el: fixture.nativeElement as HTMLElement };
		}

		it('evaluación existente → se desplaza, se resalta con etiqueta y libera el foco', () => {
			const { fixture, consumed, el } = createWithFocus(1);
			fixture.detectChanges();

			expect(scrollIntoView).toHaveBeenCalledTimes(1);
			const card = el.querySelector('[data-evaluacion-id="1"]');
			expect(card?.classList.contains('evaluacion-card--focus')).toBe(true);
			expect(card?.getAttribute('aria-current')).toBe('true');
			expect(card?.textContent).toContain('Pendiente de calificar');
			expect(consumed).toHaveBeenCalledTimes(1);
		});

		it('evaluación inexistente → sin resaltado ni scroll, pero libera el foco', () => {
			const { fixture, consumed, el } = createWithFocus(999);
			fixture.detectChanges();

			expect(scrollIntoView).not.toHaveBeenCalled();
			expect(el.querySelector('.evaluacion-card--focus')).toBeNull();
			expect(consumed).toHaveBeenCalledTimes(1);
		});

		it('sin foco (flujo previo, favoritos) → comportamiento igual al actual', () => {
			const { fixture, consumed, el } = createWithFocus(null);
			fixture.detectChanges();

			expect(scrollIntoView).not.toHaveBeenCalled();
			expect(el.querySelector('.evaluacion-card--focus')).toBeNull();
			expect(consumed).not.toHaveBeenCalled();
		});

		it('espera a que termine la carga antes de resolver el foco', () => {
			const { fixture, consumed } = createWithFocus(1, true);
			expect(consumed).not.toHaveBeenCalled();

			fixture.componentRef.setInput('loading', false);
			fixture.detectChanges();
			fixture.detectChanges();

			expect(consumed).toHaveBeenCalledTimes(1);
			expect(scrollIntoView).toHaveBeenCalledTimes(1);
		});
	});
});
