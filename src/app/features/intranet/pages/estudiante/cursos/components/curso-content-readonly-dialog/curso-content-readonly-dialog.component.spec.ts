// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorHandlerService } from '@core/services';
import { EstudianteCursosFacade } from '@features/intranet/pages/estudiante/services/estudiante-cursos.facade';
import { CursoContentReadonlyDialogComponent } from './curso-content-readonly-dialog.component';

// #endregion
// #region Fixtures
const HORARIO_ID = 42;

const vm = signal({
	contentDialogVisible: true,
	contenido: { cursoNombre: 'Matemática', salonDescripcion: '5to A', numeroSemanas: 4, horarioId: HORARIO_ID },
	contentLoading: false,
	semanas: [],
	misNotasLoading: false,
	misNotasCurso: null,
	totalArchivos: 0,
	totalTareas: 0,
	archivosSummaryDialogVisible: false,
	tareasSummaryDialogVisible: false,
});

// #endregion
// #region Tests
describe('CursoContentReadonlyDialogComponent', () => {
	let fixture: ComponentFixture<CursoContentReadonlyDialogComponent>;
	const facade = { vm, closeContentDialog: vi.fn(), loadMisNotasCurso: vi.fn() };
	const router = { navigate: vi.fn() };

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [CursoContentReadonlyDialogComponent],
			providers: [
				{ provide: EstudianteCursosFacade, useValue: facade },
				{ provide: Router, useValue: router },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn() } },
			],
		});
		fixture = TestBed.createComponent(CursoContentReadonlyDialogComponent);
		fixture.detectChanges();
	});

	afterEach(() => vi.clearAllMocks());

	const $ = <T extends Element>(selector: string) => document.body.querySelector<T>(selector);
	const $$ = (selector: string) => document.body.querySelectorAll(selector);

	it('renderiza las 3 pestañas dentro de edu-tabs', () => {
		expect($$('edu-tab').length).toBe(3);
		expect($('.edu-tabs__list edu-tab')).not.toBeNull();
	});

	it('muestra "Ver salón" y "Ver asistencia" y navegan con horarioId', () => {
		const salon = $<HTMLButtonElement>('[data-info-anchor="estudiante-curso-dialog-ver-salon"]');
		const asistencia = $<HTMLButtonElement>('[data-info-anchor="estudiante-curso-dialog-ver-asistencia"]');
		expect(salon).not.toBeNull();
		expect(asistencia).not.toBeNull();

		salon?.click();
		expect(router.navigate).toHaveBeenCalledWith(['/intranet/estudiante/salones'], { queryParams: { horarioId: HORARIO_ID } });
		asistencia?.click();
		expect(router.navigate).toHaveBeenCalledWith(['/intranet/estudiante/asistencia'], { queryParams: { horarioId: HORARIO_ID } });
	});

	it('al seleccionar "Información" muestra su panel', () => {
		const tabs = $$('edu-tab');
		tabs[2].querySelector<HTMLButtonElement>('button[role="tab"]')?.click();
		fixture.detectChanges();

		expect(fixture.componentInstance.activeTab()).toBe('2');
		expect(document.body.textContent).toContain('Información del curso');
	});
});
// #endregion
