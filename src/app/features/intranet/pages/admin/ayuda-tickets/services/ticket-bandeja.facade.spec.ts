// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '@env/environment';
import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services/wal';

import { TicketAdminDto } from '../models/ticket-admin.models';
import { TicketBandejaFacade } from './ticket-bandeja.facade';
// #endregion

const BANDEJA_API = `${environment.apiUrl}/api/admin/tickets`;

const TICKET: TicketAdminDto = {
	id: 1,
	tipoNombre: 'Error técnico',
	descripcion: 'La página no carga correctamente en el módulo de asistencia.',
	propuesta: null,
	estado: 'PENDIENTE',
	usuarioNombre: 'Juan Pérez',
	fechaReg: '2026-07-20T10:00:00Z',
	fechaMod: null,
	rowVersion: 'AAAA',
};

/**
 * Mock de `WalFacadeHelper.execute()` que ejecuta `onCommit`/`onError` de
 * forma síncrona según el `outcome` configurado — mismo patrón que
 * `AyudaSaludSedeFacade.spec.ts` para mutaciones `server-confirmed`.
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

describe('TicketBandejaFacade', () => {
	let facade: TicketBandejaFacade;
	let httpMock: HttpTestingController;
	let errorHandler: {
		showSuccess: ReturnType<typeof vi.fn>;
		showError: ReturnType<typeof vi.fn>;
		showWarning: ReturnType<typeof vi.fn>;
	};

	function setup(wal: ReturnType<typeof createWalMock>): void {
		errorHandler = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				TicketBandejaFacade,
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});

		facade = TestBed.inject(TicketBandejaFacade);
		httpMock = TestBed.inject(HttpTestingController);
	}

	beforeEach(() => {
		TestBed.resetTestingModule();
	});

	it('init() carga la bandeja completa', () => {
		setup(createWalMock({ commit: null }));
		facade.init();

		httpMock.expectOne(BANDEJA_API).flush([TICKET]);

		expect(facade.tickets()).toEqual([TICKET]);
		expect(facade.loading()).toBe(false);
	});

	it('setFiltro() agrega el query param estado y actualiza el listado mostrado', () => {
		setup(createWalMock({ commit: null }));
		facade.init();
		httpMock.expectOne(BANDEJA_API).flush([TICKET]);

		facade.setFiltro('RESUELTO');

		const req = httpMock.expectOne((r) => r.url === BANDEJA_API);
		expect(req.request.params.get('estado')).toBe('RESUELTO');
		req.flush([]);

		expect(facade.tickets()).toEqual([]);
		expect(facade.filtroEstado()).toBe('RESUELTO');
	});

	it('cambiarEstado() actualiza el ticket en el listado sin recargar toda la página', () => {
		const wal = createWalMock({ commit: { ...TICKET, estado: 'EN_REVISION', rowVersion: 'BBBB' } });
		setup(wal);
		facade.init();
		httpMock.expectOne(BANDEJA_API).flush([TICKET]);

		facade.cambiarEstado(TICKET, 'EN_REVISION');

		expect(wal.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				consistencyLevel: 'server-confirmed',
				method: 'PATCH',
				payload: { estado: 'EN_REVISION', rowVersion: 'AAAA' },
			}),
		);
		expect(facade.tickets()[0].estado).toBe('EN_REVISION');
		expect(facade.updatingId()).toBeNull();
		expect(errorHandler.showSuccess).toHaveBeenCalled();
	});

	it('conflicto de concurrencia (409) al cambiar estado avisa con feedback claro y refresca la bandeja', () => {
		const wal = createWalMock({ error: new HttpErrorResponse({ status: 409 }) });
		setup(wal);
		facade.init();
		httpMock.expectOne(BANDEJA_API).flush([TICKET]);

		facade.cambiarEstado(TICKET, 'EN_REVISION');

		expect(errorHandler.showWarning).toHaveBeenCalled();
		expect(errorHandler.showError).not.toHaveBeenCalled();
		expect(facade.updatingId()).toBeNull();

		// Refresca la bandeja con el valor actual del servidor.
		httpMock.expectOne(BANDEJA_API).flush([{ ...TICKET, estado: 'RESUELTO', rowVersion: 'ZZZZ' }]);
		expect(facade.tickets()[0].estado).toBe('RESUELTO');
	});

	it('un error genérico (no 409) al cambiar estado muestra error, sin refrescar', () => {
		const wal = createWalMock({ error: new HttpErrorResponse({ status: 500 }) });
		setup(wal);
		facade.init();
		httpMock.expectOne(BANDEJA_API).flush([TICKET]);

		facade.cambiarEstado(TICKET, 'EN_REVISION');

		expect(errorHandler.showError).toHaveBeenCalled();
		expect(errorHandler.showWarning).not.toHaveBeenCalled();
		expect(facade.tickets()).toEqual([TICKET]);
	});
});
