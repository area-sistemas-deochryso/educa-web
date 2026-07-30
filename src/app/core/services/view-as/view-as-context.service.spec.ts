// * Tests for ViewAsContextService (P92 F2) — holds the admin's "ver como"
// * selection and auto-clears it once navigation leaves the matching module.
// #region Imports
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { ViewAsContextService } from './view-as-context.service';

// #endregion

// #region Helpers
@Component({ template: '', standalone: true })
class DummyComponent {}
// #endregion

// #region Tests
describe('ViewAsContextService', () => {
	let service: ViewAsContextService;
	let router: Router;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideRouter([{ path: '**', component: DummyComponent }])],
		});

		service = TestBed.inject(ViewAsContextService);
		router = TestBed.inject(Router);
	});

	it('starts with no active context', () => {
		expect(service.activeContext()).toBeNull();
	});

	it('setContext stores the selection', () => {
		service.setContext({ entityId: 7, rol: 'Profesor', nombreCompleto: 'Juan Pérez' });

		expect(service.activeContext()).toEqual({ entityId: 7, rol: 'Profesor', nombreCompleto: 'Juan Pérez' });
		expect(service.hasContextForRol('Profesor')).toBe(true);
		expect(service.hasContextForRol('Estudiante')).toBe(false);
	});

	it('clearContext removes the selection', () => {
		service.setContext({ entityId: 7, rol: 'Profesor', nombreCompleto: 'Juan Pérez' });
		service.clearContext();

		expect(service.activeContext()).toBeNull();
	});

	it('auto-clears when navigation leaves the matching module', async () => {
		service.setContext({ entityId: 7, rol: 'Profesor', nombreCompleto: 'Juan Pérez' });

		await router.navigateByUrl('/intranet/profesor/cursos');
		expect(service.activeContext()).not.toBeNull();

		await router.navigateByUrl('/intranet/admin/usuarios');
		expect(service.activeContext()).toBeNull();
	});

	it('keeps the context while navigating within the matching module', async () => {
		service.setContext({ entityId: 7, rol: 'Estudiante', nombreCompleto: 'Ana López' });

		await router.navigateByUrl('/intranet/estudiante/cursos');
		await router.navigateByUrl('/intranet/estudiante/horarios');

		expect(service.activeContext()).not.toBeNull();
	});
});
// #endregion
