import { describe, expect, it, vi } from 'vitest';
import type { ActivatedRoute, ParamMap } from '@angular/router';

import {
	AutoOpenTarget,
	findAutoOpenMatch,
	readAutoOpenQueryParams,
} from './auto-open-from-query.helper';
import type { UsuarioLista } from '../services';

function fakeRoute(params: Record<string, string>): ActivatedRoute {
	const map: ParamMap = {
		has: (k) => k in params,
		get: (k) => (k in params ? params[k] : null),
		getAll: (k) => (k in params ? [params[k]] : []),
		keys: Object.keys(params),
	};
	return { snapshot: { queryParamMap: map } } as unknown as ActivatedRoute;
}

function user(partial: Partial<UsuarioLista>): UsuarioLista {
	return {
		id: 1,
		dni: '00000000',
		nombres: '',
		apellidos: '',
		nombreCompleto: '',
		rol: 'Estudiante',
		estado: true,
		fechaRegistro: '2026-01-01',
		sedeId: 1,
		rowVersion: 'v1',
		...partial,
	} as UsuarioLista;
}

describe('readAutoOpenQueryParams', () => {
	it('returns null when no recognized params are present', () => {
		const setSearch = vi.fn();
		const target = readAutoOpenQueryParams(fakeRoute({}), setSearch);
		expect(target).toBeNull();
		expect(setSearch).not.toHaveBeenCalled();
	});

	describe('DNI branch', () => {
		it('filters by dni and arms target when autoOpen=true', () => {
			const setSearch = vi.fn();
			const target = readAutoOpenQueryParams(
				fakeRoute({ dni: '74125896', autoOpen: 'true' }),
				setSearch,
			);
			expect(setSearch).toHaveBeenCalledWith('74125896');
			expect(target).toEqual({ kind: 'dni', dni: '74125896' });
		});

		it('filters by dni without autoOpen but returns null target', () => {
			const setSearch = vi.fn();
			const target = readAutoOpenQueryParams(fakeRoute({ dni: '74125896' }), setSearch);
			expect(setSearch).toHaveBeenCalledWith('74125896');
			expect(target).toBeNull();
		});

		it('ignores legacy params when dni is present', () => {
			const setSearch = vi.fn();
			const target = readAutoOpenQueryParams(
				fakeRoute({
					dni: '74125896',
					autoOpen: 'true',
					openUserId: '5',
					openUserRol: 'Director',
				}),
				setSearch,
			);
			expect(target).toEqual({ kind: 'dni', dni: '74125896' });
			expect(setSearch).toHaveBeenCalledWith('74125896');
			expect(setSearch).toHaveBeenCalledTimes(1);
		});
	});

	describe('legacy id branch', () => {
		it('arms id target and filters by openUserName', () => {
			const setSearch = vi.fn();
			const target = readAutoOpenQueryParams(
				fakeRoute({
					autoOpen: 'true',
					openUserId: '42',
					openUserRol: 'Profesor',
					openUserName: 'Juan Pérez',
				}),
				setSearch,
			);
			expect(setSearch).toHaveBeenCalledWith('Juan Pérez');
			expect(target).toEqual({ kind: 'id', id: 42, rol: 'Profesor' });
		});

		it('returns null when autoOpen is missing', () => {
			const setSearch = vi.fn();
			const target = readAutoOpenQueryParams(
				fakeRoute({ openUserId: '42', openUserRol: 'Profesor' }),
				setSearch,
			);
			expect(target).toBeNull();
			expect(setSearch).not.toHaveBeenCalled();
		});

		it('returns null when openUserId or openUserRol are invalid', () => {
			const setSearch = vi.fn();
			expect(
				readAutoOpenQueryParams(
					fakeRoute({ autoOpen: 'true', openUserId: 'abc', openUserRol: 'Profesor' }),
					setSearch,
				),
			).toBeNull();
			expect(
				readAutoOpenQueryParams(
					fakeRoute({ autoOpen: 'true', openUserId: '42' }),
					setSearch,
				),
			).toBeNull();
		});
	});
});

describe('findAutoOpenMatch', () => {
	describe('id target', () => {
		const target: AutoOpenTarget = { kind: 'id', id: 5, rol: 'Director' };

		it('matches when id and rol coincide', () => {
			const items = [user({ id: 5, rol: 'Director' }), user({ id: 6, rol: 'Profesor' })];
			expect(findAutoOpenMatch(target, items)).toBe(items[0]);
		});

		it('returns null when no match', () => {
			expect(findAutoOpenMatch(target, [user({ id: 9, rol: 'Director' })])).toBeNull();
		});

		it('returns null when items empty or undefined', () => {
			expect(findAutoOpenMatch(target, [])).toBeNull();
			expect(findAutoOpenMatch(target, undefined)).toBeNull();
		});
	});

	describe('dni target', () => {
		const target: AutoOpenTarget = { kind: 'dni', dni: '74125896' };

		it('matches when exactly one item has the dni', () => {
			const items = [user({ id: 1, dni: '74125896' }), user({ id: 2, dni: '11111111' })];
			expect(findAutoOpenMatch(target, items)).toBe(items[0]);
		});

		it('returns null when zero matches', () => {
			expect(findAutoOpenMatch(target, [user({ dni: '00000000' })])).toBeNull();
		});

		it('returns null when 2+ matches (ambiguous)', () => {
			const items = [user({ id: 1, dni: '74125896' }), user({ id: 2, dni: '74125896' })];
			expect(findAutoOpenMatch(target, items)).toBeNull();
		});

		it('returns null when items empty or undefined', () => {
			expect(findAutoOpenMatch(target, [])).toBeNull();
			expect(findAutoOpenMatch(target, undefined)).toBeNull();
		});
	});
});
