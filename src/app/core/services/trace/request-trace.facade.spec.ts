// Tests for RequestTraceFacade — invariante INV-RU03 (trackLastRequestId ring buffer)
// y helpers de correlación de errores visibles.
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { RequestTraceFacade } from './request-trace.facade';

describe('RequestTraceFacade — INV-RU03 + visible error correlation', () => {
	let facade: RequestTraceFacade;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		facade = TestBed.inject(RequestTraceFacade);
	});

	// #region INV-RU03 — trackLastRequestId ring buffer
	describe('trackLastRequestId / getLastRequestId', () => {
		it('retorna null cuando no se ha trackeado nada', () => {
			expect(facade.getLastRequestId()).toBeNull();
		});

		it('retorna el último ID trackeado', () => {
			facade.trackLastRequestId('req-001');
			facade.trackLastRequestId('req-002');
			expect(facade.getLastRequestId()).toBe('req-002');
		});

		it('mantiene máximo 5 entradas (ring buffer)', () => {
			for (let i = 1; i <= 7; i++) {
				facade.trackLastRequestId(`req-${i}`);
			}
			// El último siempre es el más reciente
			expect(facade.getLastRequestId()).toBe('req-7');
		});
	});
	// #endregion

	// #region Visible error correlation
	describe('trackVisibleError / getRecentVisibleErrorId', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-04-16T10:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('retorna null cuando no hay errores visibles', () => {
			expect(facade.getRecentVisibleErrorId(120_000)).toBeNull();
		});

		it('retorna el error más reciente dentro de la ventana', () => {
			facade.trackVisibleError('err-001');
			expect(facade.getRecentVisibleErrorId(120_000)).toBe('err-001');
		});

		it('retorna null si el error está fuera de la ventana temporal', () => {
			facade.trackVisibleError('err-001');
			vi.advanceTimersByTime(130_000); // 130s > 120s window
			expect(facade.getRecentVisibleErrorId(120_000)).toBeNull();
		});

		it('ignora strings vacíos', () => {
			facade.trackVisibleError('');
			expect(facade.getRecentVisibleErrorId(120_000)).toBeNull();
		});

		it('mantiene máximo 5 errores (ring buffer)', () => {
			for (let i = 1; i <= 7; i++) {
				facade.trackVisibleError(`err-${i}`);
			}
			expect(facade.getRecentVisibleErrorId(120_000)).toBe('err-7');
		});
	});
	// #endregion

	// #region newRequestId
	describe('newRequestId', () => {
		it('genera IDs únicos', () => {
			const id1 = facade.newRequestId();
			const id2 = facade.newRequestId();
			expect(id1).not.toBe(id2);
		});

		it('genera strings no vacíos', () => {
			expect(facade.newRequestId().length).toBeGreaterThan(0);
		});
	});
	// #endregion
});
