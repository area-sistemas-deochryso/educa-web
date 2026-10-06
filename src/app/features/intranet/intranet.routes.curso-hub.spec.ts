// #region Imports
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Route, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';

import { pendingChangesGuard, viewAsGateGuard } from '@core/guards';

import { INTRANET_ROUTES } from './intranet.routes';
// #endregion

// #region Helpers
@Component({ standalone: true, template: '' })
class StubComponent {}

function flatten(routes: readonly Route[]): Route[] {
	return routes.flatMap((r) => [r, ...flatten(r.children ?? [])]);
}

const allRoutes = flatten(INTRANET_ROUTES);
const findRoute = (path: string) => allRoutes.find((r) => r.path === path);
// #endregion

describe('curso hub routes (P105 D1 F1a)', () => {
	const cases = [
		{
			role: 'profesor',
			path: 'profesor/cursos/:cursoId/:salonId',
			permissionPath: 'intranet/profesor/cursos',
			viewAsRol: 'Profesor',
		},
		{
			role: 'estudiante',
			path: 'estudiante/cursos/:cursoId/:salonId',
			permissionPath: 'intranet/estudiante/cursos',
			viewAsRol: 'Estudiante',
		},
	];

	for (const { role, path, permissionPath, viewAsRol } of cases) {
		describe(role, () => {
			const route = findRoute(path);

			it('is registered with a title', () => {
				expect(route).toBeDefined();
				expect(route?.title).toMatch(/Curso/);
			});

			it('inherits the authorization of its Cursos page via permissionPath', () => {
				expect(route?.data?.['permissionPath']).toBe(permissionPath);
			});

			it('sits behind the "ver como" gate for its role', () => {
				expect(route?.data?.['viewAsRol']).toBe(viewAsRol);
				expect(route?.canActivate).toContain(viewAsGateGuard);
			});

			it('leaves the Cursos list route untouched', () => {
				const list = findRoute(`${role}/cursos`);
				expect(list).toBeDefined();
				expect(list?.data?.['permissionPath']).toBeUndefined();
			});
		});
	}

	describe('matching against the real route order', () => {
		const cursosRoutes = allRoutes
			.filter((r) => /^(profesor|estudiante)\/cursos/.test(r.path ?? ''))
			.map((r): Route => ({ path: r.path, component: StubComponent, data: { matchedPath: r.path } }));

		it('resolves the list and the hub independently, whatever the declaration order', async () => {
			TestBed.configureTestingModule({ providers: [provideRouter(cursosRoutes)] });
			const router = TestBed.inject(Router);
			const harness = await RouterTestingHarness.create();

			const matched = async (url: string) => {
				await harness.navigateByUrl(url);
				return router.routerState.snapshot.root.firstChild?.data['matchedPath'];
			};

			expect(await matched('/profesor/cursos')).toBe('profesor/cursos');
			expect(await matched('/profesor/cursos/24/34?horarioId=1')).toBe('profesor/cursos/:cursoId/:salonId');
			expect(await matched('/estudiante/cursos')).toBe('estudiante/cursos');
			expect(await matched('/estudiante/cursos/24/34')).toBe('estudiante/cursos/:cursoId/:salonId');
		});
	});

	describe('child tabs (P105 D1 F2)', () => {
		const HUB_PATHS = {
			profesor: 'profesor/cursos/:cursoId/:salonId',
			estudiante: 'estudiante/cursos/:cursoId/:salonId',
		};
		const TABS = ['contenido', 'calificaciones', 'asistencia', 'informacion', 'salon'];
		const childPaths = (path: string) => (findRoute(path)?.children ?? []).map((c) => c.path);

		it('profesor hub has the five tabs as child routes, after the default redirect', () => {
			expect(childPaths(HUB_PATHS.profesor)).toEqual(['', ...TABS]);
		});

		it('estudiante hub has the same five tabs as child routes, after the default redirect', () => {
			expect(childPaths(HUB_PATHS.estudiante)).toEqual(['', ...TABS]);
		});

		it('redirects the bare hub URL to Contenido in both roles', () => {
			for (const path of Object.values(HUB_PATHS)) {
				const index = (findRoute(path)?.children ?? []).find((c) => c.path === '');
				expect(index?.redirectTo).toBe('contenido');
			}
		});

		it('every tab inherits authorization: no own permissionPath nor guards', () => {
			for (const path of Object.values(HUB_PATHS)) {
				const tabs = (findRoute(path)?.children ?? []).filter((c) => c.path);
				for (const tab of tabs) {
					expect(tab.data?.['permissionPath']).toBeUndefined();
					expect(tab.canActivate).toBeUndefined();
					expect(tab.canDeactivate).toBeUndefined();
					expect(tab.loadComponent).toBeTypeOf('function');
				}
			}
		});

		it('profesor hub asks before leaving with unsaved attendance: the exit guard lives on the parent only', () => {
			expect(findRoute(HUB_PATHS.profesor)?.canDeactivate).toContain(pendingChangesGuard);
		});

		it('lazy-loads every tab component', async () => {
			for (const path of Object.values(HUB_PATHS)) {
				const children = findRoute(path)?.children ?? [];
				for (const tab of TABS) {
					const component = await children.find((c) => c.path === tab)?.loadComponent?.();
					expect(component, `${path}/${tab}`).toBeTypeOf('function');
				}
			}
		});
	});
});
