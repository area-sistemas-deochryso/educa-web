import { AppValidators, LoginFormGroup } from '@shared/validators';
import {
	AuthService,
	SwService,
	UserPermisosService,
	UserRole,
	VerifyTokenResponse,
} from '@core/services';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
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
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { CommonModule } from '@angular/common';
import { FormErrorComponent } from '@shared/components/form-error';
import { InputTextModule } from 'primeng/inputtext';
import { Router } from '@angular/router';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { UppercaseInputDirective } from '@app/shared';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UI_LOGIN_MESSAGES } from '@app/shared/constants';

@Component({
	selector: 'app-login-intranet',
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

	// Form tipado
	loginForm: LoginFormGroup = this.fb.group({
		dni: this.fb.nonNullable.control('', [Validators.required, AppValidators.dni()]),
		password: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(4)]),
		rol: this.fb.nonNullable.control<UserRole>('Estudiante'),
		rememberMe: this.fb.nonNullable.control(false),
	});

	// Estado con Signals
	errorMessage = signal('');
	showError = signal(false);
	isLoading = signal(false);
	showPassword = signal(false);

	// Usuarios recordados para autocompletado
	private rememberedUsers: VerifyTokenResponse[] = [];

	roles: RolOption[] = [
		{ label: 'Estudiante', value: 'Estudiante' },
		{ label: 'Profesor', value: 'Profesor' },
		{ label: 'Director', value: 'Director' },
		{ label: 'Asistente Administrativo', value: 'Asistente Administrativo' },
	];

	ngOnInit(): void {
		if (this.authService.isAuthenticated) {
			this.router.navigate(['/intranet']);
			return;
		}
		this.authService.resetAttempts();
		this.loadRememberedUsers();
		this.setupDniAutocomplete();
	}

	private loadRememberedUsers(): void {
		this.authService
			.verifyAllStoredTokens()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (users) => {
					this.rememberedUsers = users;
					// Si hay usuarios, autocompletar con el primero
					if (users.length > 0) {
						this.autofillFromUser(users[0]);
					}
				},
			});
	}

	private setupDniAutocomplete(): void {
		this.loginForm.controls.dni.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef), debounceTime(300), distinctUntilChanged())
			.subscribe((dni) => {
				this.tryAutocompleteFromDni(dni);
			});
	}

	private tryAutocompleteFromDni(dni: string): void {
		if (!dni || dni.length < 3) return;

		// Buscar usuario que coincida con el DNI
		const matchingUser = this.rememberedUsers.find((user) => user.dni === dni);

		if (matchingUser) {
			this.autofillFromUser(matchingUser, false); // false = no sobrescribir DNI
		}
	}

	private autofillFromUser(user: VerifyTokenResponse, includeDni = true): void {
		const patchData: Partial<{ dni: string; password: string; rol: UserRole }> = {
			password: user.contraseña,
			rol: user.rol,
		};

		if (includeDni) {
			patchData.dni = user.dni;
		}

		this.loginForm.patchValue(patchData);
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

		// Marcar todos los campos como touched para mostrar errores
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

					if (response.token) {
						// Limpiar cache del SW y permisos de sesión anterior para forzar recarga
						this.swService.clearCache();
						this.userPermisosService.clear();
						this.router.navigate(['/intranet']);
					} else {
						if (this.authService.isBlocked) {
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

	togglePasswordVisibility(): void {
		this.showPassword.update((v) => !v);
	}

	private goBack(): void {
		this.router.navigate(['/']);
	}
}
