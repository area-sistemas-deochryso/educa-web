// #region Imports
import { describe, expect, it } from 'vitest';

import {
	isReportableHttpStatus,
	normalizeRoute,
	sanitizeErrorClass,
	sanitizeMethod,
} from './breadcrumb-tracker.helpers';
// #endregion

// #region Tests
describe('breadcrumb-tracker.helpers', () => {
	describe('normalizeRoute', () => {
		it('replaces numeric and GUID segments with :id', () => {
			expect(normalizeRoute('/intranet/estudiante/curso/42')).toBe('/intranet/estudiante/curso/:id');
			expect(normalizeRoute('/api/x/3f2504e0-4f89-11d3-9a0c-0305e82c3301/detalle')).toBe('/api/x/:id/detalle');
		});

		it('replaces segments containing "@" (emails) with :id', () => {
			expect(normalizeRoute('/api/usuarios/ana@correo.com')).toBe('/api/usuarios/:id');
		});

		it('drops query string and fragment', () => {
			expect(normalizeRoute('/intranet/buscar?dni=12345678&q=secreto#top')).toBe('/intranet/buscar');
		});

		it('keeps role segments that are case-sensitive words', () => {
			expect(normalizeRoute('/api/sistema/usuarios/Estudiante/15')).toBe('/api/sistema/usuarios/Estudiante/:id');
		});

		it('extracts only the pathname from absolute URLs', () => {
			expect(normalizeRoute('https://educa1.azurewebsites.net/api/cursos/7?x=1')).toBe('/api/cursos/:id');
		});

		it('truncates to 200 chars', () => {
			expect(normalizeRoute('/' + 'a'.repeat(500)).length).toBe(200);
		});
	});

	describe('sanitizeMethod / sanitizeErrorClass', () => {
		it('keeps valid methods in upper case and drops unknown ones', () => {
			expect(sanitizeMethod('post')).toBe('POST');
			expect(sanitizeMethod('TRACE')).toBeUndefined();
			expect(sanitizeMethod(undefined)).toBeUndefined();
		});

		it('falls back to "Error" for names that are not identifiers', () => {
			expect(sanitizeErrorClass('TypeError')).toBe('TypeError');
			expect(sanitizeErrorClass('Algo con espacios y datos')).toBe('Error');
			expect(sanitizeErrorClass(undefined)).toBe('Error');
		});
	});

	describe('isReportableHttpStatus', () => {
		it.each([500, 502, 503, 400, 405, 410, 418])('reports %i', (status) => {
			expect(isReportableHttpStatus(status)).toBe(true);
		});

		it.each([0, 200, 304, 401, 403, 404, 409, 422, 429])('does not report %i', (status) => {
			expect(isReportableHttpStatus(status)).toBe(false);
		});
	});
});
// #endregion
