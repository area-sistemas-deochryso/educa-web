// #region Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { HomeComponent } from './home.component';
import { QuickAccessLayoutService } from '@intranet-shared/services/quick-access-layout.service';
import { StorageService } from '@core/services';
import { FeatureFlagsFacade } from '@core/services/feature-flags';
import { UserPermissionsService } from '@core/services/permissions';
import { UserProfileService } from '@core/services/user';
import { computed, signal, Signal, WritableSignal } from '@angular/core';

// #endregion
// #region Implementation
describe('HomeComponent (Intranet)', () => {
	let component: HomeComponent;
	let fixture: ComponentFixture<HomeComponent>;
	let storageServiceMock: Partial<StorageService>;
	let userPermisosMock: {
		tienePermiso: ReturnType<typeof vi.fn>;
		hasCapability: ReturnType<typeof vi.fn>;
	};
	let userProfileMock: {
		isDirector: WritableSignal<boolean>;
		isAsistenteAdministrativo: WritableSignal<boolean>;
		isPromotor: WritableSignal<boolean>;
		isCoordinadorAcademico: WritableSignal<boolean>;
		isProfesor: WritableSignal<boolean>;
		isAdministrativo: Signal<boolean>;
	};

	beforeEach(async () => {
		storageServiceMock = {
			getUser: vi.fn().mockReturnValue(null),
			hasUserInfo: vi.fn().mockReturnValue(false),
			getPermisos: vi.fn().mockReturnValue([]),
			getDismissedNotifications: vi.fn().mockReturnValue([]),
			removeDismissedNotifications: vi.fn(),
			getQuickAccessLayout: vi.fn().mockReturnValue({ slots: [] }),
			setQuickAccessLayout: vi.fn(),
		};

		const featureFlagsMock = {
			isEnabled: vi.fn().mockReturnValue(false),
		};

		const userPermisosMockLocal = {
			tienePermiso: vi.fn().mockReturnValue(false),
			hasCapability: vi.fn().mockReturnValue(false),
		};
		userPermisosMock = userPermisosMockLocal;

		const isDirector = signal(false);
		const isAsistenteAdministrativo = signal(false);
		const isPromotor = signal(false);
		const isCoordinadorAcademico = signal(false);
		userProfileMock = {
			isDirector,
			isAsistenteAdministrativo,
			isPromotor,
			isCoordinadorAcademico,
			isProfesor: signal(false),
			isAdministrativo: computed(
				() =>
					isDirector() ||
					isAsistenteAdministrativo() ||
					isPromotor() ||
					isCoordinadorAcademico(),
			),
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

	it('should render the welcome title in the DOM', () => {
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain('Bienvenido a tu Intranet');
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

	it('should resolve no slots when the user has no pinned shortcuts', () => {
		// Layout vacío hasta que el usuario marque accesos con el buscador Ctrl+K.
		expect(component.resolvedSlots()).toEqual([]);
	});

	it('should resolve a pinned shortcut the user has capability for', () => {
		userPermisosMock.hasCapability.mockReturnValue(true);
		TestBed.inject(QuickAccessLayoutService).addItem('/intranet/estudiante/cursos');

		const slots = component.resolvedSlots();
		expect(slots).toHaveLength(1);
		expect(slots[0]).toMatchObject({
			kind: 'item',
			route: '/intranet/estudiante/cursos',
			label: 'Mis Cursos',
			capability: 'CURSOS_ESTUDIANTE_PAGE_API_VIEW',
		});
	});

	it('should filter out pinned shortcuts the user has no capability for', () => {
		userPermisosMock.hasCapability.mockReturnValue(false);
		TestBed.inject(QuickAccessLayoutService).addItem('/intranet/estudiante/cursos');

		expect(component.resolvedSlots()).toEqual([]);
	});

	describe('showAttendanceWidget gate', () => {
		// Los 4 roles administrativos comparten el mismo summary widget.
		const adminRoles = [
			{ label: 'Director', flag: 'isDirector' as const },
			{ label: 'Promotor', flag: 'isPromotor' as const },
			{ label: 'Coordinador Académico', flag: 'isCoordinadorAcademico' as const },
			{ label: 'Asistente Administrativo', flag: 'isAsistenteAdministrativo' as const },
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
