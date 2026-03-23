// * Tests for PreferencesStorageService — validates localStorage preferences.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { PreferencesStorageService } from './preferences-storage.service';

// #endregion

// #region Tests
describe('PreferencesStorageService', () => {
	let service: PreferencesStorageService;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({ providers: [PreferencesStorageService] });
		service = TestBed.inject(PreferencesStorageService);
	});

	afterEach(() => {
		localStorage.clear();
	});

	// #region Theme
	describe('theme', () => {
		it('should default to system', () => {
			expect(service.getTheme()).toBe('system');
		});

		it('should set and get theme', () => {
			service.setTheme('dark');
			expect(service.getTheme()).toBe('dark');

			service.setTheme('light');
			expect(service.getTheme()).toBe('light');
		});
	});
	// #endregion

	// #region Sidebar
	describe('sidebar', () => {
		it('should default to not collapsed', () => {
			expect(service.getSidebarCollapsed()).toBe(false);
		});

		it('should set and get collapsed state', () => {
			service.setSidebarCollapsed(true);
			expect(service.getSidebarCollapsed()).toBe(true);

			service.setSidebarCollapsed(false);
			expect(service.getSidebarCollapsed()).toBe(false);
		});
	});
	// #endregion

	// #region Notifications sound
	describe('notifications sound', () => {
		it('should default to enabled', () => {
			expect(service.getNotificationsSoundEnabled()).toBe(true);
		});

		it('should set and get sound preference', () => {
			service.setNotificationsSoundEnabled(false);
			expect(service.getNotificationsSoundEnabled()).toBe(false);
		});
	});
	// #endregion

	// #region Attendance preferences
	describe('attendance month', () => {
		it('should return null when not set', () => {
			expect(service.getAttendanceMonth()).toBeNull();
		});

		it('should set and get attendance month', () => {
			service.setAttendanceMonth({ month: 6, year: 2026 });
			expect(service.getAttendanceMonth()).toEqual({ month: 6, year: 2026 });
		});

		it('should clear attendance month', () => {
			service.setAttendanceMonth({ month: 6, year: 2026 });
			service.clearAttendanceMonth();
			expect(service.getAttendanceMonth()).toBeNull();
		});
	});

	describe('selected hijo', () => {
		it('should return null when not set', () => {
			expect(service.getSelectedHijoId()).toBeNull();
		});

		it('should set and get hijo id', () => {
			service.setSelectedHijoId(42);
			expect(service.getSelectedHijoId()).toBe(42);
		});

		it('should clear hijo id', () => {
			service.setSelectedHijoId(42);
			service.clearSelectedHijoId();
			expect(service.getSelectedHijoId()).toBeNull();
		});
	});

	describe('selected salon', () => {
		it('should set and get salon id', () => {
			service.setSelectedSalonId(10);
			expect(service.getSelectedSalonId()).toBe(10);
		});
	});

	describe('selected estudiante', () => {
		it('should set and get estudiante id', () => {
			service.setSelectedEstudianteId(77);
			expect(service.getSelectedEstudianteId()).toBe(77);
		});
	});

	describe('director grado seccion', () => {
		it('should set and get grado seccion', () => {
			service.setSelectedGradoSeccionDirector({ grado: '3ro', seccion: 'B' });
			expect(service.getSelectedGradoSeccionDirector()).toEqual({ grado: '3ro', seccion: 'B' });
		});

		it('should clear grado seccion', () => {
			service.setSelectedGradoSeccionDirector({ grado: '3ro', seccion: 'B' });
			service.clearSelectedGradoSeccionDirector();
			expect(service.getSelectedGradoSeccionDirector()).toBeNull();
		});
	});

	describe('director estudiante', () => {
		it('should set and get estudiante director id', () => {
			service.setSelectedEstudianteDirectorId(88);
			expect(service.getSelectedEstudianteDirectorId()).toBe(88);
		});
	});
	// #endregion

	// #region clearAttendancePreferences
	describe('clearAttendancePreferences', () => {
		it('should clear all attendance preferences', () => {
			service.setAttendanceMonth({ month: 6, year: 2026 });
			service.setSelectedHijoId(1);
			service.setSelectedSalonId(2);
			service.setSelectedEstudianteId(3);
			service.setSelectedGradoSeccionDirector({ grado: '1', seccion: 'A' });
			service.setSelectedEstudianteDirectorId(4);

			service.clearAttendancePreferences();

			expect(service.getAttendanceMonth()).toBeNull();
			expect(service.getSelectedHijoId()).toBeNull();
			expect(service.getSelectedSalonId()).toBeNull();
			expect(service.getSelectedEstudianteId()).toBeNull();
			expect(service.getSelectedGradoSeccionDirector()).toBeNull();
			expect(service.getSelectedEstudianteDirectorId()).toBeNull();
		});
	});
	// #endregion

	// #region clearAll
	describe('clearAll', () => {
		it('should clear everything', () => {
			service.setTheme('dark');
			service.setSidebarCollapsed(true);
			service.setNotificationsSoundEnabled(false);
			service.setAttendanceMonth({ month: 1, year: 2026 });

			service.clearAll();

			expect(service.getTheme()).toBe('system');
			expect(service.getSidebarCollapsed()).toBe(false);
			expect(service.getNotificationsSoundEnabled()).toBe(true);
			expect(service.getAttendanceMonth()).toBeNull();
		});
	});
	// #endregion
});
// #endregion
