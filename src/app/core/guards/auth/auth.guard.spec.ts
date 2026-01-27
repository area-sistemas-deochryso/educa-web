import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authGuard } from './auth.guard';
import { AuthService } from '@app/core/services';

describe('authGuard', () => {
	let authServiceMock: Partial<AuthService>;
	let routerMock: Partial<Router>;

	beforeEach(() => {
		authServiceMock = {
			isAuthenticated: false,
		};

		routerMock = {
			navigate: vi.fn(),
		};

		TestBed.configureTestingModule({
			providers: [
				{ provide: AuthService, useValue: authServiceMock },
				{ provide: Router, useValue: routerMock },
			],
		});
	});

	it('should allow access when user is authenticated', () => {
		authServiceMock.isAuthenticated = true;

		TestBed.runInInjectionContext(() => {
			const result = authGuard({} as any, {} as any);
			expect(result).toBe(true);
		});
	});

	it('should deny access and redirect to login when user is not authenticated', () => {
		authServiceMock.isAuthenticated = false;

		TestBed.runInInjectionContext(() => {
			const result = authGuard({} as any, {} as any);
			expect(result).toBe(false);
			expect(routerMock.navigate).toHaveBeenCalledWith(['/intranet/login']);
		});
	});
});
