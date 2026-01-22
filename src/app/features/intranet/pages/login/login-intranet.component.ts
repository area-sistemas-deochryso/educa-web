import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { Select } from 'primeng/select';

import { AuthService, UserRole } from '@core/services';
import {
	LoginHeaderComponent,
	LoginErrorMessageComponent,
	LoginInputComponent,
	LoginRoleSelectorComponent,
	RolOption,
	LoginOptionsComponent,
	LoginButtonComponent,
} from '@shared/components/login';

@Component({
	selector: 'app-login-intranet',
	imports: [
		CommonModule,
		FormsModule,
		InputTextModule,
		CheckboxModule,
		Select,
		LoginHeaderComponent,
		LoginErrorMessageComponent,
		LoginInputComponent,
		LoginRoleSelectorComponent,
		LoginOptionsComponent,
		LoginButtonComponent,
	],
	templateUrl: './login-intranet.component.html',
	styleUrl: './login-intranet.component.scss',
})
export class LoginIntranetComponent implements OnInit {
	dni = '';
	password = '';
	selectedRol: UserRole = 'Estudiante';
	rememberMe = false;
	errorMessage = '';
	showError = false;
	isLoading = false;
	showPassword = false;

	roles: RolOption[] = [
		{ label: 'Estudiante', value: 'Estudiante' },
		{ label: 'Apoderado', value: 'Apoderado' },
		{ label: 'Profesor', value: 'Profesor' },
		{ label: 'Director', value: 'Director' },
	];

	constructor(
		private router: Router,
		private authService: AuthService,
	) {}

	ngOnInit(): void {
		if (this.authService.isAuthenticated) {
			this.router.navigate(['/intranet']);
			return;
		}
		this.authService.resetAttempts();
		this.tryAutofillFromRememberToken();
	}

	private tryAutofillFromRememberToken(): void {
		this.authService.verifyTokenForAutofill().subscribe({
			next: (response) => {
				if (response) {
					this.dni = response.dni;
					this.password = response.contraseña;
					this.selectedRol = response.rol;
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
		return this.isBlocked || this.isLoading;
	}

	onLogin(): void {
		this.showError = false;
		this.errorMessage = '';

		const dniValue = this.dni.trim();
		const passValue = this.password.trim();

		if (!dniValue || !passValue) {
			this.errorMessage = 'Por favor ingrese DNI y contraseña';
			this.showError = true;
			return;
		}

		if (dniValue.length !== 8) {
			this.errorMessage = 'El DNI debe tener 8 dígitos';
			this.showError = true;
			return;
		}

		if (this.isBlocked) {
			this.goBack();
			return;
		}

		this.isLoading = true;

		this.authService.login(dniValue, passValue, this.selectedRol, this.rememberMe).subscribe({
			next: (response) => {
				this.isLoading = false;

				if (response.token) {
					this.router.navigate(['/intranet']);
				} else {
					if (this.authService.isBlocked) {
						this.errorMessage =
							'Ha excedido el número máximo de intentos. Será redirigido...';
						this.showError = true;
						setTimeout(() => this.goBack(), 2000);
					} else {
						this.errorMessage =
							response.mensaje ||
							`Credenciales incorrectas. Intentos restantes: ${this.remainingAttempts}`;
						this.showError = true;
					}
				}
			},
			error: () => {
				this.isLoading = false;
				this.errorMessage = 'Error de conexión. Intente nuevamente.';
				this.showError = true;
			},
		});
	}

	onForgotPassword(event: Event): void {
		event.preventDefault();
		// TODO: Implementar recuperación de contraseña
	}

	togglePasswordVisibility(): void {
		this.showPassword = !this.showPassword;
	}

	private goBack(): void {
		this.router.navigate(['/']);
	}
}
