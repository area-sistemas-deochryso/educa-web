// Smoke tests del facade — orquestación de carga, errores y navegación.
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { Router } from '@angular/router';

import { ErrorHandlerService } from '@core/services/error';

import { AuditoriaCorreosFacade } from './auditoria-correos.facade';
import { AuditoriaCorreosService } from './auditoria-correos.service';
import { AuditoriaCorreosStore } from './auditoria-correos.store';
import { AuditoriaCorreoAsistenciaDto } from '../models';

const mockItems: AuditoriaCorreoAsistenciaDto[] = [
	{
		tipoOrigen: 'Estudiante',
		entidadId: 1,
		dni: '***1234',
		nombreCompleto: 'Perez Lucia',
		correoActual: 'lu***ia@gmail.com',
		tipoFallo: 'FAILED_INVALID_ADDRESS',
		razon: 'contiene caracteres no permitidos',
	},
];

function createApi(data: AuditoriaCorreoAsistenciaDto[] = mockItems, fail = false) {
	return {
		listar: vi.fn().mockReturnValue(fail ? throwError(() => new Error('boom')) : of(data)),
	};
}

function createErrorHandler() {
	return { showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn() };
}

function createRouter() {
	return { navigate: vi.fn() };
}

describe('AuditoriaCorreosFacade', () => {
	let facade: AuditoriaCorreosFacade;
	let store: AuditoriaCorreosStore;
	let api: ReturnType<typeof createApi>;
	let errorHandler: ReturnType<typeof createErrorHandler>;
	let router: ReturnType<typeof createRouter>;

	function setup(apiMock = createApi()) {
		api = apiMock;
		errorHandler = createErrorHandler();
		router = createRouter();

		TestBed.configureTestingModule({
			providers: [
				AuditoriaCorreosFacade,
				AuditoriaCorreosStore,
				{ provide: AuditoriaCorreosService, useValue: api },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: Router, useValue: router },
			],
		});

		facade = TestBed.inject(AuditoriaCorreosFacade);
		store = TestBed.inject(AuditoriaCorreosStore);
	}

	it('loadAuditoria carga items y marca tableReady + loading=false', () => {
		setup();
		facade.loadAuditoria();
		expect(api.listar).toHaveBeenCalledOnce();
		expect(store.items()).toEqual(mockItems);
		expect(store.tableReady()).toBe(true);
		expect(store.loading()).toBe(false);
	});

	it('loadAuditoria en error muestra toast y marca tableReady', () => {
		setup(createApi([], true));
		facade.loadAuditoria();
		expect(errorHandler.showError).toHaveBeenCalled();
		expect(store.tableReady()).toBe(true);
		expect(store.loading()).toBe(false);
	});

	it('refresh vuelve a llamar al API', () => {
		setup();
		facade.loadAuditoria();
		facade.refresh();
		expect(api.listar).toHaveBeenCalledTimes(2);
	});

	it('setFilterTipo y setSearchTerm actualizan el store', () => {
		setup();
		facade.setFilterTipo('Profesor');
		facade.setSearchTerm('lucia');
		expect(store.filterTipo()).toBe('Profesor');
		expect(store.searchTerm()).toBe('lucia');
	});

	it('clearFilters limpia tipo y búsqueda', () => {
		setup();
		facade.setFilterTipo('Profesor');
		facade.setSearchTerm('lucia');
		facade.clearFilters();
		expect(store.filterTipo()).toBeNull();
		expect(store.searchTerm()).toBe('');
	});

	it('navegarAUsuario siempre navega a /admin/usuarios', async () => {
		setup();
		await facade.navegarAUsuario(mockItems[0]);
		expect(router.navigate).toHaveBeenCalledWith(['/intranet/admin/usuarios']);
	});

	it('no dispara carga concurrente si loading=true', () => {
		setup();
		store.setLoading(true);
		facade.loadAuditoria();
		expect(api.listar).not.toHaveBeenCalled();
	});
});
