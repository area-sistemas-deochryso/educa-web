// * Tests for ClassroomsAdminComponent — "Reabrir periodo (dev)" gating, brief 808 (P110-F18).
// #region Imports
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClassroomsAdminComponent } from './salones-admin.component';
import { ClassroomsAdminStore } from './services';
// #endregion

const env = vi.hoisted(() => ({ testTools: false }));

vi.mock('@config/environment', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@config/environment')>();
	return {
		...actual,
		environment: {
			...actual.environment,
			debug: {
				...actual.environment.debug,
				get testTools() {
					return env.testTools;
				},
			},
		},
	};
});

const periodoCerrado = {
	id: 7,
	nombre: 'Anual',
	nivel: 'Inicial' as const,
	anio: 2026,
	orden: 1,
	fechaInicio: '2026-03-01',
	fechaFin: '2026-12-15',
	estadoCierre: 'CERRADO',
};

describe('ClassroomsAdminComponent — Reabrir periodo (dev)', () => {
	let store: ClassroomsAdminStore;

	function render(testTools: boolean): HTMLElement {
		env.testTools = testTools;
		store = TestBed.inject(ClassroomsAdminStore);
		store.setFiltroAnio(2026);
		store.setPeriodos([periodoCerrado]);
		store.setSelectedNivel('Inicial');

		const fixture = TestBed.createComponent(ClassroomsAdminComponent);
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
			],
		});
	});

	it('en desarrollo, con el periodo cerrado, muestra el control', () => {
		const el = render(true);
		expect(el.textContent).toContain('Reabrir periodo (dev)');
	});

	it('fuera de desarrollo (build de producción) el control no se renderiza', () => {
		const el = render(false);
		expect(el.textContent).toContain('Periodo Cerrado');
		expect(el.textContent).not.toContain('Reabrir periodo (dev)');
	});
});
