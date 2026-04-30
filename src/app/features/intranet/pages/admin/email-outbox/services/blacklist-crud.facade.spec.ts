import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { WalFacadeHelper } from '@core/services/wal/wal-facade-helper.service';
import { EmailBlacklistEntry } from '@data/models/email-blacklist.models';

import { BlacklistCrudFacade } from './blacklist-crud.facade';
import { BlacklistDataFacade } from './blacklist-data.facade';
import { BlacklistService } from './blacklist.service';
import { BlacklistStore } from './blacklist.store';

const mockEntry = (overrides: Partial<EmailBlacklistEntry> = {}): EmailBlacklistEntry => ({
	id: 1,
	correo: 'a@x.com',
	motivo: 'BOUNCE_5XX',
	motivoLabel: 'Bounce permanente 5.x.x',
	intentosFallidos: 3,
	ultimoError: null,
	estado: true,
	fechaPrimerFallo: null,
	fechaUltimoFallo: null,
	fechaReg: '2026-04-29T12:00:00',
	fechaMod: null,
	usuarioReg: 'admin',
	usuarioMod: null,
	...overrides,
});

interface CapturedConfig {
	operation: 'CREATE' | 'DELETE' | 'UPDATE';
	optimistic: { apply: () => void; rollback: () => void };
	onCommit: (result: unknown) => void;
	onError: (err: unknown) => void;
}

describe('BlacklistCrudFacade', () => {
	let facade: BlacklistCrudFacade;
	let store: BlacklistStore;
	let walHelper: { execute: ReturnType<typeof vi.fn> };
	let dataFacade: { refresh: ReturnType<typeof vi.fn> };
	let errorHandler: {
		showSuccess: ReturnType<typeof vi.fn>;
		showError: ReturnType<typeof vi.fn>;
		showWarning: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		walHelper = { execute: vi.fn() };
		dataFacade = { refresh: vi.fn() };
		errorHandler = {
			showSuccess: vi.fn(),
			showError: vi.fn(),
			showWarning: vi.fn(),
		};
		TestBed.configureTestingModule({
			providers: [
				BlacklistCrudFacade,
				BlacklistStore,
				{ provide: BlacklistService, useValue: {} },
				{ provide: BlacklistDataFacade, useValue: dataFacade },
				{ provide: WalFacadeHelper, useValue: walHelper },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});
		facade = TestBed.inject(BlacklistCrudFacade);
		store = TestBed.inject(BlacklistStore);
	});

	function captureConfig(): CapturedConfig {
		expect(walHelper.execute).toHaveBeenCalled();
		return walHelper.execute.mock.calls[0][0] as CapturedConfig;
	}

	describe('crear', () => {
		it('llama wal.execute con operation CREATE', () => {
			facade.crear({ correo: 'foo@x.com', motivo: 'MANUAL', observacion: null });
			const cfg = captureConfig();
			expect(cfg.operation).toBe('CREATE');
		});

		it('apply cierra el dialog (no agrega item — eso pasa en onCommit)', () => {
			store.openDialog();
			facade.crear({ correo: 'foo@x.com', motivo: 'MANUAL', observacion: null });
			const cfg = captureConfig();
			cfg.optimistic.apply();
			expect(store.dialogVisible()).toBe(false);
			expect(store.items()).toEqual([]);
		});

		it('onCommit agrega item al store y dispara stats', () => {
			store.setEstadisticas({ total: 5, activas: 5, inactivas: 0 });
			facade.crear({ correo: 'foo@x.com', motivo: 'MANUAL', observacion: null });
			const cfg = captureConfig();
			const newEntry = mockEntry({ id: 99, correo: 'foo@x.com', motivo: 'MANUAL' });
			cfg.onCommit(newEntry);
			expect(store.items()).toEqual([newEntry]);
			expect(store.estadisticas()).toEqual({ total: 6, activas: 6, inactivas: 0 });
		});
	});

	describe('despejar', () => {
		it('apply quita el item del listado y mueve stats', () => {
			const entry = mockEntry({ id: 42 });
			store.setItems([mockEntry({ id: 1 }), entry, mockEntry({ id: 3 })]);
			store.setEstadisticas({ total: 3, activas: 3, inactivas: 0 });
			facade.despejar(entry);
			const cfg = captureConfig();
			cfg.optimistic.apply();
			expect(store.items().map((i) => i.id)).toEqual([1, 3]);
			expect(store.estadisticas()).toEqual({ total: 3, activas: 2, inactivas: 1 });
		});

		it('rollback restaura el item en su posición original', () => {
			const entry = mockEntry({ id: 42 });
			store.setItems([mockEntry({ id: 1 }), entry, mockEntry({ id: 3 })]);
			store.setEstadisticas({ total: 3, activas: 3, inactivas: 0 });
			facade.despejar(entry);
			const cfg = captureConfig();
			cfg.optimistic.apply();
			cfg.optimistic.rollback();
			expect(store.items().map((i) => i.id)).toEqual([1, 42, 3]);
			expect(store.estadisticas()).toEqual({ total: 3, activas: 3, inactivas: 0 });
		});

		it('onError 404 dispara refresh + warning', () => {
			const entry = mockEntry({ id: 42 });
			store.setItems([entry]);
			facade.despejar(entry);
			const cfg = captureConfig();
			cfg.onError(new HttpErrorResponse({ status: 404 }));
			expect(errorHandler.showWarning).toHaveBeenCalled();
			expect(dataFacade.refresh).toHaveBeenCalled();
		});

		it('onError genérico solo muestra error toast (sin refresh)', () => {
			const entry = mockEntry({ id: 42 });
			store.setItems([entry]);
			facade.despejar(entry);
			const cfg = captureConfig();
			cfg.onError(new HttpErrorResponse({ status: 500 }));
			expect(errorHandler.showError).toHaveBeenCalled();
			expect(dataFacade.refresh).not.toHaveBeenCalled();
		});
	});
});
