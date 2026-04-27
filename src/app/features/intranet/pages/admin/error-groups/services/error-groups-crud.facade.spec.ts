import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { WalFacadeHelper } from '@core/services/wal/wal-facade-helper.service';

import {
	CambiarEstadoErrorGroup,
	ErrorGroupLista,
	type ErrorGroupEstado,
} from '../models';
import { ErrorGroupsCrudFacade } from './error-groups-crud.facade';
import { ErrorGroupsDataFacade } from './error-groups-data.facade';
import { ErrorGroupsService } from './error-groups.service';
import { ErrorGroupsStore } from './error-groups.store';

function makeGroup(estado: ErrorGroupEstado = 'NUEVO'): ErrorGroupLista {
	return {
		id: 1,
		fingerprintCorto: 'abc123',
		severidad: 'ERROR',
		mensajeRepresentativo: 'msg',
		url: '/api/test',
		httpStatus: 500,
		errorCode: null,
		origen: 'BACKEND',
		estado,
		primeraFecha: '2026-04-25T10:00:00',
		ultimaFecha: '2026-04-25T11:00:00',
		contadorTotal: 5,
		contadorPostResolucion: 0,
		rowVersion: 'AAAAAAAAB9E=',
	};
}

interface CapturedConfig {
	optimistic: { apply: () => void; rollback: () => void };
	onCommit: (result: unknown) => void;
	onError: (err: unknown) => void;
}

describe('ErrorGroupsCrudFacade.cambiarEstado', () => {
	let facade: ErrorGroupsCrudFacade;
	let store: ErrorGroupsStore;
	let walHelper: { execute: ReturnType<typeof vi.fn> };
	let dataFacade: { refetchGroup: ReturnType<typeof vi.fn> };
	let errorHandler: {
		showSuccess: ReturnType<typeof vi.fn>;
		showError: ReturnType<typeof vi.fn>;
		showWarning: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		walHelper = { execute: vi.fn() };
		dataFacade = { refetchGroup: vi.fn() };
		errorHandler = {
			showSuccess: vi.fn(),
			showError: vi.fn(),
			showWarning: vi.fn(),
		};
		TestBed.configureTestingModule({
			providers: [
				ErrorGroupsCrudFacade,
				ErrorGroupsStore,
				{ provide: ErrorGroupsService, useValue: {} },
				{ provide: ErrorGroupsDataFacade, useValue: dataFacade },
				{ provide: WalFacadeHelper, useValue: walHelper },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});
		facade = TestBed.inject(ErrorGroupsCrudFacade);
		store = TestBed.inject(ErrorGroupsStore);
		store.setGroups([makeGroup('NUEVO')]);
	});

	function captureConfig(): CapturedConfig {
		expect(walHelper.execute).toHaveBeenCalled();
		const cfg = walHelper.execute.mock.calls[0][0] as CapturedConfig;
		return cfg;
	}

	it('apply mueve el estado del store y cierra el dialog', () => {
		const snap = makeGroup('NUEVO');
		const dto: CambiarEstadoErrorGroup = {
			estado: 'VISTO',
			observacion: null,
			rowVersion: snap.rowVersion,
		};
		store.openDialog(snap);
		facade.cambiarEstado(1, dto, snap);

		const cfg = captureConfig();
		cfg.optimistic.apply();
		expect(store.items()[0].estado).toBe('VISTO');
		expect(store.dialogVisible()).toBe(false);
	});

	it('rollback restaura estado y rowVersion al snapshot', () => {
		const snap = makeGroup('NUEVO');
		const dto: CambiarEstadoErrorGroup = {
			estado: 'VISTO',
			observacion: null,
			rowVersion: snap.rowVersion,
		};
		facade.cambiarEstado(1, dto, snap);
		const cfg = captureConfig();
		cfg.optimistic.apply();
		cfg.optimistic.rollback();
		expect(store.items()[0].estado).toBe('NUEVO');
		expect(store.items()[0].rowVersion).toBe(snap.rowVersion);
	});

	it('onError con INV-ET07_ROW_VERSION_STALE refetchea el grupo y muestra warning', () => {
		const snap = makeGroup('NUEVO');
		facade.cambiarEstado(
			1,
			{ estado: 'VISTO', observacion: null, rowVersion: snap.rowVersion },
			snap,
		);
		const cfg = captureConfig();
		const err = new HttpErrorResponse({
			status: 409,
			error: { errorCode: 'INV-ET07_ROW_VERSION_STALE' },
		});
		cfg.onError(err);
		expect(dataFacade.refetchGroup).toHaveBeenCalledWith(1);
		expect(errorHandler.showWarning).toHaveBeenCalled();
	});

	it('onError con ERRORGROUP_TRANSICION_INVALIDA muestra error específico', () => {
		const snap = makeGroup('NUEVO');
		facade.cambiarEstado(
			1,
			{ estado: 'VISTO', observacion: null, rowVersion: snap.rowVersion },
			snap,
		);
		const cfg = captureConfig();
		const err = new HttpErrorResponse({
			status: 409,
			error: { errorCode: 'ERRORGROUP_TRANSICION_INVALIDA' },
		});
		cfg.onError(err);
		expect(errorHandler.showError).toHaveBeenCalledWith(
			'Transición no permitida',
			expect.any(String),
		);
	});

	it('onError con 404 remueve el grupo del store', () => {
		const snap = makeGroup('NUEVO');
		facade.cambiarEstado(
			1,
			{ estado: 'VISTO', observacion: null, rowVersion: snap.rowVersion },
			snap,
		);
		const cfg = captureConfig();
		const err = new HttpErrorResponse({ status: 404, error: {} });
		cfg.onError(err);
		expect(store.items()).toHaveLength(0);
		expect(errorHandler.showWarning).toHaveBeenCalledWith(
			'Grupo no encontrado',
			expect.any(String),
		);
	});

	it('onCommit muestra success toast', () => {
		const snap = makeGroup('NUEVO');
		facade.cambiarEstado(
			1,
			{ estado: 'VISTO', observacion: null, rowVersion: snap.rowVersion },
			snap,
		);
		const cfg = captureConfig();
		cfg.onCommit('Sin cambios');
		expect(errorHandler.showSuccess).toHaveBeenCalled();
	});

	it('moveCardOptimistic con transición válida llama cambiarEstado con dto correcto', () => {
		const group = makeGroup('NUEVO');
		facade.moveCardOptimistic(group, 'IGNORADO');
		expect(walHelper.execute).toHaveBeenCalledTimes(1);
		const cfg = walHelper.execute.mock.calls[0][0] as {
			payload: { estado: string; observacion: null; rowVersion: string };
		};
		expect(cfg.payload).toEqual({
			estado: 'IGNORADO',
			observacion: null,
			rowVersion: group.rowVersion,
		});
	});

	it('moveCardOptimistic con transición inválida hace short-circuit', () => {
		// RESUELTO solo permite reabrir a NUEVO; intentar EN_PROGRESO debe ser noop.
		const group = makeGroup('RESUELTO');
		facade.moveCardOptimistic(group, 'EN_PROGRESO');
		expect(walHelper.execute).not.toHaveBeenCalled();
	});
});
