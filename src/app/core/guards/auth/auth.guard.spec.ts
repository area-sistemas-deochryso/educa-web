// * Tests for authGuard — validates authentication check and login redirect.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { authGuard } from './auth.guard';
import { AuthService } from '@app/core/services';

// #endregion

// #region Tests
describe('authGuard', () => {
	let authServiceMock: Partial<AuthService>;

	beforeEach(() => {
		authServiceMock = { isAuthenticated: false };

		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: AuthService, useValue: authServiceMock },
			],
		});
	});

	// #region Authenticated — allow access
	describe('authenticated user', () => {
		it('should return true when user is authenticated', () => {
			authServiceMock.isAuthenticated = true;

			const result = TestBed.runInInjectionContext(() =>
				authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
			);

			expect(result).toBe(true);
		});
	});
	// #endregion

	// #region Unauthenticated — redirect to login
	describe('unauthenticated user', () => {
		it('should return UrlTree to /intranet/login', () => {
			authServiceMock.isAuthenticated = false;

			const result = TestBed.runInInjectionContext(() =>
				authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
			);

			expect(result).toBeInstanceOf(UrlTree);
			expect((result as UrlTree).toString()).toBe('/intranet/login');
		});

		it('should redirect to login by default (isAuthenticated starts false)', () => {
			const result = TestBed.runInInjectionContext(() =>
				authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
			);

			expect(result).not.toBe(true);
		});
	});
	// #endregion
});
// #endregion
