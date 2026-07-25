import { describe, expect, it } from 'vitest';

import { MENU_ITEMS } from './intranet-menu.config';

/**
 * Brief 483 — la vista admin de FAQ debe estar gateada por `AYUDA_MANAGE`
 * en el menú (mismo mecanismo genérico de `permissionsGuard` +
 * `userCapabilities.has(item.capability)` ya cubierto por
 * `guard-permisos.integration.spec.ts`). Este test fija el contrato:
 * un usuario sin `AYUDA_MANAGE` no ve ni puede navegar a la entrada.
 */
describe('intranet-menu.config — FAQ admin (brief 483)', () => {
	it('expone la entrada de FAQ admin gateada por AYUDA_MANAGE', () => {
		const item = MENU_ITEMS.find((i) => i.route === '/intranet/admin/ayuda/faq');

		expect(item).toBeDefined();
		expect(item?.capability).toBe('AYUDA_MANAGE');
	});
});
