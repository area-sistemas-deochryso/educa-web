// * Tests for VideoconferenciasFacade — validates video conference orchestration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VideoconferenciasFacade } from './videoconferencias.facade';
import { VideoconferenciasStore, VideoconferenciaItem } from './videoconferencias.store';
import { UserProfileService } from '@core/services/user/user-profile.service';
import { ErrorHandlerService } from '@core/services';

// #endregion

// #region Mocks
const mockItem: VideoconferenciaItem = {
	horarioId: 1, cursoId: 10, cursoNombre: 'Matemática', salonDescripcion: '1A',
	diaSemanaDescripcion: 'Lunes', horaInicio: '08:00', horaFin: '09:30',
	profesorNombreCompleto: 'Prof A', cantidadEstudiantes: 30,
};

function createMockUserProfile() {
	return {
		userRole: vi.fn().mockReturnValue('Profesor'),
		entityId: vi.fn().mockReturnValue(1),
		displayName: vi.fn().mockReturnValue('Prof A'),
	};
}
// #endregion

// #region Tests
describe('VideoconferenciasFacade', () => {
	let facade: VideoconferenciasFacade;
	let store: VideoconferenciasStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				VideoconferenciasFacade,
				VideoconferenciasStore,
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: UserProfileService, useValue: createMockUserProfile() },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn() } },
			],
		});

		facade = TestBed.inject(VideoconferenciasFacade);
		store = TestBed.inject(VideoconferenciasStore);
	});

	// #region getRoomName — deterministic room naming
	describe('getRoomName', () => {
		it('should generate deterministic room name', () => {
			expect(facade.getRoomName(1, 'Matemática')).toBe('educawebsala1matematica');
		});

		it('should strip accents and special chars', () => {
			expect(facade.getRoomName(5, 'Comunicación Oral')).toBe('educawebsala5comunicacionoral');
		});

		it('should handle simple names', () => {
			expect(facade.getRoomName(10, 'Arte')).toBe('educawebsala10arte');
		});
	});
	// #endregion

	// #region Sala management delegation
	describe('sala management', () => {
		it('should enter sala', () => {
			facade.enterSala(mockItem);
			expect(store.activeSala()).toEqual(mockItem);
			expect(store.inSala()).toBe(true);
		});

		it('should leave sala', () => {
			facade.enterSala(mockItem);
			facade.leaveSala();
			expect(store.activeSala()).toBeNull();
			expect(store.inSala()).toBe(false);
		});
	});
	// #endregion

	// #region isModerator
	describe('isModerator', () => {
		it('should be true for Profesor', () => {
			expect(facade.isModerator()).toBe(true);
		});
	});
	// #endregion

	// #region loadCursos — guard
	describe('loadCursos guard', () => {
		it('should skip if already loading', () => {
			store.setLoading(true);
			facade.loadCursos();
			// Should not throw or double-load
			expect(store.loading()).toBe(true);
		});
	});
	// #endregion

	// #region vm
	describe('vm', () => {
		it('should expose store vm', () => {
			expect(facade.vm).toBe(store.vm);
		});
	});
	// #endregion
});
// #endregion
