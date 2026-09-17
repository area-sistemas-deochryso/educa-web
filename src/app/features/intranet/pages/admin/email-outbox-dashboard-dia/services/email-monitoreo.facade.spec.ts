// * Tests for EmailMonitoreoFacade SignalR handlers — DeferFailStatusUpdatedEvent
// * (F6 point 6: the subject was wired in specs but never emitted, so the
// * handler stayed unexercised).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { Subject } from 'rxjs';

import { EmailMonitoreoFacade } from './email-monitoreo.facade';
import { EmailMonitoreoStore } from './email-monitoreo.store';
import { EmailMonitoreoApiService } from './email-monitoreo.api.service';
import {
	DeferFailStatusUpdatedEvent,
	EmailHubService,
	EmailOutboxApiService,
} from '@features/intranet/pages/admin/email-outbox-shared';
import { ErrorHandlerService } from '@core/services';
// #endregion

// #region Tests
describe('EmailMonitoreoFacade — SignalR handlers', () => {
	let facade: EmailMonitoreoFacade;
	let deferFailStatusUpdated$: Subject<DeferFailStatusUpdatedEvent>;
	let outboxApi: { deferFailStatus: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		deferFailStatusUpdated$ = new Subject<DeferFailStatusUpdatedEvent>();
		outboxApi = { deferFailStatus: vi.fn().mockReturnValue(of({ status: 'OK' })) };

		TestBed.configureTestingModule({
			providers: [
				EmailMonitoreoFacade,
				EmailMonitoreoStore,
				{ provide: EmailMonitoreoApiService, useValue: {
					getSenderStats: vi.fn().mockReturnValue(of([])),
					getTopDestinatarios: vi.fn().mockReturnValue(of([])),
					getSerieTemporal: vi.fn().mockReturnValue(of([])),
					getDominiosReceptores: vi.fn().mockReturnValue(of([])),
					getCandidatosBlacklist: vi.fn().mockReturnValue(of([])),
				} },
				{ provide: EmailOutboxApiService, useValue: outboxApi },
				{ provide: EmailHubService, useValue: {
					blacklistEntryCreated$: new Subject(),
					deferFailStatusUpdated$: deferFailStatusUpdated$.asObservable(),
					candidatoBlacklistDetectado$: new Subject(),
					connect: vi.fn().mockResolvedValue(undefined),
					disconnect: vi.fn().mockResolvedValue(undefined),
					connected: () => false,
				} },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showWarning: vi.fn(), showSuccess: vi.fn() } },
			],
		});

		facade = TestBed.inject(EmailMonitoreoFacade);
	});

	it('DeferFailStatusUpdated reloads the defer-fail snapshot', async () => {
		await facade.startHub();
		expect(outboxApi.deferFailStatus).not.toHaveBeenCalled();

		deferFailStatusUpdated$.next({ status: 'WARNING', contadorActual: 5, threshold: 10 });

		expect(outboxApi.deferFailStatus).toHaveBeenCalledTimes(1);
		expect(facade.vm().deferFailLoading).toBe(false);
	});
});
// #endregion
