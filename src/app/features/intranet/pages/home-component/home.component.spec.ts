// #region Imports
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { testProviders } from '@test';
import { HomeComponent } from './home.component';
import { StorageService, NotificationsService } from '@core/services';

// #endregion
// #region Implementation
describe('HomeComponent (Intranet)', () => {
	let component: HomeComponent;
	let fixture: ComponentFixture<HomeComponent>;
	let storageServiceMock: Partial<StorageService>;
	let notificationsServiceMock: Partial<NotificationsService>;

	beforeEach(async () => {
		storageServiceMock = {
			getUser: vi.fn().mockReturnValue(null),
			getDismissedNotifications: vi.fn().mockReturnValue([]),
			removeDismissedNotifications: vi.fn(),
		};

		notificationsServiceMock = {
			notifications: vi.fn().mockReturnValue([]),
			unreadCount: vi.fn().mockReturnValue(0),
			dismiss: vi.fn(),
			markAsRead: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [HomeComponent],
			providers: [
				...testProviders,
				{ provide: StorageService, useValue: storageServiceMock },
				{ provide: NotificationsService, useValue: notificationsServiceMock },
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
		expect(component.welcomeTitle).toBe('Bienvenido a tu Intranet');
	});

	it('should return personalized welcome message when user exists', () => {
		(storageServiceMock.getUser as ReturnType<typeof vi.fn>).mockReturnValue({
			nombreCompleto: 'Juan PÃƒÂ©rez',
			rol: 'Estudiante',
		});
		expect(component.welcomeTitle).toBe('Bienvenido, Juan PÃƒÂ©rez');
	});

	it('should have available courses', () => {
		expect(component.availableCourses).toBeDefined();
		expect(Array.isArray(component.availableCourses)).toBe(true);
	});
});
// #endregion
