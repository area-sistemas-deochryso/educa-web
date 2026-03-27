// * Tests for SessionStorageService — user/permisos storage after cookie migration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { SessionStorageService } from './session-storage.service';
import { AuthUser, PermisosStorageData } from './storage.models';

// #endregion

// #region Helpers
const testUser: AuthUser = {
	rol: 'Estudiante',
	nombreCompleto: 'Juan Pérez',
	entityId: 1,
	sedeId: 1,
};

const testPermisos: PermisosStorageData = {
	usuarioId: 1,
	rol: 'Director',
	vistasPermitidas: ['intranet/admin/usuarios'],
	tienePermisosPersonalizados: false,
};
// #endregion

// #region Tests
describe('SessionStorageService', () => {
	let service: SessionStorageService;
	let mockSessionStorage: Record<string, string>;
	let mockLocalStorage: Record<string, string>;

	beforeEach(() => {
		mockSessionStorage = {};
		mockLocalStorage = {};

		vi.stubGlobal('sessionStorage', {
			getItem: (key: string) => mockSessionStorage[key] ?? null,
			setItem: (key: string, value: string) => { mockSessionStorage[key] = value; },
			removeItem: (key: string) => { delete mockSessionStorage[key]; },
			clear: () => { mockSessionStorage = {}; },
			key: (index: number) => Object.keys(mockSessionStorage)[index] ?? null,
			get length() { return Object.keys(mockSessionStorage).length; },
		});

		vi.stubGlobal('localStorage', {
			getItem: (key: string) => mockLocalStorage[key] ?? null,
			setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
			removeItem: (key: string) => { delete mockLocalStorage[key]; },
			clear: () => { mockLocalStorage = {}; },
			key: (index: number) => Object.keys(mockLocalStorage)[index] ?? null,
			get length() { return Object.keys(mockLocalStorage).length; },
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

	// #region User operations
	describe('User operations', () => {
		it('should return null when no user exists', () => {
			expect(service.getUser()).toBeNull();
		});

		it('should set and get user in sessionStorage', () => {
			service.setUser(testUser, false);

			const retrieved = service.getUser();
			expect(retrieved?.nombreCompleto).toBe('Juan Pérez');
			expect(retrieved?.rol).toBe('Estudiante');
		});

		it('should set and get user in localStorage with rememberMe', () => {
			service.setUser(testUser, true);

			const retrieved = service.getUser();
			expect(retrieved?.nombreCompleto).toBe('Juan Pérez');
		});

		it('should remove user', () => {
			service.setUser(testUser, false);
			expect(service.getUser()).toBeTruthy();

			service.removeUser();
			expect(service.getUser()).toBeNull();
		});
	});
	// #endregion

	// #region clearAuth
	describe('clearAuth', () => {
		it('should clear auth data from storage', () => {
			service.setUser(testUser, false);
			expect(service.getUser()).toBeTruthy();

			service.clearAuth();
			expect(service.getUser()).toBeNull();
		});

		it('should clear persistent auth data', () => {
			service.setUser(testUser, true);
			expect(service.getUser()).toBeTruthy();

			service.clearAuth();
			expect(service.getUser()).toBeNull();
		});
	});
	// #endregion

	// #region Permisos operations
	describe('Permisos operations', () => {
		it('should return null when no permisos exist', () => {
			expect(service.getPermisos()).toBeNull();
		});

		it('should set and get permisos for session user', () => {
			// Need an active session first
			service.setUser(testUser, false);

			service.setPermisos(testPermisos);
			const retrieved = service.getPermisos();

			expect(retrieved?.vistasPermitidas).toEqual(['intranet/admin/usuarios']);
		});

		it('should set and get permisos for persistent user', () => {
			service.setUser(testUser, true);

			service.setPermisos(testPermisos);
			const retrieved = service.getPermisos();

			expect(retrieved?.vistasPermitidas).toEqual(['intranet/admin/usuarios']);
		});

		it('should clear permisos', () => {
			service.setUser(testUser, false);
			service.setPermisos(testPermisos);

			service.clearPermisos();

			expect(service.getPermisos()).toBeNull();
		});
	});
	// #endregion

	// #region clearAll
	describe('clearAll', () => {
		it('should clear all stored data', () => {
			service.setUser(testUser, false);
			service.setPermisos(testPermisos);

			service.clearAll();

			expect(service.getUser()).toBeNull();
			expect(service.getPermisos()).toBeNull();
		});
	});
	// #endregion

	// #region SSR safety
	describe('SSR safety', () => {
		it('should handle server platform gracefully', () => {
			TestBed.resetTestingModule();
			TestBed.configureTestingModule({
				providers: [
					SessionStorageService,
					{ provide: PLATFORM_ID, useValue: 'server' },
				],
			});

			const serverService = TestBed.inject(SessionStorageService);

			expect(serverService.getUser()).toBeNull();
			expect(serverService.getPermisos()).toBeNull();
		});
	});
	// #endregion
});
// #endregion
