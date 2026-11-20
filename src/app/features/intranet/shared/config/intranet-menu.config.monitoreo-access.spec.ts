import { describe, expect, it } from 'vitest';

import { MENU_ITEMS, buildModuloMenus } from './intranet-menu.config';
import { MONITOREO_PANEL_PATH } from './intranet-menu-access';

// #region Helpers
const MONITOREO_ITEMS = MENU_ITEMS.filter((i) => i.route.startsWith('/intranet/admin/monitoreo/'));
const MAILERSEND = '/intranet/admin/monitoreo/correos/mailersend';
const BANDEJA = '/intranet/admin/monitoreo/correos/bandeja';

/** Todas las capabilities de Monitoreo asignadas (como el rol real), con las rutas dadas. */
const allCaps = () => new Set(['INTRANET', ...MONITOREO_ITEMS.map((i) => i.capability)]);
const access = (paths: string[]) => ({ tienePermiso: (ruta: string) => paths.includes(ruta) });

/** El menú serializa los ítems anidados: alcanza con buscar la ruta en el JSON. */
const routesIn = (menus: unknown) => JSON.stringify(menus);
// #endregion

/**
 * El menú filtraba solo por capability de API: un rol con todas las de Monitoreo pero sin el panel veía
 * Bandeja, Blacklist, etc. aunque el guard las rebotara. Ahora el menú aplica la misma regla de ruta.
 */
describe('intranet-menu.config — acceso real a Monitoreo', () => {
	const sinPanel = access([
		...MONITOREO_ITEMS.map((i) => i.route.slice(1)),
	]);

	it('oculta las hojas de Monitoreo que rebotarían (sin la capability del panel)', () => {
		const json = routesIn(buildModuloMenus(allCaps(), 'Asistente Administrativo', {}, sinPanel));

		expect(json).not.toContain(BANDEJA);
		expect(json).not.toContain('/intranet/admin/monitoreo/correos/blacklist');
		expect(json).not.toContain('/intranet/admin/monitoreo/incidencias/errores');
	});

	it('mantiene «Emails MailerSend» sin la capability del panel', () => {
		const json = routesIn(buildModuloMenus(allCaps(), 'Asistente Administrativo', {}, sinPanel));

		expect(json).toContain(MAILERSEND);
	});

	it('muestra todo Monitoreo cuando el rol también tiene el panel', () => {
		const conPanel = access([MONITOREO_PANEL_PATH, ...MONITOREO_ITEMS.map((i) => i.route.slice(1))]);
		const json = routesIn(buildModuloMenus(allCaps(), 'Administrador', {}, conPanel));

		expect(json).toContain(BANDEJA);
		expect(json).toContain(MAILERSEND);
	});

	it('sin routeAccess conserva el comportamiento previo (solo capability)', () => {
		const json = routesIn(buildModuloMenus(allCaps(), 'Administrador', {}));

		expect(json).toContain(BANDEJA);
	});
});
