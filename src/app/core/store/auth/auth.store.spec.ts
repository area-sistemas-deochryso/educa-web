// * Tests for AuthStore — validates authentication state management.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStore, AuthStoreType } from './auth.store';
import { StorageService } from '@core/services/storage';
import { AuthUser } from '@core/services/auth/auth.models';

// #endregion

// #region Test fixtures
const mockUser: AuthUser = {
	rol: 'Director',
	nombreCompleto: 'Juan Pérez',
	entityId: 1,
	sedeId: 1,
	dni: '12345678',
};

function createMockStorageService(overrides: Partial<{ getUser: () => AuthUser | null; hasUserInfo: () => boolean }> = {}) {
	return {
		getUser: overrides.getUser ?? (() => null),
		hasUserInfo: overrides.hasUserInfo ?? (() => false),
		setToken: vi.fn(),
		getPermisos: vi.fn(),
		setPreference: vi.fn(),
		getPreference: vi.fn(),
	};
}
// #endregion

// #region Tests
describe('AuthStore', () => {
	let store: AuthStoreType;

	// #region Setup — no stored user
	describe('without stored user', () => {
		beforeEach(() => {
			TestBed.configureTestingModule({
				providers: [
					AuthStore,
					{ provide: StorageService, useValue: createMockStorageService() },
				],
			});
			store = TestBed.inject(AuthStore);
			store.reset();
		});

		// #region Initial state
		describe('initial state', () => {
			it('should start unauthenticated', () => {
				expect(store.isAuthenticated()).toBe(false);
				expect(store.user()).toBeNull();
				expect(store.isLoading()).toBe(false);
				expect(store.error()).toBeNull();
				expect(store.loginAttempts()).toBe(0);
			});

			it('should have correct derived state', () => {
				expect(store.remainingAttempts()).toBe(3);
				expect(store.isBlocked()).toBe(false);
				expect(store.userName()).toBe('');
				expect(store.userRole()).toBe('');
			});
		});
		// #endregion

		// #region setUser
		describe('setUser', () => {
			it('should set user and mark as authenticated', () => {
				store.setUser(mockUser);

				expect(store.user()).toEqual(mockUser);
				expect(store.isAuthenticated()).toBe(true);
				expect(store.error()).toBeNull();
				expect(store.loginAttempts()).toBe(0);
			});

			it('should update derived computed values', () => {
				store.setUser(mockUser);

				expect(store.userName()).toBe('Juan Pérez');
				expect(store.userRole()).toBe('Director');
			});

			it('should clear error and reset attempts', () => {
				store.setError('Previous error');
				store.incrementAttempts();
				store.setUser(mockUser);

				expect(store.error()).toBeNull();
				expect(store.loginAttempts()).toBe(0);
			});
		});
		// #endregion

		// #region Loading
		describe('loading', () => {
			it('should toggle loading state', () => {
				store.setLoading(true);
				expect(store.isLoading()).toBe(true);

				store.setLoading(false);
				expect(store.isLoading()).toBe(false);
			});
		});
		// #endregion

		// #region Error handling
		describe('error handling', () => {
			it('should set error and stop loading', () => {
				store.setLoading(true);
				store.setError('Login failed');

				expect(store.error()).toBe('Login failed');
				expect(store.isLoading()).toBe(false);
			});

			it('should clear error', () => {
				store.setError('Some error');
				store.clearError();

				expect(store.error()).toBeNull();
			});
		});
		// #endregion

		// #region Login attempts
		describe('login attempts', () => {
			it('should increment attempts', () => {
				store.incrementAttempts();
				expect(store.loginAttempts()).toBe(1);
				expect(store.remainingAttempts()).toBe(2);
			});

			it('should increment attempts cumulatively', () => {
				store.incrementAttempts();
				store.incrementAttempts();
				expect(store.loginAttempts()).toBe(2);
				expect(store.remainingAttempts()).toBe(1);
			});

			it('should block after 3 attempts', () => {
				store.incrementAttempts();
				store.incrementAttempts();
				store.incrementAttempts();

				expect(store.isBlocked()).toBe(true);
				expect(store.remainingAttempts()).toBe(0);
			});

			it('should reset attempts', () => {
				store.incrementAttempts();
				store.incrementAttempts();
				store.resetAttempts();

				expect(store.loginAttempts()).toBe(0);
				expect(store.isBlocked()).toBe(false);
				expect(store.remainingAttempts()).toBe(3);
			});
		});
		// #endregion

		// #region Reset (logout)
		describe('reset', () => {
			it('should reset all state to initial values', () => {
				store.setUser(mockUser);
				store.setLoading(true);
				store.setError('error');
				store.incrementAttempts();

				store.reset();

				expect(store.user()).toBeNull();
				expect(store.isAuthenticated()).toBe(false);
				expect(store.isLoading()).toBe(false);
				expect(store.error()).toBeNull();
				expect(store.loginAttempts()).toBe(0);
				expect(store.userName()).toBe('');
				expect(store.userRole()).toBe('');
			});
		});
		// #endregion
	});
	// #endregion

	// #region Setup — with stored user (session restore)
	describe('with stored user (session restore)', () => {
		it('should restore user from storage on init', () => {
			TestBed.configureTestingModule({
				providers: [
					AuthStore,
					{
						provide: StorageService,
						useValue: createMockStorageService({
							getUser: () => mockUser,
							hasUserInfo: () => true,
						}),
					},
				],
			});
			store = TestBed.inject(AuthStore);

			expect(store.user()).toEqual(mockUser);
			expect(store.isAuthenticated()).toBe(true);
			expect(store.userName()).toBe('Juan Pérez');
		});

		it('should NOT restore user if storage has no user info', () => {
			TestBed.configureTestingModule({
				providers: [
					AuthStore,
					{
						provide: StorageService,
						useValue: createMockStorageService({
							getUser: () => mockUser,
							hasUserInfo: () => false,
						}),
					},
				],
			});
			store = TestBed.inject(AuthStore);

			expect(store.user()).toBeNull();
			expect(store.isAuthenticated()).toBe(false);
		});
	});
	// #endregion
});
// #endregion
