import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { CorrelationSnapshot } from '../models';
import { CorrelationFacade } from './correlation.facade';
import { CorrelationService } from './correlation.service';
import { CorrelationStore } from './correlation.store';

const buildSnapshot = (id = 'abc-1'): CorrelationSnapshot => ({
	correlationId: id,
	generatedAt: '2026-04-25T10:00:00',
	errorLogs: [],
	rateLimitEvents: [],
	reportesUsuario: [],
	emailOutbox: [],
});

function createApi() {
	return {
		getSnapshot: vi.fn().mockReturnValue(of(buildSnapshot())),
	};
}

describe('CorrelationFacade', () => {
	let facade: CorrelationFacade;
	let store: CorrelationStore;
	let api: ReturnType<typeof createApi>;

	beforeEach(() => {
		api = createApi();
		TestBed.configureTestingModule({
			providers: [
				CorrelationFacade,
				CorrelationStore,
				{ provide: CorrelationService, useValue: api },
			],
		});
		facade = TestBed.inject(CorrelationFacade);
		store = TestBed.inject(CorrelationStore);
	});

	it('flips loading on, fetches the snapshot and clears loading on success', () => {
		facade.loadSnapshot('abc-1');

		expect(api.getSnapshot).toHaveBeenCalledWith('abc-1');
		expect(store.snapshot()).toEqual(buildSnapshot());
		expect(store.loading()).toBe(false);
		expect(store.error()).toBeNull();
		expect(store.correlationId()).toBe('abc-1');
	});

	it('rejects empty id without hitting the api and exposes a friendly error', () => {
		facade.loadSnapshot('   ');

		expect(api.getSnapshot).not.toHaveBeenCalled();
		expect(store.error()).toBe('CorrelationId vacío');
		expect(store.snapshot()).toBeNull();
		expect(store.loading()).toBe(false);
	});

	it('maps a 400 error to an "id inválido" message and clears the snapshot', () => {
		api.getSnapshot.mockReturnValueOnce(
			throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request' })),
		);

		facade.loadSnapshot('inválido');

		expect(store.snapshot()).toBeNull();
		expect(store.loading()).toBe(false);
		expect(store.error()).toContain('inválido');
	});

	it('maps 5xx errors to a generic retry message', () => {
		api.getSnapshot.mockReturnValueOnce(
			throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
		);

		facade.loadSnapshot('abc-1');

		expect(store.snapshot()).toBeNull();
		expect(store.loading()).toBe(false);
		expect(store.error()).toContain('No se pudo cargar');
	});
});
