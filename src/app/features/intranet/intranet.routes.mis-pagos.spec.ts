// #region Imports
import { Route } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { viewAsGateGuard } from '@core/guards';

import { INTRANET_ROUTES } from './intranet.routes';
import { MENU_ITEMS } from './shared/config/intranet-menu.config';
// #endregion

function flatten(routes: readonly Route[]): Route[] {
	return routes.flatMap((r) => [r, ...flatten(r.children ?? [])]);
}

const CAPABILITY = 'PAGOS_ESTUDIANTE_PAGE_API_VIEW';

/**
 * xrepo-124 F8 (INV-PG17, INV-PG18): «Mis pagos» es una página independiente con capability propia, asignada solo
 * a Estudiante. El Apoderado no la tiene → el menú no la muestra y `permissionsGuard` la rechaza. Estos tests fijan
 * que la ruta no comparta autorización con otra página (sin `permissionPath`) y que el menú no reuse otra capability.
 */
describe('Mis pagos del estudiante (xrepo-124 F8)', () => {
	const route = flatten(INTRANET_ROUTES).find((r) => r.path === 'estudiante/mis-pagos');
	const items = MENU_ITEMS.filter((i) => i.route === '/intranet/estudiante/mis-pagos');

	describe('ruta', () => {
		it('está registrada con título', () => {
			expect(route).toBeDefined();
			expect(route?.title).toBe('Intranet - Mis Pagos');
		});

		it('se autoriza con su propia ruta: no declara `permissionPath` ni `standalonePermission`', () => {
			expect(route?.data?.['permissionPath']).toBeUndefined();
			expect(route?.data?.['standalonePermission']).toBeUndefined();
		});

		it('queda detrás del gate de «ver como» del rol Estudiante', () => {
			expect(route?.data?.['viewAsRol']).toBe('Estudiante');
			expect(route?.canActivate).toContain(viewAsGateGuard);
		});

		it('no existe una ruta equivalente para el Apoderado', () => {
			const rutas = flatten(INTRANET_ROUTES).map((r) => r.path ?? '');
			expect(rutas.filter((p) => /apoderado/i.test(p) && /pago/i.test(p))).toEqual([]);
		});
	});

	describe('menú', () => {
		it('tiene una sola entrada, en el módulo estudiante', () => {
			expect(items).toHaveLength(1);
			expect(items[0].modulo).toBe('estudiante');
		});

		it('exige la capability exclusiva del estudiante, no la de gestión del colegio', () => {
			expect(items[0].capability).toBe(CAPABILITY);
			expect(items[0].capability).not.toBe('PAGOS_API_MANAGE');
		});

		it('ninguna otra entrada comparte esa capability', () => {
			expect(MENU_ITEMS.filter((i) => i.capability === CAPABILITY)).toHaveLength(1);
		});
	});
});
