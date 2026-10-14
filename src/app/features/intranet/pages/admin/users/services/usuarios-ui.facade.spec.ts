// * Behavior tests for UsersUiFacade — block of the edit/detail doors for a user with a pending save (brief 835).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { UsersUiFacade } from './usuarios-ui.facade';
import { UsersStore } from './usuarios.store';
import { UsersService } from './usuarios.service';
import { ErrorHandlerService } from '@core/services';
import { ProfesorCursoApiService } from '@features/intranet/pages/admin/schedules/services/profesor-curso-api.service';
import { CursosApiService } from '@features/intranet/pages/admin/schedules/services/cursos-api.service';
import type { UsuarioDetalle, UsuarioLista } from '../models';
// #endregion

const usuarioA: UsuarioLista = {
	id: 43, dni: '12345612', nombres: 'DE PRUEBA', apellidos: 'ESTUDIANTE', nombreCompleto: 'ESTUDIANTE DE PRUEBA',
	rol: 'Estudiante', estado: true, fechaRegistro: '2025-01-01', sedeId: 1, rowVersion: 'v1',
};
const usuarioB: UsuarioLista = { ...usuarioA, id: 44, dni: '12345613' };
const detalleA = { ...usuarioA, contrasena: 'X' } as UsuarioDetalle;

describe('UsersUiFacade — pending save lock', () => {
	let facade: UsersUiFacade;
	let store: UsersStore;
	let api: { obtenerUsuario: ReturnType<typeof vi.fn> };
	let errorHandler: { showInfo: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = { obtenerUsuario: vi.fn().mockReturnValue(of(detalleA)) };
		errorHandler = { showInfo: vi.fn(), showError: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				UsersUiFacade,
				UsersStore,
				{ provide: UsersService, useValue: api },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: ProfesorCursoApiService, useValue: {} },
				{ provide: CursosApiService, useValue: {} },
			],
		});
		facade = TestBed.inject(UsersUiFacade);
		store = TestBed.inject(UsersStore);
	});

	it('does not open the edit dialog for a user with a pending save', () => {
		store.pendingSaves.mark(usuarioA.rol, usuarioA.id);

		facade.editUsuario(usuarioA);

		expect(api.obtenerUsuario).not.toHaveBeenCalled();
		expect(store.dialogVisible()).toBe(false);
		expect(errorHandler.showInfo).toHaveBeenCalledTimes(1);
	});

	it('does not open the detail drawer for a user with a pending save', () => {
		store.pendingSaves.mark(usuarioA.rol, usuarioA.id);

		facade.openDetail(usuarioA);

		expect(api.obtenerUsuario).not.toHaveBeenCalled();
		expect(store.detailDrawerVisible()).toBe(false);
	});

	it('does not open the edit dialog from the detail drawer for a pending user', () => {
		store.openDetailDrawer(detalleA);
		store.pendingSaves.mark(usuarioA.rol, usuarioA.id);

		facade.editFromDetail();

		expect(store.dialogVisible()).toBe(false);
		expect(errorHandler.showInfo).toHaveBeenCalledTimes(1);
	});

	it('keeps editing free for a different user', () => {
		store.pendingSaves.mark(usuarioA.rol, usuarioA.id);
		api.obtenerUsuario.mockReturnValue(of({ ...detalleA, id: usuarioB.id, dni: usuarioB.dni }));

		facade.editUsuario(usuarioB);

		expect(api.obtenerUsuario).toHaveBeenCalledWith(usuarioB.rol, usuarioB.id);
		expect(store.dialogVisible()).toBe(true);
		expect(errorHandler.showInfo).not.toHaveBeenCalled();
	});

	it('opens normally once the lock is released', () => {
		store.pendingSaves.mark(usuarioA.rol, usuarioA.id);
		store.pendingSaves.clear(usuarioA.rol, usuarioA.id);

		facade.editUsuario(usuarioA);

		expect(store.dialogVisible()).toBe(true);
	});
});
