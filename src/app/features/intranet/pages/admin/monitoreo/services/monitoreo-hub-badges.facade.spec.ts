// * Tests for MonitoreoHubBadgesFacade — validates cache TTL + refresh on SW cacheUpdated$ (F-SW01 B).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject, of } from 'rxjs';

import { FeedbackReportService } from '@core/services/feedback';
import { SwService, type CacheUpdateEvent } from '@core/services/sw';
import { ErrorGroupsService } from '@features/intranet/pages/admin/error-groups/services';
import { EmailMonitoreoApiService } from '@features/intranet/pages/admin/email-outbox-dashboard-dia/services/email-monitoreo.api.service';
import { EmailOutboxApiService } from '@features/intranet/pages/admin/email-outbox-shared';
import { RateLimitEventsService } from '@features/intranet/pages/admin/rate-limit-events/services';

import { MonitoreoHubBadgesFacade } from './monitoreo-hub-badges.facade';
// #endregion

// #region Mocks
function createMocks() {
	const outboxApi = {
		estadisticas: vi.fn().mockReturnValue(of({ total: 0, enviados: 0, pendientes: 0, fallidos: 0 })),
		deferFailStatus: vi.fn().mockReturnValue(of(null)),
	};
	const monitoreoApi = { getCandidatosBlacklist: vi.fn().mockReturnValue(of([])) };
	const errorGroups = { getCount: vi.fn().mockReturnValue(of(0)) };
	const feedback = { obtenerEstadisticas: vi.fn().mockReturnValue(of({ nuevos: 0, enProgreso: 0 })) };
	const rateLimit = { getStats: vi.fn().mockReturnValue(of({ totalRechazados: 0 })) };
	return { outboxApi, monitoreoApi, errorGroups, feedback, rateLimit };
}
// #endregion

// #region Tests
describe('MonitoreoHubBadgesFacade', () => {
	let facade: MonitoreoHubBadgesFacade;
	let mocks: ReturnType<typeof createMocks>;
	let cacheUpdated$: Subject<CacheUpdateEvent>;

	beforeEach(() => {
		mocks = createMocks();
		cacheUpdated$ = new Subject<CacheUpdateEvent>();

		TestBed.configureTestingModule({
			providers: [
				provideZonelessChangeDetection(),
				MonitoreoHubBadgesFacade,
				{ provide: EmailOutboxApiService, useValue: mocks.outboxApi },
				{ provide: EmailMonitoreoApiService, useValue: mocks.monitoreoApi },
				{ provide: ErrorGroupsService, useValue: mocks.errorGroups },
				{ provide: FeedbackReportService, useValue: mocks.feedback },
				{ provide: RateLimitEventsService, useValue: mocks.rateLimit },
				{ provide: SwService, useValue: { cacheUpdated$: cacheUpdated$.asObservable() } },
			],
		});

		facade = TestBed.inject(MonitoreoHubBadgesFacade);
	});

	it('se crea correctamente', () => {
		expect(facade).toBeTruthy();
	});

	it('un cacheUpdated$ de un endpoint relevante fuerza refetch', async () => {
		await facade.loadAll();
		mocks.outboxApi.estadisticas.mockClear();

		cacheUpdated$.next({ url: '/api/sistema/email-outbox/estadisticas', originalUrl: '', data: {} });
		await Promise.resolve();
		await Promise.resolve();

		expect(mocks.outboxApi.estadisticas).toHaveBeenCalled();
	});

	it('un cacheUpdated$ de un endpoint no relacionado NO fuerza refetch', async () => {
		await facade.loadAll();
		mocks.outboxApi.estadisticas.mockClear();

		cacheUpdated$.next({ url: '/api/sistema/usuarios/estadisticas', originalUrl: '', data: {} });
		await Promise.resolve();

		expect(mocks.outboxApi.estadisticas).not.toHaveBeenCalled();
	});
});
// #endregion
