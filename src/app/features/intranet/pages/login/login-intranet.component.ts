// #region Imports
import { AppValidators, LoginFormGroup } from '@shared/validators';
import {
	AuthService,
	StoredSession,
	SwService,
	UserPermisosService,
	UserRole,
} from '@core/services';
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
} from '@shared/components/login';
import { CommonModule } from '@angular/common';
import { FormErrorComponent } from '@shared/components/form-error';
import { InputTextModule } from 'primeng/inputtext';
import { Router } from '@angular/router';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { UppercaseInputDirective } from '@app/shared';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UI_LOGIN_MESSAGES } from '@app/shared/constants';

// #endregion
// #region Implementation
@Component({
	selector: 'app-login-intranet',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		CommonModule,
		ReactiveFormsModule,
		InputTextModule,
		ToggleSwitch,
		Select,
		FormErrorComponent,
		LoginHeaderComponent,
		LoginErrorMessageComponent,
		LoginInputComponent,
		LoginRoleSelectorComponent,
		LoginOptionsComponent,
		LoginButtonComponent,
		UppercaseInputDirective,
	],
	templateUrl: './login-intranet.component.html',
	styleUrl: './login-intranet.component.scss',
})
export class LoginIntranetComponent implements OnInit {
	private fb = inject(FormBuilder);
	private router = inject(Router);
	private authService = inject(AuthService);
	private userPermisosService = inject(UserPermisosService);
	private swService = inject(SwService);
	private destroyRef = inject(DestroyRef);

	// * Typed reactive form with default role and validators.
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

	// * Role options rendered in the selector (order is intentional).
	roles: RolOption[] = [
		{ label: 'Estudiante', value: 'Estudiante' },
		{ label: 'Profesor', value: 'Profesor' },
		{ label: 'Director', value: 'Director' },
		{ label: 'Asistente Administrativo', value: 'Asistente Administrativo' },
	];

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
	 * No password needed — the server already has the JWT.
	 */
	quickLogin(session: StoredSession): void {
		this.isLoading.set(true);
		this.authService
			.switchSession(session.sessionId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.isLoading.set(false);
					this.swService.clearCache();
					this.userPermisosService.clear();
					this.router.navigate(['/intranet']);
				},
				error: () => {
					this.isLoading.set(false);
					this.errorMessage.set('Error al cambiar de sesión');
					this.showError.set(true);
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
						this.userPermisosService.clear();
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
		// TODO: Implementar recuperacion de contrasena
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

	getInitials(name: string): string {
		return name
			.split(' ')
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase();
	}

	togglePasswordVisibility(): void {
		this.showPassword.update((v) => !v);
	}

	private goBack(): void {
		this.router.navigate(['/']);
	}
}
// #endregion
