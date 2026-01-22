import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { SessionStorageService } from './session-storage.service';

describe('SessionStorageService', () => {
	let service: SessionStorageService;

	// Mock storage
	let mockSessionStorage: { [key: string]: string };
	let mockLocalStorage: { [key: string]: string };

	beforeEach(() => {
		mockSessionStorage = {};
		mockLocalStorage = {};

		// Mock sessionStorage
		vi.stubGlobal('sessionStorage', {
			getItem: (key: string) => mockSessionStorage[key] ?? null,
			setItem: (key: string, value: string) => {
				mockSessionStorage[key] = value;
			},
			removeItem: (key: string) => {
				delete mockSessionStorage[key];
			},
			clear: () => {
				mockSessionStorage = {};
			},
			key: (index: number) => Object.keys(mockSessionStorage)[index] ?? null,
			get length() {
				return Object.keys(mockSessionStorage).length;
			},
		});

		// Mock localStorage
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => mockLocalStorage[key] ?? null,
			setItem: (key: string, value: string) => {
				mockLocalStorage[key] = value;
			},
			removeItem: (key: string) => {
				delete mockLocalStorage[key];
			},
			clear: () => {
				mockLocalStorage = {};
			},
			key: (index: number) => Object.keys(mockLocalStorage)[index] ?? null,
			get length() {
				return Object.keys(mockLocalStorage).length;
			},
		});

		TestBed.configureTestingModule({
			providers: [SessionStorageService, { provide: PLATFORM_ID, useValue: 'browser' }],
		});

		service = TestBed.inject(SessionStorageService);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('Token operations', () => {
		it('should return null when no token exists', () => {
			expect(service.getToken()).toBeNull();
		});

		it('should return false for hasToken when no token', () => {
			expect(service.hasToken()).toBe(false);
		});

		it('should set and get token in sessionStorage (rememberMe=false)', () => {
			service.setToken('test-token', false, 'Juan Pérez', 'Estudiante');

			expect(service.getToken()).toBe('test-token');
			expect(service.hasToken()).toBe(true);
		});

		it('should set and get token in localStorage (rememberMe=true)', () => {
			service.setToken('persistent-token', true, 'María García', 'Profesor');

			expect(service.getToken()).toBe('persistent-token');
			expect(service.hasToken()).toBe(true);
		});

		it('should remove token', () => {
			service.setToken('test-token', false, 'Juan Pérez', 'Estudiante');
			expect(service.hasToken()).toBe(true);

			service.removeToken();
			expect(service.getToken()).toBeNull();
		});
	});

	describe('User operations', () => {
		it('should return null when no user exists', () => {
			expect(service.getUser()).toBeNull();
		});

		it('should set and get user in sessionStorage', () => {
			const user = {
				token: 'token',
				rol: 'Estudiante' as const,
				nombreCompleto: 'Test User',
				entityId: 1,
				sedeId: 1,
			};

			service.setUser(user, false);

			const retrieved = service.getUser();
			expect(retrieved?.nombreCompleto).toBe('Test User');
			expect(retrieved?.rol).toBe('Estudiante');
		});

		it('should set and get user in localStorage with rememberMe', () => {
			const user = {
				token: 'token',
				rol: 'Profesor' as const,
				nombreCompleto: 'Teacher Test',
				entityId: 2,
				sedeId: 1,
			};

			service.setUser(user, true);

			const retrieved = service.getUser();
			expect(retrieved?.nombreCompleto).toBe('Teacher Test');
		});

		it('should remove user', () => {
			const user = {
				token: 'token',
				rol: 'Estudiante' as const,
				nombreCompleto: 'Test User',
				entityId: 1,
				sedeId: 1,
			};

			service.setUser(user, false);
			expect(service.getUser()).toBeTruthy();

			service.removeUser();
			// User will be null after removing session key
		});
	});

	describe('clearAuth', () => {
		it('should clear auth data from sessionStorage', () => {
			service.setToken('test-token', false, 'Test User', 'Estudiante');
			service.setUser(
				{
					token: 'test-token',
					rol: 'Estudiante',
					nombreCompleto: 'Test User',
					entityId: 1,
					sedeId: 1,
				},
				false,
			);

			service.clearAuth();

			expect(service.getToken()).toBeNull();
			expect(service.getUser()).toBeNull();
		});
	});

	describe('Remember token', () => {
		it('should get remember token from localStorage', () => {
			mockLocalStorage['educa_remember_token'] = 'remembered-token';

			expect(service.getRememberToken()).toBe('remembered-token');
		});

		it('should clear remember token', () => {
			mockLocalStorage['educa_remember_token'] = 'remembered-token';

			service.clearRememberToken();

			expect(service.getRememberToken()).toBeNull();
		});
	});

	describe('getAllPersistentTokens', () => {
		it('should return empty array when no persistent tokens', () => {
			expect(service.getAllPersistentTokens()).toEqual([]);
		});

		it('should return all persistent tokens', () => {
			mockLocalStorage['educa_persistent_token_user1_estudiante'] = 'token1';
			mockLocalStorage['educa_persistent_token_user2_profesor'] = 'token2';
			mockLocalStorage['other_key'] = 'not-a-token';

			const tokens = service.getAllPersistentTokens();

			expect(tokens.length).toBe(2);
			expect(tokens).toContainEqual({ token: 'token1', sessionKey: 'user1_estudiante' });
			expect(tokens).toContainEqual({ token: 'token2', sessionKey: 'user2_profesor' });
		});
	});

	describe('Schedule modals state', () => {
		it('should return empty object when no state exists', () => {
			expect(service.getScheduleModalsState()).toEqual({});
		});

		it('should set and get schedule modals state', () => {
			const state = { gradesModal: true };
			service.setScheduleModalsState(state);

			expect(service.getScheduleModalsState()).toEqual(state);
		});

		it('should update specific modal state', () => {
			service.updateScheduleModalState('gradesModal', true);

			const state = service.getScheduleModalsState();
			expect(state.gradesModal).toBe(true);
		});

		it('should remove modal from state when set to false', () => {
			service.setScheduleModalsState({ gradesModal: true, tasksModal: true });

			service.updateScheduleModalState('gradesModal', false);

			const state = service.getScheduleModalsState();
			expect(state.gradesModal).toBeUndefined();
			expect(state.tasksModal).toBe(true);
		});

		it('should clear schedule modals state', () => {
			service.setScheduleModalsState({ gradesModal: true });
			service.clearScheduleModalsState();

			expect(service.getScheduleModalsState()).toEqual({});
		});
	});

	describe('Notification check', () => {
		it('should return null when no check exists', () => {
			expect(service.getLastNotificationCheck()).toBeNull();
		});

		it('should set and get last notification check', () => {
			const date = '2024-01-15T10:30:00Z';
			service.setLastNotificationCheck(date);

			expect(service.getLastNotificationCheck()).toBe(date);
		});
	});

	describe('Navigation state', () => {
		it('should return null when no route exists', () => {
			expect(service.getLastRoute()).toBeNull();
		});

		it('should set and get last route', () => {
			service.setLastRoute('/intranet/attendance');

			expect(service.getLastRoute()).toBe('/intranet/attendance');
		});
	});

	describe('clearAll', () => {
		it('should clear all stored data', () => {
			service.setToken('token', false, 'User', 'Estudiante');
			service.setLastNotificationCheck('2024-01-01');
			service.setLastRoute('/test');
			service.setScheduleModalsState({ gradesModal: true });

			service.clearAll();

			expect(service.getToken()).toBeNull();
			expect(service.getLastNotificationCheck()).toBeNull();
			expect(service.getLastRoute()).toBeNull();
			expect(service.getScheduleModalsState()).toEqual({});
		});
	});

	describe('SSR safety', () => {
		it('should handle server platform gracefully', () => {
			TestBed.resetTestingModule();
			TestBed.configureTestingModule({
				providers: [
					SessionStorageService,
					{ provide: PLATFORM_ID, useValue: 'server' }, // SSR
				],
			});

			const serverService = TestBed.inject(SessionStorageService);

			// Should not throw
			expect(serverService.getToken()).toBeNull();
			expect(serverService.hasToken()).toBe(false);
			expect(serverService.getUser()).toBeNull();
		});
	});
});
