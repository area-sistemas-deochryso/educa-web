// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { testProviders } from '@test';
import { AttendanceComponent } from './attendance.component';
import { UserProfileService } from '@core/services';

// #endregion
// #region Implementation
describe('AttendanceComponent', () => {
	let component: AttendanceComponent;
	let fixture: ComponentFixture<AttendanceComponent>;
	let userProfileMock: Partial<UserProfileService>;

	beforeEach(async () => {
		userProfileMock = {
			userRole: signal<'Estudiante' | 'Apoderado' | 'Profesor' | 'Director' | ''>('Apoderado'),
			userName: signal('Test User'),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceComponent],
			providers: [...testProviders, { provide: UserProfileService, useValue: userProfileMock }],
		}).compileComponents();

		fixture = TestBed.createComponent(AttendanceComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should expose userRole from UserProfileService', () => {
		expect(component.userRole()).toBe('Apoderado');
	});

	it('should have loading signal initialized to false', () => {
		expect(component.loading()).toBe(false);
	});

	it('should call appropriate component reload method based on role', () => {
		// Mock apoderado component
		component.apoderadoComponent = {
			reload: vi.fn(),
		} as any;

		component.onReload();

		expect(component.apoderadoComponent.reload).toHaveBeenCalled();
	});

	it('should have onModeChange method', () => {
		expect(component.onModeChange).toBeDefined();
		expect(typeof component.onModeChange).toBe('function');

		// Should not throw when called
		expect(() => component.onModeChange('dia')).not.toThrow();
		expect(() => component.onModeChange('mes')).not.toThrow();
	});

	it('should have onReload method that delegates to appropriate component', () => {
		// Mock apoderado component (current role)
		const mockApoderado = { reload: vi.fn() };
		component.apoderadoComponent = mockApoderado as any;

		component.onReload();

		expect(mockApoderado.reload).toHaveBeenCalled();
	});

	it('should delegate reload to estudiante component when role is Estudiante', () => {
		userProfileMock.userRole = signal('Estudiante');

		const newFixture = TestBed.createComponent(AttendanceComponent);
		const newComponent = newFixture.componentInstance;

		const mockEstudiante = { reload: vi.fn() };
		newComponent.estudianteComponent = mockEstudiante as any;

		newComponent.onReload();

		expect(mockEstudiante.reload).toHaveBeenCalled();
	});

	it('should handle unexpected role in constructor', () => {
		// This test verifies the component doesn't crash with unexpected roles
		userProfileMock.userRole = signal('UnknownRole' as any);

		// Component should still create without errors
		expect(() => {
			TestBed.createComponent(AttendanceComponent);
		}).not.toThrow();
	});
});
// #endregion
