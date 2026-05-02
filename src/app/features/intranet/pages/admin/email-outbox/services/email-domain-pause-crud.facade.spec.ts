import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { WalFacadeHelper } from '@core/services/wal/wal-facade-helper.service';
import { EmailDomainPauseListaDto } from '@data/models/email-domain-pause.models';

import { EmailDomainPauseCrudFacade } from './email-domain-pause-crud.facade';
import { EmailDomainPauseDataFacade } from './email-domain-pause-data.facade';
import { EmailDomainPauseService } from './email-domain-pause.service';
import { EmailDomainPauseStore } from './email-domain-pause.store';

const mockEntry = (
	overrides: Partial<EmailDomainPauseListaDto> = {},
): EmailDomainPauseListaDto => ({
	id: 1,
	dominio: 'gmail.com',
	motivo: 'DEFER_BURST',
	triggerEventCount: 5,
	pausedUntil: '2026-05-01T18:00:00',
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

describe('EmailDomainPauseCrudFacade', () => {
	let facade: EmailDomainPauseCrudFacade;
	let store: EmailDomainPauseStore;
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
				EmailDomainPauseCrudFacade,
				EmailDomainPauseStore,
				{ provide: EmailDomainPauseService, useValue: {} },
				{ provide: EmailDomainPauseDataFacade, useValue: dataFacade },
				{ provide: WalFacadeHelper, useValue: walHelper },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});
		facade = TestBed.inject(EmailDomainPauseCrudFacade);
		store = TestBed.inject(EmailDomainPauseStore);
	});

	function captureConfig(): CapturedConfig {
		expect(walHelper.execute).toHaveBeenCalled();
		return walHelper.execute.mock.calls[0][0] as CapturedConfig;
	}

	it('addManual rechaza si observación vacía', () => {
		const ok = facade.addManual({
			dominio: 'gmail.com',
			motivo: 'MANUAL',
			durationHours: 6,
			observacion: '   ',
		});
		expect(ok).toBe(false);
		expect(walHelper.execute).not.toHaveBeenCalled();
	});

	it('release apply quita item; rollback lo restaura', () => {
		const entry = mockEntry({ id: 7 });
		store.setItems([mockEntry({ id: 1 }), entry, mockEntry({ id: 9 })]);
		store.setEstadisticas({ total: 3, activas: 3, liberadas: 0 });
		facade.release(entry);
		const cfg = captureConfig();
		cfg.optimistic.apply();
		expect(store.items().map((i) => i.id)).toEqual([1, 9]);
		cfg.optimistic.rollback();
		expect(store.items().map((i) => i.id)).toEqual([1, 7, 9]);
	});

	it('onError 404 dispara refresh + warning', () => {
		const entry = mockEntry({ id: 7 });
		store.setItems([entry]);
		facade.release(entry);
		const cfg = captureConfig();
		cfg.onError(new HttpErrorResponse({ status: 404 }));
		expect(errorHandler.showWarning).toHaveBeenCalled();
		expect(dataFacade.refresh).toHaveBeenCalled();
	});
});
