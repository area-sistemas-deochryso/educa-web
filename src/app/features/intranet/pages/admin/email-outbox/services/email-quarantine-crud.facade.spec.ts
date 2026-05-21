import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services/error';
import { WalFacadeHelper } from '@core/services/wal';
import { EmailQuarantineListaDto } from '@data/models/email-quarantine.models';

import { EmailQuarantineCrudFacade } from './email-quarantine-crud.facade';
import { EmailQuarantineDataFacade } from './email-quarantine-data.facade';
import { EmailQuarantineService } from './email-quarantine.service';
import { EmailQuarantineStore } from './email-quarantine.store';

const mockEntry = (
	overrides: Partial<EmailQuarantineListaDto> = {},
): EmailQuarantineListaDto => ({
	id: 1,
	destinatario: 'a@x.com',
	motivo: 'MAILBOX_FULL',
	quarantineCount: 1,
	retryAfter: '2026-05-01T12:00:00',
	estado: true,
	observacion: null,
	fechaReg: '2026-04-29T12:00:00',
	fechaMod: null,
	usuarioReg: 'admin',
	usuarioMod: null,
	rowVersion: 'AAAA',
	...overrides,
});

interface CapturedConfig {
	operation: 'CREATE' | 'UPDATE' | 'DELETE';
	optimistic: { apply: () => void; rollback: () => void };
	onCommit: (result: unknown) => void;
	onError: (err: unknown) => void;
}

describe('EmailQuarantineCrudFacade', () => {
	let facade: EmailQuarantineCrudFacade;
	let store: EmailQuarantineStore;
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
				EmailQuarantineCrudFacade,
				EmailQuarantineStore,
				{ provide: EmailQuarantineService, useValue: {} },
				{ provide: EmailQuarantineDataFacade, useValue: dataFacade },
				{ provide: WalFacadeHelper, useValue: walHelper },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});
		facade = TestBed.inject(EmailQuarantineCrudFacade);
		store = TestBed.inject(EmailQuarantineStore);
	});

	function captureConfig(): CapturedConfig {
		expect(walHelper.execute).toHaveBeenCalled();
		return walHelper.execute.mock.calls[0][0] as CapturedConfig;
	}

	describe('addManual', () => {
		it('rechaza cuando observación está vacía y muestra error', () => {
			const ok = facade.addManual({
				destinatario: 'foo@x.com',
				motivo: 'MANUAL',
				durationHours: 24,
				observacion: '',
			});
			expect(ok).toBe(false);
			expect(walHelper.execute).not.toHaveBeenCalled();
			expect(errorHandler.showError).toHaveBeenCalled();
		});

		it('llama wal.execute con CREATE cuando hay observación', () => {
			const ok = facade.addManual({
				destinatario: 'foo@x.com',
				motivo: 'MANUAL',
				durationHours: 24,
				observacion: 'razón válida',
			});
			expect(ok).toBe(true);
			const cfg = captureConfig();
			expect(cfg.operation).toBe('CREATE');
		});

		it('apply cierra el dialog y onCommit agrega item', () => {
			store.openDialog();
			store.setEstadisticas({ total: 5, activas: 5, liberadas: 0 });
			facade.addManual({
				destinatario: 'foo@x.com',
				motivo: 'MANUAL',
				durationHours: 24,
				observacion: 'razón',
			});
			const cfg = captureConfig();
			cfg.optimistic.apply();
			expect(store.dialogVisible()).toBe(false);
			cfg.onCommit(mockEntry({ id: 99, destinatario: 'foo@x.com' }));
			expect(store.items().map((i) => i.id)).toEqual([99]);
			expect(store.estadisticas()).toEqual({ total: 6, activas: 6, liberadas: 0 });
		});
	});

	describe('release', () => {
		it('apply quita el item y mueve stats', () => {
			const entry = mockEntry({ id: 42 });
			store.setItems([mockEntry({ id: 1 }), entry, mockEntry({ id: 3 })]);
			store.setEstadisticas({ total: 3, activas: 3, liberadas: 0 });
			facade.release(entry);
			const cfg = captureConfig();
			cfg.optimistic.apply();
			expect(store.items().map((i) => i.id)).toEqual([1, 3]);
			expect(store.estadisticas()).toEqual({ total: 3, activas: 2, liberadas: 1 });
		});

		it('rollback restaura el item en posición original', () => {
			const entry = mockEntry({ id: 42 });
			store.setItems([mockEntry({ id: 1 }), entry, mockEntry({ id: 3 })]);
			store.setEstadisticas({ total: 3, activas: 3, liberadas: 0 });
			facade.release(entry);
			const cfg = captureConfig();
			cfg.optimistic.apply();
			cfg.optimistic.rollback();
			expect(store.items().map((i) => i.id)).toEqual([1, 42, 3]);
			expect(store.estadisticas()).toEqual({ total: 3, activas: 3, liberadas: 0 });
		});

		it('onError 404 dispara refresh + warning', () => {
			const entry = mockEntry({ id: 42 });
			store.setItems([entry]);
			facade.release(entry);
			const cfg = captureConfig();
			cfg.onError(new HttpErrorResponse({ status: 404 }));
			expect(errorHandler.showWarning).toHaveBeenCalled();
			expect(dataFacade.refresh).toHaveBeenCalled();
		});

		it('onError genérico solo muestra error toast (sin refresh)', () => {
			const entry = mockEntry({ id: 42 });
			store.setItems([entry]);
			facade.release(entry);
			const cfg = captureConfig();
			cfg.onError(new HttpErrorResponse({ status: 500 }));
			expect(errorHandler.showError).toHaveBeenCalled();
			expect(dataFacade.refresh).not.toHaveBeenCalled();
		});
	});
});
