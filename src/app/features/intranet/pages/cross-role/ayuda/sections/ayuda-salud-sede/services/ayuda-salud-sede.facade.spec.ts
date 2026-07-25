// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '@env/environment';
import { WalFacadeHelper } from '@core/services/wal';
import { EstadoSaludSedeDto } from '@features/intranet/pages/cross-role/ayuda/sections/ayuda-salud-sede/models/salud-sede.models';
import { AyudaSaludSedeFacade } from './ayuda-salud-sede.facade';
// #endregion

const ESTADO_API = `${environment.apiUrl}/api/salud-sede/estado`;
const REPORTES_API = `${environment.apiUrl}/api/salud-sede/reportes`;

const ESTADO_MIXTO: EstadoSaludSedeDto[] = [
	{ dimension: 'Infraestructura', rating: 'Critico', fechaCalculo: '2026-07-20T10:00:00Z' },
	{ dimension: 'Profesorado', rating: 'Bien', fechaCalculo: '2026-07-20T10:00:00Z' },
];

// #region Mocks
/**
 * Mock de `WalFacadeHelper.execute()` que ejecuta `onCommit`/`onError` de
 * forma síncrona según el `outcome` configurado — mismo patrón que
 * `GruposFacade.spec.ts` para mutaciones `server-confirmed`.
 */
function createWalMock(outcome: { commit: unknown } | { error: unknown }) {
	return {
		execute: vi.fn((config: { onCommit: (data?: never) => void; onError: (err: unknown) => void }) => {
			if ('commit' in outcome) {
				config.onCommit(outcome.commit as never);
			} else {
				config.onError(outcome.error);
			}
		}),
	};
}
// #endregion

describe('AyudaSaludSedeFacade', () => {
	let facade: AyudaSaludSedeFacade;
	let httpMock: HttpTestingController;

	function setup(wal: ReturnType<typeof createWalMock>): void {
		TestBed.configureTestingModule({
			providers: [
				AyudaSaludSedeFacade,
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: WalFacadeHelper, useValue: wal },
			],
		});

		facade = TestBed.inject(AyudaSaludSedeFacade);
		httpMock = TestBed.inject(HttpTestingController);
	}

	beforeEach(() => {
		TestBed.resetTestingModule();
	});

	it('init() carga el estado vigente por dimensión', () => {
		setup(createWalMock({ commit: null }));
		facade.init();

		const req = httpMock.expectOne(ESTADO_API);
		req.flush(ESTADO_MIXTO);

		expect(facade.estado()).toEqual(ESTADO_MIXTO);
		expect(facade.loadingEstado()).toBe(false);
	});

	it('error de red al cargar estado marca error() y deja estado vacío', () => {
		setup(createWalMock({ commit: null }));
		facade.init();

		const req = httpMock.expectOne(ESTADO_API);
		req.flush('fail', { status: 500, statusText: 'Server Error' });

		expect(facade.errorEstado()).toBe(true);
		expect(facade.estado()).toEqual([]);
	});

	it('reportar() envía dimensión + severidad vía WAL server-confirmed y recarga el estado', () => {
		const wal = createWalMock({ commit: null });
		setup(wal);

		facade.reportar('Infraestructura', 'Critico');

		expect(wal.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				consistencyLevel: 'server-confirmed',
				operation: 'CREATE',
				resourceType: 'salud-sede-reportes',
				endpoint: REPORTES_API,
				method: 'POST',
				payload: { dimension: 'Infraestructura', rating: 'Critico' },
			}),
		);

		expect(facade.submitSuccess()).toBe(true);
		expect(facade.submitting()).toBe(false);

		// Recarga automática del estado tras el submit exitoso.
		const reloadReq = httpMock.expectOne(ESTADO_API);
		reloadReq.flush(ESTADO_MIXTO);
		expect(facade.estado()).toEqual(ESTADO_MIXTO);
	});

	it('error al reportar marca submitError() sin recargar el estado', () => {
		const wal = createWalMock({ error: new Error('fail') });
		setup(wal);

		facade.reportar('Profesorado', 'Advertencia');

		expect(facade.submitError()).toBe(true);
		expect(facade.submitSuccess()).toBe(false);
		httpMock.expectNone(ESTADO_API);
	});
});
