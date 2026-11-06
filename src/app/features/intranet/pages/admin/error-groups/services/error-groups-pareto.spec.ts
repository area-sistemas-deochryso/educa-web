// #region Imports
import { Observable, Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorGroupsPareto } from './error-groups-pareto';
import type { ErrorGroupsService } from './error-groups.service';
import type { ErrorGroupsStore } from './error-groups.store';
// #endregion

// #region Tests
describe('ErrorGroupsPareto', () => {
	let loading: boolean;
	let store: {
		paretoLoading: ReturnType<typeof vi.fn>;
		excluirRuido: ReturnType<typeof vi.fn>;
		excluirNegocio: ReturnType<typeof vi.fn>;
		setParetoItems: ReturnType<typeof vi.fn>;
		setParetoLoading: ReturnType<typeof vi.fn>;
	};
	let getPareto: ReturnType<typeof vi.fn>;
	const passthrough = <T>(source: Observable<T>) => source;

	function build(): ErrorGroupsPareto {
		return new ErrorGroupsPareto(
			{ getPareto } as unknown as ErrorGroupsService,
			store as unknown as ErrorGroupsStore,
			passthrough,
		);
	}

	beforeEach(() => {
		loading = false;
		store = {
			paretoLoading: vi.fn(() => loading),
			excluirRuido: vi.fn(() => true),
			excluirNegocio: vi.fn(() => false),
			setParetoItems: vi.fn(),
			setParetoLoading: vi.fn((v: boolean) => (loading = v)),
		};
		getPareto = vi.fn();
	});

	it('no relanza la carga si ya está cargando', () => {
		loading = true;
		build().loadPareto();
		expect(getPareto).not.toHaveBeenCalled();
		expect(store.setParetoLoading).not.toHaveBeenCalled();
	});

	it('pasa los filtros excluirRuido y excluirNegocio al servicio', () => {
		getPareto.mockReturnValue(of([]));
		build().loadPareto();
		expect(getPareto).toHaveBeenCalledWith(true, false);
	});

	it('marca loading mientras espera y guarda los items al responder', () => {
		const subject = new Subject<unknown[]>();
		getPareto.mockReturnValue(subject);
		build().loadPareto();
		expect(loading).toBe(true);
		expect(store.setParetoItems).not.toHaveBeenCalled();

		const items = [{ id: 1 }];
		subject.next(items);
		expect(store.setParetoItems).toHaveBeenCalledWith(items);
		expect(loading).toBe(false);
	});

	it('ante error vacía los items y apaga loading (degradación silenciosa)', () => {
		getPareto.mockReturnValue(throwError(() => new Error('500')));
		build().loadPareto();
		expect(store.setParetoItems).toHaveBeenCalledWith([]);
		expect(loading).toBe(false);
	});

	it('aplica el operador takeUntilDestroyed recibido', () => {
		getPareto.mockReturnValue(of([]));
		const wrap = vi.fn(<T>(s: Observable<T>) => s);
		new ErrorGroupsPareto(
			{ getPareto } as unknown as ErrorGroupsService,
			store as unknown as ErrorGroupsStore,
			wrap,
		).loadPareto();
		expect(wrap).toHaveBeenCalledTimes(1);
	});
});
// #endregion
