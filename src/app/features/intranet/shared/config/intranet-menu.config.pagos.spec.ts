import { describe, expect, it } from 'vitest';

import { MENU_ITEMS } from './intranet-menu.config';

/**
 * xrepo-119 F5a — quien no tiene `PAGOS_API_MANAGE` no ve el módulo de Pagos: el menú filtra con
 * `userCapabilities.has(item.capability)` (cubierto por `guard-permisos.integration.spec.ts`), así que
 * este test fija que la entrada exista, esté gateada por esa capability y viva en el módulo administrativo.
 */
describe('intranet-menu.config — Pagos (xrepo-119 F5a)', () => {
	const items = MENU_ITEMS.filter((i) => i.route.startsWith('/intranet/admin/pagos'));

	it('expone la entrada del panel de cobranza', () => {
		expect(items.map((i) => i.route)).toContain('/intranet/admin/pagos');
	});

	it('todas las entradas de Pagos exigen PAGOS_API_MANAGE y viven en el módulo administrador', () => {
		expect(items.length).toBeGreaterThan(0);
		for (const item of items) {
			expect(item.capability).toBe('PAGOS_API_MANAGE');
			expect(item.modulo).toBe('administrador');
			expect(item.group?.label).toBe('Pagos');
		}
	});
});
