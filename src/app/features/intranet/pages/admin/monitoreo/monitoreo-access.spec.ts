import { describe, expect, it } from 'vitest';

import { canOpenTile, MONITOREO_PANEL_PATH, openableTiles, tilePermissionPath } from './monitoreo-access';
import { DOMAINS } from './monitoreo-hub.catalog';

// #region Helpers
function required<T>(value: T | undefined, what: string): T {
	if (value === undefined) throw new Error(`Falta ${what} en el catálogo`);
	return value;
}

const correos = required(DOMAINS.find((d) => d.id === 'correos'), 'el dominio correos');
const tile = (slug: string) => required(correos.tiles.find((t) => t.route.endsWith(`/${slug}`)), `el tile ${slug}`);

/** Usuario con las capabilities y rutas dadas (`tienePermiso` es igualdad exacta, como en prod). */
function user(capabilities: string[], paths: string[]) {
	return {
		hasCapability: (code: string) => capabilities.includes(code),
		tienePermiso: (path: string) => paths.includes(path),
	};
}
// #endregion

describe('monitoreo-access', () => {
	// Rol con todo el área de correos asignado pero SIN la capability del panel de Monitoreo.
	const sinPanel = () =>
		user(
			correos.tiles.map((t) => t.capability),
			correos.tiles.map((t) => tilePermissionPath('correos', t)),
		);

	it('should hide tiles that the panel gate would bounce (no panel capability)', () => {
		expect(canOpenTile(sinPanel(), 'correos', tile('bandeja'))).toBe(false);
		expect(canOpenTile(sinPanel(), 'correos', tile('blacklist'))).toBe(false);
	});

	it('should keep the standalone MailerSend tile without the panel capability', () => {
		expect(canOpenTile(sinPanel(), 'correos', tile('mailersend'))).toBe(true);
		expect(openableTiles(sinPanel(), 'correos').map((t) => t.label)).toEqual(['Emails MailerSend']);
	});

	it('should show every tile when the user also holds the panel capability', () => {
		const admin = user(
			correos.tiles.map((t) => t.capability),
			[MONITOREO_PANEL_PATH, ...correos.tiles.map((t) => tilePermissionPath('correos', t))],
		);

		expect(openableTiles(admin, 'correos')).toHaveLength(correos.tiles.length);
	});

	it('should hide a tile whose own route or capability is missing', () => {
		const soloCap = user(['EMAIL_MAILERSEND_PAGE_API_VIEW'], []);
		const soloRuta = user([], [tilePermissionPath('correos', tile('mailersend'))]);

		expect(canOpenTile(soloCap, 'correos', tile('mailersend'))).toBe(false);
		expect(canOpenTile(soloRuta, 'correos', tile('mailersend'))).toBe(false);
	});
});
