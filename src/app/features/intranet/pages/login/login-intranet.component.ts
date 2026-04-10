import { AppValidators, LoginFormGroup } from '@shared/validators';
import {
	AuthService,
	StoredSession,
	SwService,
	UserPermissionsService,
	UserRole,
} from '@core/services';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
	LoginButtonComponent,
	LoginErrorMessageComponent,
	LoginHeaderComponent,
	LoginInputComponent,
	LoginOptionsComponent,
	LoginRoleSelectorComponent,
	RolOption,
} from '@intranet-shared/components/login';
import { CommonModule } from '@angular/common';
import { FormErrorComponent } from '@intranet-shared/components/form-error';
import { InputTextModule } from 'primeng/inputtext';
import { Router } from '@angular/router';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { UppercaseInputDirective } from '@app/shared';
import { InitialsPipe } from '@shared/pipes';
import { logger } from '@core/helpers';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UI_LOGIN_MESSAGES } from '@app/shared/constants';

@Component({
	selector: 'app-login-intranet',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		InputTextModule,
		ToggleSwitch,
		Tooltip,
		Select,
		FormErrorComponent,
		LoginHeaderComponent,
		LoginErrorMessageComponent,
		LoginInputComponent,
		LoginRoleSelectorComponent,
		LoginOptionsComponent,
		LoginButtonComponent,
		UppercaseInputDirective,
		InitialsPipe,
	],
	templateUrl: './login-intranet.component.html',
	styleUrl: './login-intranet.component.scss',
})
export class LoginIntranetComponent implements OnInit {
	// #region Dependencias
	private fb = inject(FormBuilder);
	private router = inject(Router);
	private authService = inject(AuthService);
	private userPermissionsService = inject(UserPermissionsService);
	private swService = inject(SwService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Form y estado
	loginForm: LoginFormGroup = this.fb.group({
		dni: this.fb.nonNullable.control('', [Validators.required, AppValidators.dni()]),
		password: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(4)]),
		rol: this.fb.nonNullable.control<UserRole>('Estudiante'),
		rememberMe: this.fb.nonNullable.control(false),
	});

	// * UI state signals
	errorMessage = signal('');
	showError = signal(false);
	isLoading = signal(false);
	showPassword = signal(false);
	showLoginForm = signal(false);

	// * Stored sessions for quick-login (server-side, no passwords exposed).
	storedSessions = signal<StoredSession[]>([]);

	roles: RolOption[] = [
		{ label: 'Estudiante', value: 'Estudiante' },
		{ label: 'Profesor', value: 'Profesor' },
		{ label: 'Director', value: 'Director' },
		{ label: 'Asistente Administrativo', value: 'Asistente Administrativo' },
	];
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		// ! If already authenticated, skip login UI entirely.
		if (this.authService.isAuthenticated) {
			this.router.navigate(['/intranet']);
			return;
		}
		this.authService.resetAttempts();
		this.loadStoredSessions();
	}

	private loadStoredSessions(): void {
		this.authService
			.getSessions()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (sessions) => {
					this.storedSessions.set(sessions);
					if (sessions.length > 0) {
						this.loginForm.patchValue({ rol: sessions[0].rol as UserRole });
					} else {
						// No stored sessions → show form directly
						this.showLoginForm.set(true);
					}
				},
				error: () => {
					// API error → show form as fallback
					this.showLoginForm.set(true);
				},
			});
	}

	/**
	 * Quick-login using a stored server session.
	 * On error: removes the dead session from UI and reloads from server.
	 */
	quickLogin(session: StoredSession): void {
		this.isLoading.set(true);
		this.showError.set(false);

		this.authService
			.switchSession(session.sessionId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.isLoading.set(false);
					this.swService.clearCache();
					this.userPermissionsService.clear();
					this.router.navigate(['/intranet']);
				},
				error: (err: HttpErrorResponse) => {
					this.isLoading.set(false);
					this.handleQuickLoginError(err, session);
				},
			});
	}

	private handleQuickLoginError(err: HttpErrorResponse, session: StoredSession): void {
		// Remove the dead session from UI immediately to prevent retry loop
		this.storedSessions.update((sessions) =>
			sessions.filter((s) => s.sessionId !== session.sessionId),
		);

		// Show specific error based on status
		const isSessionGone = err.status === 404 || err.status === 401;
		this.errorMessage.set(
			isSessionGone
				? 'La sesión expiró o fue eliminada. Inicia sesión nuevamente.'
				: 'Error al cambiar de sesión. Intenta de nuevo.',
		);
		this.showError.set(true);

		logger.warn('[QuickLogin] Session switch failed', err.status, session.sessionId);

		// If no sessions left, show login form
		if (this.storedSessions().length === 0) {
			this.showLoginForm.set(true);
		} else {
			// Reload sessions from server to sync with current state
			this.reloadSessions();
		}
	}

	private reloadSessions(): void {
		this.authService
			.getSessions()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (sessions) => {
					this.storedSessions.set(sessions);
					if (sessions.length === 0) {
						this.showLoginForm.set(true);
					}
				},
			});
	}

	get remainingAttempts(): number {
		return this.authService.remainingAttempts;
	}

	get isBlocked(): boolean {
		return this.authService.isBlocked;
	}

	get isDisabled(): boolean {
		return this.isBlocked || this.isLoading();
	}
	// #endregion

	// #region Event handlers
	onLogin(): void {
		this.showError.set(false);
		this.errorMessage.set('');

		// ! Marcar todos los campos como touched para mostrar errores.
		this.loginForm.markAllAsTouched();

		if (this.loginForm.invalid) {
			this.errorMessage.set(UI_LOGIN_MESSAGES.formInvalid);
			this.showError.set(true);
			return;
		}

		if (this.isBlocked) {
			this.goBack();
			return;
		}

		this.isLoading.set(true);
		const { dni, password, rol, rememberMe } = this.loginForm.getRawValue();

		this.authService
			.login(dni, password, rol, rememberMe)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.isLoading.set(false);

					if (response.success) {
						// ! Clear SW cache + permisos to avoid leaking previous session state.
						this.swService.clearCache();
						this.userPermissionsService.clear();
						this.router.navigate(['/intranet']);
					} else {
						if (this.authService.isBlocked) {
							// * Soft lock: show message then return to public home.
							this.errorMessage.set(
								UI_LOGIN_MESSAGES.tooManyAttemptsRedirect,
							);
							this.showError.set(true);
							setTimeout(() => this.goBack(), 2000);
						} else {
							this.errorMessage.set(
								response.mensaje ||
									UI_LOGIN_MESSAGES.invalidCredentials(this.remainingAttempts),
							);
							this.showError.set(true);
						}
					}
				},
				error: () => {
					this.isLoading.set(false);
					this.errorMessage.set(UI_LOGIN_MESSAGES.connectionError);
					this.showError.set(true);
				},
			});
	}

	onForgotPassword(event: Event): void {
		event.preventDefault();
		// TODO: Implementar recuperación de contraseña.
		// Flujo esperado: el usuario ingresa su DNI → backend envía un enlace/código al correo
		// registrado → el usuario establece nueva contraseña. Requiere endpoint POST /api/auth/forgot-password
		// y pantalla de reset. Mientras tanto, el Director puede resetear contraseñas manualmente desde Usuarios admin.
	}

	showForm(): void {
		this.showLoginForm.set(true);
	}

	backToSessions(): void {
		this.showLoginForm.set(false);
		this.showError.set(false);
		this.errorMessage.set('');
	}

	removeSession(event: Event, session: StoredSession): void {
		event.stopPropagation();
		this.authService
			.removeSession(session.sessionId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.storedSessions.update((sessions) =>
						sessions.filter((s) => s.sessionId !== session.sessionId),
					);
					// If no sessions left, show the login form
					if (this.storedSessions().length === 0) {
						this.showLoginForm.set(true);
					}
				},
				error: () => {
					this.errorMessage.set('Error al eliminar la sesión');
					this.showError.set(true);
				},
			});
	}

	togglePasswordVisibility(): void {
		this.showPassword.update((v) => !v);
	}
	// #endregion

	// #region Helpers privados
	private goBack(): void {
		this.router.navigate(['/']);
	}
	// #endregion
}
