import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { provideZonelessChangeDetection, Component } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { authGuard } from '@core/guards/auth/auth.guard';
import { permissionsGuard } from '@core/guards/permissions/permisos.guard';
import { AuthService } from '@core/services/auth/auth.service';
import { UserPermissionsService } from '@core/services/permissions/user-permisos.service';
import { AccessDeniedService } from '@core/services/permissions/access-denied.service';

@Component({ template: '', standalone: true })
class DummyComponent {}

describe('Guard + Permisos Integration', () => {
	let router: Router;
	let authService: AuthService;
	let userPermissions: UserPermissionsService;
	let accessDenied: AccessDeniedService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideZonelessChangeDetection(),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([
					{
						path: 'intranet',
						component: DummyComponent,
						canActivate: [authGuard],
						children: [
							{
								path: 'admin/usuarios',
								component: DummyComponent,
								canActivate: [permissionsGuard],
							},
							{
								path: 'profesor/asistencia',
								component: DummyComponent,
								canActivate: [permissionsGuard],
							},
						],
					},
					{ path: 'intranet/login', component: DummyComponent },
				]),
			],
		});

		router = TestBed.inject(Router);
		authService = TestBed.inject(AuthService);
		userPermissions = TestBed.inject(UserPermissionsService);
		accessDenied = TestBed.inject(AccessDeniedService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.match(() => true).forEach((r) => r.flush(null));
	});

	it('should redirect to login when not authenticated', async () => {
		vi.spyOn(authService, 'isAuthenticated', 'get').mockReturnValue(false);

		const result = await router.navigateByUrl('/intranet');

		expect(router.url).toBe('/intranet/login');
	});

	it('should allow access when authenticated', async () => {
		vi.spyOn(authService, 'isAuthenticated', 'get').mockReturnValue(true);

		const result = await router.navigateByUrl('/intranet');

		expect(result).toBe(true);
	});

	it('should allow route when user has permission', async () => {
		vi.spyOn(authService, 'isAuthenticated', 'get').mockReturnValue(true);
		vi.spyOn(userPermissions, 'ensurePermisosLoaded').mockResolvedValue(true);
		vi.spyOn(userPermissions, 'tienePermiso').mockReturnValue(true);

		await router.navigateByUrl('/intranet/admin/usuarios');

		expect(router.url).toBe('/intranet/admin/usuarios');
	});

	it('should redirect to /intranet and show access denied when permission missing', async () => {
		vi.spyOn(authService, 'isAuthenticated', 'get').mockReturnValue(true);
		vi.spyOn(userPermissions, 'ensurePermisosLoaded').mockResolvedValue(true);
		vi.spyOn(userPermissions, 'tienePermiso').mockReturnValue(false);
		vi.spyOn(accessDenied, 'show');

		await router.navigateByUrl('/intranet/admin/usuarios');

		expect(router.url).toBe('/intranet');
		expect(accessDenied.show).toHaveBeenCalled();
	});

	it('should logout and redirect to login when permissions fail to load', async () => {
		vi.spyOn(authService, 'isAuthenticated', 'get').mockReturnValue(true);
		vi.spyOn(userPermissions, 'ensurePermisosLoaded').mockResolvedValue(false);
		vi.spyOn(authService, 'logout');

		await router.navigateByUrl('/intranet/admin/usuarios');

		expect(authService.logout).toHaveBeenCalled();
		expect(router.url).toBe('/intranet/login');
	});

	it('should skip permission check when not authenticated (let authGuard handle)', async () => {
		vi.spyOn(authService, 'isAuthenticated', 'get').mockReturnValue(false);
		vi.spyOn(userPermissions, 'ensurePermisosLoaded');

		await router.navigateByUrl('/intranet/admin/usuarios');

		expect(router.url).toBe('/intranet/login');
	});

	it('should check permission with correct full path', async () => {
		vi.spyOn(authService, 'isAuthenticated', 'get').mockReturnValue(true);
		vi.spyOn(userPermissions, 'ensurePermisosLoaded').mockResolvedValue(true);
		const tienePermisoSpy = vi.spyOn(userPermissions, 'tienePermiso').mockReturnValue(true);

		await router.navigateByUrl('/intranet/profesor/asistencia');

		expect(tienePermisoSpy).toHaveBeenCalledWith(
			expect.stringContaining('profesor/asistencia'),
		);
	});
});
