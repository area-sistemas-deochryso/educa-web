// * Tests for ViewAsContextService (P92 F2) — holds the admin's "ver como"
// * selection, persists it to storage (brief 511) so F5/direct links
// * rehydrate it, and auto-clears + notifies once navigation leaves the
// * matching module.
// #region Imports
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services/error';
import { StorageService } from '@core/services/storage';

import { ViewAsContext } from './view-as-context.model';
import { ViewAsContextService } from './view-as-context.service';

// #endregion

// #region Helpers
@Component({ template: '', standalone: true })
class DummyComponent {}

/** In-memory fake — mirrors the sessionStorage-backed get/set contract without touching the real store. */
function createStorageMock(initial: ViewAsContext | null = null) {
	let stored: ViewAsContext | null = initial;
	return {
		getViewAsContext: vi.fn(() => stored),
		setViewAsContext: vi.fn((context: ViewAsContext | null) => {
			stored = context;
		}),
	};
}
// #endregion

// #region Tests
describe('ViewAsContextService', () => {
	let service: ViewAsContextService;
	let router: Router;
	let storageMock: ReturnType<typeof createStorageMock>;
	let errorHandlerMock: { showInfo: ReturnType<typeof vi.fn> };

	function configure(initialStorage: ViewAsContext | null = null): void {
		storageMock = createStorageMock(initialStorage);
		errorHandlerMock = { showInfo: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				provideRouter([{ path: '**', component: DummyComponent }]),
				{ provide: StorageService, useValue: storageMock },
				{ provide: ErrorHandlerService, useValue: errorHandlerMock },
			],
		});

		service = TestBed.inject(ViewAsContextService);
		router = TestBed.inject(Router);
	}

	beforeEach(() => configure());

	it('starts with no active context', () => {
		expect(service.activeContext()).toBeNull();
	});

	it('setContext stores the selection and persists it', () => {
		service.setContext({ entityId: 7, rol: 'Profesor', nombreCompleto: 'Juan Pérez' });

		expect(service.activeContext()).toEqual({ entityId: 7, rol: 'Profesor', nombreCompleto: 'Juan Pérez' });
		expect(service.hasContextForRol('Profesor')).toBe(true);
		expect(service.hasContextForRol('Estudiante')).toBe(false);
		expect(storageMock.setViewAsContext).toHaveBeenCalledWith({
			entityId: 7,
			rol: 'Profesor',
			nombreCompleto: 'Juan Pérez',
		});
	});

	it('clearContext removes the selection and the persisted copy', () => {
		service.setContext({ entityId: 7, rol: 'Profesor', nombreCompleto: 'Juan Pérez' });
		service.clearContext();

		expect(service.activeContext()).toBeNull();
		expect(storageMock.setViewAsContext).toHaveBeenLastCalledWith(null);
	});

	it('auto-clears when navigation leaves the matching module', async () => {
		service.setContext({ entityId: 7, rol: 'Profesor', nombreCompleto: 'Juan Pérez' });

		await router.navigateByUrl('/intranet/profesor/cursos');
		expect(service.activeContext()).not.toBeNull();

		await router.navigateByUrl('/intranet/admin/usuarios');
		expect(service.activeContext()).toBeNull();
	});

	it('notifies via ErrorHandlerService and clears storage when auto-clearing (brief 511, F1 symptom)', async () => {
		service.setContext({ entityId: 7, rol: 'Profesor', nombreCompleto: 'Juan Pérez' });

		await router.navigateByUrl('/intranet/profesor/cursos');
		expect(errorHandlerMock.showInfo).not.toHaveBeenCalled();

		await router.navigateByUrl('/intranet/ayuda');
		expect(errorHandlerMock.showInfo).toHaveBeenCalledTimes(1);
		expect(errorHandlerMock.showInfo).toHaveBeenCalledWith(
			expect.any(String),
			expect.stringContaining('Juan Pérez'),
		);
		expect(storageMock.setViewAsContext).toHaveBeenLastCalledWith(null);
	});

	it('keeps the context while navigating within the matching module', async () => {
		service.setContext({ entityId: 7, rol: 'Estudiante', nombreCompleto: 'Ana López' });

		await router.navigateByUrl('/intranet/estudiante/cursos');
		await router.navigateByUrl('/intranet/estudiante/horarios');

		expect(service.activeContext()).not.toBeNull();
		expect(errorHandlerMock.showInfo).not.toHaveBeenCalled();
	});

	it('restores a persisted context on construction (F5/direct link — brief 511, F2 symptom)', () => {
		TestBed.resetTestingModule();
		configure({ entityId: 9, rol: 'Estudiante', nombreCompleto: 'Ana López' });

		expect(service.activeContext()).toEqual({ entityId: 9, rol: 'Estudiante', nombreCompleto: 'Ana López' });
		expect(service.hasContextForRol('Estudiante')).toBe(true);
	});

	it('self-heals a restored context that no longer matches the landing URL', async () => {
		TestBed.resetTestingModule();
		configure({ entityId: 9, rol: 'Estudiante', nombreCompleto: 'Ana López' });

		await router.navigateByUrl('/intranet/ayuda');

		expect(service.activeContext()).toBeNull();
		expect(errorHandlerMock.showInfo).toHaveBeenCalledTimes(1);
	});
});
// #endregion
