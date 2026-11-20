// * Tests for pageDirection — direction of a navigation derived from the path hierarchy.
// #region Imports
import { describe, expect, it } from 'vitest';

import { pageDirection } from './view-transition-direction';

// #endregion

// #region Tests
describe('pageDirection', () => {
	it('should be forward when the destination extends the origin (hub to page)', () => {
		expect(pageDirection('/intranet', '/intranet/asistencia')).toBe('forward');
	});

	it('should be forward from a list to its detail', () => {
		expect(pageDirection('/intranet/profesor/cursos', '/intranet/profesor/cursos/12/34')).toBe('forward');
	});

	it('should be back when the origin extends the destination', () => {
		expect(pageDirection('/intranet/profesor/cursos/12/34', '/intranet/profesor/cursos')).toBe('back');
		expect(pageDirection('/intranet/asistencia', '/intranet')).toBe('back');
	});

	it('should have no direction between siblings', () => {
		expect(pageDirection('/intranet/admin/cursos', '/intranet/admin/horarios')).toBeNull();
		expect(pageDirection('/intranet/profesor/cursos/12/34/contenido', '/intranet/profesor/cursos/12/34/salon')).toBeNull();
	});

	it('should have no direction between unrelated routes', () => {
		expect(pageDirection('/intranet/asistencia', '/intranet/admin/cursos')).toBeNull();
	});

	it('should have no direction when the path does not change (query-only)', () => {
		expect(pageDirection('/intranet/ayuda', '/intranet/ayuda')).toBeNull();
	});

	it('should compare whole segments, not string prefixes', () => {
		expect(pageDirection('/intranet/admin/curso', '/intranet/admin/cursos')).toBeNull();
	});

	it('should ignore trailing and duplicate slashes', () => {
		expect(pageDirection('/intranet/', '//intranet/asistencia')).toBe('forward');
	});
});
// #endregion
