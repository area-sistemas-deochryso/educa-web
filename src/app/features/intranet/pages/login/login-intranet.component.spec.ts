// * Tests for LoginIntranetComponent — validates form, login flow, and state.
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { LoginIntranetComponent } from './login-intranet.component';
import { AuthService, SwService, UserPermissionsService } from '@core/services';
import { testProviders } from '@test';

// #endregion

// #region Tests
describe('LoginIntranetComponent', () => {
	let component: LoginIntranetComponent;
	let fixture: ComponentFixture<LoginIntranetComponent>;
	let authServiceMock: Partial<AuthService>;
	let routerMock: Partial<Router>;

	beforeEach(async () => {
		authServiceMock = {
			isAuthenticated: false,
			isBlocked: false,
			remainingAttempts: 3,
			loginAttempts: 0,
			resetAttempts: vi.fn(),
			login: vi.fn().mockReturnValue(
				of({
					success: true,
					token: '',
					rol: 'Estudiante',
					nombreCompleto: 'Test User',
					entityId: 1,
					sedeId: 1,
					mensaje: 'Login exitoso',
				}),
			),
			getSessions: vi.fn().mockReturnValue(of([])),
		};

		routerMock = {
			navigate: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [LoginIntranetComponent],
			providers: [
				...testProviders,
				{ provide: AuthService, useValue: authServiceMock },
				{ provide: Router, useValue: routerMock },
				{ provide: SwService, useValue: { clearCache: vi.fn() } },
				{ provide: UserPermissionsService, useValue: { clear: vi.fn() } },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(LoginIntranetComponent);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	// #region Form initialization
	describe('form initialization', () => {
		it('should have a form with required controls', () => {
			expect(component.loginForm.contains('dni')).toBe(true);
			expect(component.loginForm.contains('password')).toBe(true);
			expect(component.loginForm.contains('rol')).toBe(true);
			expect(component.loginForm.contains('rememberMe')).toBe(true);
		});

		it('should have default values', () => {
			const formValue = component.loginForm.getRawValue();
			expect(formValue.dni).toBe('');
			expect(formValue.password).toBe('');
			expect(formValue.rol).toBe('Estudiante');
			expect(formValue.rememberMe).toBe(false);
		});
	});
	// #endregion

	// #region Form validation
	describe('form validation', () => {
		it('should be invalid when empty', () => {
			expect(component.loginForm.valid).toBe(false);
		});

		it('should be invalid with only dni', () => {
			component.loginForm.patchValue({ dni: '12345678' });
			expect(component.loginForm.valid).toBe(false);
		});

		it('should be valid with dni and password', () => {
			component.loginForm.patchValue({
				dni: '12345678',
				password: 'password123',
			});
			expect(component.loginForm.valid).toBe(true);
		});
	});
	// #endregion

	// #region onLogin
	describe('onLogin', () => {
		it('should not submit if form is invalid', () => {
			component.onLogin();

			expect(authServiceMock.login).not.toHaveBeenCalled();
			expect(component.showError()).toBe(true);
		});

		it('should call authService.login with valid form', () => {
			component.loginForm.patchValue({
				dni: '12345678',
				password: 'password123',
				rol: 'Estudiante',
				rememberMe: false,
			});

			component.onLogin();

			expect(authServiceMock.login).toHaveBeenCalledWith(
				'12345678',
				'password123',
				'Estudiante',
				false,
			);
		});

		it('should navigate to intranet on successful login', () => {
			component.loginForm.patchValue({
				dni: '12345678',
				password: 'password123',
			});

			component.onLogin();

			expect(routerMock.navigate).toHaveBeenCalledWith(['/intranet']);
		});

		it('should show error on failed login', () => {
			authServiceMock.login = vi.fn().mockReturnValue(
				of({
					success: false,
					token: '',
					rol: 'Estudiante',
					nombreCompleto: '',
					entityId: 0,
					sedeId: 0,
					mensaje: 'Credenciales inválidas',
				}),
			);

			component.loginForm.patchValue({
				dni: '12345678',
				password: 'wrongpassword',
			});

			component.onLogin();

			expect(component.showError()).toBe(true);
		});
	});
	// #endregion

	// #region State getters
	describe('state getters', () => {
		it('should return remainingAttempts from authService', () => {
			expect(component.remainingAttempts).toBe(3);
		});

		it('should return isBlocked from authService', () => {
			expect(component.isBlocked).toBe(false);
		});

		it('should compute isDisabled correctly', () => {
			expect(component.isDisabled).toBe(false);
		});
	});
	// #endregion

	// #region UI helpers
	describe('togglePasswordVisibility', () => {
		it('should toggle password visibility', () => {
			expect(component.showPassword()).toBe(false);

			component.togglePasswordVisibility();
			expect(component.showPassword()).toBe(true);

			component.togglePasswordVisibility();
			expect(component.showPassword()).toBe(false);
		});
	});

	describe('roles', () => {
		it('should have 6 available roles', () => {
			expect(component.roles.length).toBe(6);
		});

		it('should include all user roles', () => {
			const roleValues = component.roles.map((r) => r.value);
			expect(roleValues).toContain('Estudiante');
			expect(roleValues).toContain('Profesor');
			expect(roleValues).toContain('Director');
			expect(roleValues).toContain('Asistente Administrativo');
			expect(roleValues).toContain('Promotor');
			expect(roleValues).toContain('Coordinador Académico');
		});
	});
	// #endregion

	// #region Redirect if authenticated
	describe('redirect if already authenticated', () => {
		it('should redirect to intranet if already authenticated', () => {
			authServiceMock.isAuthenticated = true;

			const newFixture = TestBed.createComponent(LoginIntranetComponent);
			const newComponent = newFixture.componentInstance;
			newComponent.ngOnInit();

			expect(routerMock.navigate).toHaveBeenCalledWith(['/intranet']);
		});
	});
	// #endregion
});
// #endregion
