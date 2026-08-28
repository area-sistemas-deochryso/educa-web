// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { testProviders } from '@test';
import { AttendanceComponent } from './attendance.component';
import { UserProfileService } from '@core/services';
import { ViewAsContextService, ViewAsContext } from '@core/services/view-as';
import { AttendanceApoderadoComponent } from './attendance-apoderado/attendance-apoderado.component';
import { AttendanceEstudianteComponent } from './attendance-estudiante/attendance-estudiante.component';
import { AttendanceProfesorComponent } from './attendance-profesor/attendance-profesor.component';

// #endregion
// #region Implementation
describe('AttendanceComponent', () => {
	let component: AttendanceComponent;
	let fixture: ComponentFixture<AttendanceComponent>;
	let userProfileMock: Partial<UserProfileService>;
	let viewAsContextMock: Partial<ViewAsContextService>;

	beforeEach(async () => {
		userProfileMock = {
			userRole: signal<'Estudiante' | 'Apoderado' | 'Profesor' | 'Director' | ''>('Apoderado'),
			userName: signal('Test User'),
			rol: (() => undefined) as UserProfileService['rol'],
		};
		viewAsContextMock = {
			activeContext: signal<ViewAsContext | null>(null),
		};

		await TestBed.configureTestingModule({
			imports: [AttendanceComponent],
			providers: [
				...testProviders,
				{ provide: UserProfileService, useValue: userProfileMock },
				{ provide: ViewAsContextService, useValue: viewAsContextMock },
			],
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
		} as unknown as AttendanceApoderadoComponent;

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
		component.apoderadoComponent = mockApoderado as unknown as AttendanceApoderadoComponent;

		component.onReload();

		expect(mockApoderado.reload).toHaveBeenCalled();
	});

	it('should delegate reload to estudiante component when role is Estudiante', () => {
		userProfileMock.userRole = signal('Estudiante');

		const newFixture = TestBed.createComponent(AttendanceComponent);
		const newComponent = newFixture.componentInstance;

		const mockEstudiante = { reload: vi.fn() };
		newComponent.estudianteComponent = mockEstudiante as unknown as AttendanceEstudianteComponent;

		newComponent.onReload();

		expect(mockEstudiante.reload).toHaveBeenCalled();
	});

	it('should handle unexpected role in constructor', () => {
		// This test verifies the component doesn't crash with unexpected roles
		userProfileMock.userRole = signal('UnknownRole');

		// Component should still create without errors
		expect(() => {
			TestBed.createComponent(AttendanceComponent);
		}).not.toThrow();
	});

	// * Brief 578 (P104 F1) — "ver como" debe pisar el rol real, no el de la sesión del admin.
	describe('"ver como" (effectiveRole)', () => {
		it('falls back to the real userRole when no ver-como context is active', () => {
			userProfileMock.userRole = signal('Director');

			const newFixture = TestBed.createComponent(AttendanceComponent);
			const newComponent = newFixture.componentInstance;

			expect(newComponent.effectiveRole()).toBe('Director');
		});

		it('uses the impersonated rol instead of the real (staff) rol while viewing as', () => {
			userProfileMock.userRole = signal('Director');
			viewAsContextMock.activeContext = signal<ViewAsContext | null>({
				entityId: 1,
				rol: 'Estudiante',
				nombreCompleto: 'Test Student',
			});

			const newFixture = TestBed.createComponent(AttendanceComponent);
			const newComponent = newFixture.componentInstance;

			expect(newComponent.effectiveRole()).toBe('Estudiante');
		});

		it('never shows the director mode selector while impersonating, even if the admin is staff', () => {
			userProfileMock.userRole = signal('Director');
			userProfileMock.rol = (() => ({ esStaff: true })) as UserProfileService['rol'];
			viewAsContextMock.activeContext = signal<ViewAsContext | null>({
				entityId: 1,
				rol: 'Estudiante',
				nombreCompleto: 'Test Student',
			});

			const newFixture = TestBed.createComponent(AttendanceComponent);
			const newComponent = newFixture.componentInstance;

			expect(newComponent.showModeSelector()).toBe(false);
		});

		it('delegates reload to the estudiante component while impersonating a Profesor as director', () => {
			userProfileMock.userRole = signal('Director');
			viewAsContextMock.activeContext = signal<ViewAsContext | null>({
				entityId: 1,
				rol: 'Profesor',
				nombreCompleto: 'Test Teacher',
			});

			const newFixture = TestBed.createComponent(AttendanceComponent);
			const newComponent = newFixture.componentInstance;
			const mockProfesor = { reload: vi.fn(), setViewMode: vi.fn() };
			newComponent.profesorComponent = mockProfesor as unknown as AttendanceProfesorComponent;

			newComponent.onReload();

			expect(mockProfesor.reload).toHaveBeenCalled();
		});
	});
});
// #endregion
