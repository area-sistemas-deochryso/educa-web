// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '@env/environment';
import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services/wal';

import { TicketTipoAdminDto } from '../models/ticket-admin.models';
import { TicketTipoCatalogoFacade } from './ticket-tipo-catalogo.facade';
// #endregion

const TIPOS_API = `${environment.apiUrl}/api/admin/ticket-tipos`;

const TIPO_ACTIVO: TicketTipoAdminDto = { id: 1, nombre: 'Error técnico', estado: true, rowVersion: 'AAAA' };
const TIPO_INACTIVO: TicketTipoAdminDto = { id: 2, nombre: 'Sugerencia vieja', estado: false, rowVersion: 'BBBB' };

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

describe('TicketTipoCatalogoFacade', () => {
	let facade: TicketTipoCatalogoFacade;
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
				TicketTipoCatalogoFacade,
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});

		facade = TestBed.inject(TicketTipoCatalogoFacade);
		httpMock = TestBed.inject(HttpTestingController);
	}

	beforeEach(() => {
		TestBed.resetTestingModule();
	});

	it('init() muestra tipos activos e inactivos', () => {
		setup(createWalMock({ commit: null }));
		facade.init();

		httpMock.expectOne(TIPOS_API).flush([TIPO_ACTIVO, TIPO_INACTIVO]);

		expect(facade.tipos()).toEqual([TIPO_ACTIVO, TIPO_INACTIVO]);
	});

	it('crear() hace POST y agrega el tipo nuevo al catálogo mostrado (disponible tras refrescar)', () => {
		const nuevoTipo: TicketTipoAdminDto = { id: 3, nombre: 'Consulta académica', estado: true, rowVersion: 'CCCC' };
		const wal = createWalMock({ commit: nuevoTipo });
		setup(wal);
		facade.init();
		httpMock.expectOne(TIPOS_API).flush([TIPO_ACTIVO]);

		facade.crear('Consulta académica');

		expect(wal.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				operation: 'CREATE',
				consistencyLevel: 'server-confirmed',
				endpoint: TIPOS_API,
				method: 'POST',
				payload: { nombre: 'Consulta académica' },
			}),
		);
		expect(facade.tipos()).toEqual([TIPO_ACTIVO, nuevoTipo]);
		expect(errorHandler.showSuccess).toHaveBeenCalled();
	});

	it('toggleEstado() desactiva un tipo sin eliminarlo del catálogo', () => {
		const desactivado: TicketTipoAdminDto = { ...TIPO_ACTIVO, estado: false, rowVersion: 'ZZZZ' };
		const wal = createWalMock({ commit: desactivado });
		setup(wal);
		facade.init();
		httpMock.expectOne(TIPOS_API).flush([TIPO_ACTIVO]);

		facade.toggleEstado(TIPO_ACTIVO);

		expect(wal.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'PATCH',
				endpoint: `${TIPOS_API}/${TIPO_ACTIVO.id}/estado`,
				payload: { estado: false, rowVersion: TIPO_ACTIVO.rowVersion },
			}),
		);
		// Sigue presente en el catálogo — solo cambia de estado, nunca se elimina.
		expect(facade.tipos()).toHaveLength(1);
		expect(facade.tipos()[0].estado).toBe(false);
	});

	it('conflicto de concurrencia (409) al editar avisa con feedback claro y refresca el catálogo', () => {
		const wal = createWalMock({ error: new HttpErrorResponse({ status: 409 }) });
		setup(wal);
		facade.init();
		httpMock.expectOne(TIPOS_API).flush([TIPO_ACTIVO]);

		facade.editar(TIPO_ACTIVO, 'Nuevo nombre');

		expect(errorHandler.showWarning).toHaveBeenCalled();
		expect(errorHandler.showError).not.toHaveBeenCalled();

		httpMock.expectOne(TIPOS_API).flush([{ ...TIPO_ACTIVO, nombre: 'Nombre actualizado por otro admin' }]);
		expect(facade.tipos()[0].nombre).toBe('Nombre actualizado por otro admin');
	});
});
