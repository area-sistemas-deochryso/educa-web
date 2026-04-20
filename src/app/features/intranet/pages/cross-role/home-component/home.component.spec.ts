// #region Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { HomeComponent } from './home.component';
import { StorageService } from '@core/services';
import { FeatureFlagsFacade } from '@core/services/feature-flags';
import { UserPermissionsService } from '@core/services/permissions/user-permisos.service';
import { UserProfileService } from '@core/services/user/user-profile.service';
import { signal, WritableSignal } from '@angular/core';
import { APP_USER_ROLES } from '@shared/constants';

// #endregion
// #region Implementation
describe('HomeComponent (Intranet)', () => {
	let component: HomeComponent;
	let fixture: ComponentFixture<HomeComponent>;
	let storageServiceMock: Partial<StorageService>;
	let userProfileMock: {
		isDirector: WritableSignal<boolean>;
		isAsistenteAdministrativo: WritableSignal<boolean>;
		isPromotor: WritableSignal<boolean>;
		isCoordinadorAcademico: WritableSignal<boolean>;
		isProfesor: WritableSignal<boolean>;
	};

	beforeEach(async () => {
		storageServiceMock = {
			getUser: vi.fn().mockReturnValue(null),
			hasUserInfo: vi.fn().mockReturnValue(false),
			getPermisos: vi.fn().mockReturnValue([]),
			getDismissedNotifications: vi.fn().mockReturnValue([]),
			removeDismissedNotifications: vi.fn(),
			getFavoriteRoutes: vi.fn().mockReturnValue([]),
			setFavoriteRoutes: vi.fn(),
		};

		const featureFlagsMock = {
			isEnabled: vi.fn().mockReturnValue(false),
		};

		const userPermisosMock = {
			tienePermiso: vi.fn().mockReturnValue(false),
		};

		userProfileMock = {
			isDirector: signal(false),
			isAsistenteAdministrativo: signal(false),
			isPromotor: signal(false),
			isCoordinadorAcademico: signal(false),
			isProfesor: signal(false),
		};

		await TestBed.configureTestingModule({
			imports: [HomeComponent],
			providers: [
				...testProviders,
				{ provide: StorageService, useValue: storageServiceMock },
				{ provide: FeatureFlagsFacade, useValue: featureFlagsMock },
				{ provide: UserPermissionsService, useValue: userPermisosMock },
				{ provide: UserProfileService, useValue: userProfileMock },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(HomeComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should render without errors', () => {
		expect(fixture.nativeElement).toBeTruthy();
	});

	it('should return default welcome message when no user', () => {
		expect(component.welcomeTitle()).toBe('Bienvenido a tu Intranet');
	});

	it('should return personalized welcome message when user exists', async () => {
		(storageServiceMock.getUser as ReturnType<typeof vi.fn>).mockReturnValue({
			nombreCompleto: 'Juan Pérez',
			rol: 'Estudiante',
		});

		// Recreate component so computed() picks up the new mock value
		fixture = TestBed.createComponent(HomeComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();

		expect(component.welcomeTitle()).toBe('Bienvenido, Juan Pérez');
	});

	it('should have quickAccessItems as array', () => {
		expect(component.quickAccessItems()).toBeDefined();
		expect(Array.isArray(component.quickAccessItems())).toBe(true);
	});

	describe('showAttendanceWidget gate', () => {
		const adminRoles = [
			{ label: 'Director', flag: 'isDirector' as const, role: APP_USER_ROLES.Director },
			{
				label: 'Asistente Administrativo',
				flag: 'isAsistenteAdministrativo' as const,
				role: APP_USER_ROLES.AsistenteAdministrativo,
			},
			{ label: 'Promotor', flag: 'isPromotor' as const, role: APP_USER_ROLES.Promotor },
			{
				label: 'Coordinador Académico',
				flag: 'isCoordinadorAcademico' as const,
				role: APP_USER_ROLES.CoordinadorAcademico,
			},
		];

		it.each(adminRoles)(
			'should show attendance widget for $label',
			async ({ flag }) => {
				userProfileMock[flag].set(true);
				fixture = TestBed.createComponent(HomeComponent);
				component = fixture.componentInstance;
				await fixture.whenStable();

				expect(component.showAttendanceWidget()).toBe(true);
			},
		);

		it('should NOT show attendance widget for Estudiante / Apoderado / Profesor (all flags false)', () => {
			expect(component.showAttendanceWidget()).toBe(false);
		});
	});
});
// #endregion
