import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../services';
import { UppercaseInputDirective } from '../../../pipes';

@Component({
	selector: 'app-login-intranet',
	imports: [
		CommonModule,
		FormsModule,
		InputTextModule,
		CheckboxModule,
		ButtonModule,
		UppercaseInputDirective,
	],
	templateUrl: './login-intranet.component.html',
	styleUrl: './login-intranet.component.scss',
})
export class LoginIntranetComponent implements OnInit {
	username: string | null = null;
	password: string | null = null;
	rememberPassword = false;
	errorMessage = '';
	showError = false;

	constructor(
		private router: Router,
		private authService: AuthService,
	) {}

	ngOnInit(): void {
		// Si ya está autenticado, redirigir a la intranet
		if (this.authService.isAuthenticated) {
			this.router.navigate(['/intranet']);
		}
		// Resetear intentos al cargar el componente
		this.authService.resetAttempts();
	}

	get remainingAttempts(): number {
		return this.authService.remainingAttempts;
	}

	get isBlocked(): boolean {
		return this.authService.isBlocked;
	}

	onLogin(): void {
		this.showError = false;
		this.errorMessage = '';

		const user = this.username?.trim() || '';
		const pass = this.password?.trim() || '';

		if (!user || !pass) {
			this.errorMessage = 'Por favor ingrese usuario y contraseña';
			this.showError = true;
			return;
		}

		if (this.isBlocked) {
			this.goBack();
			return;
		}

		const success = this.authService.login(user, pass, this.rememberPassword);

		if (success) {
			this.router.navigate(['/intranet']);
		} else {
			if (this.authService.isBlocked) {
				this.errorMessage = 'Ha excedido el número máximo de intentos. Será redirigido...';
				this.showError = true;
				setTimeout(() => this.goBack(), 2000);
			} else {
				this.errorMessage = `Credenciales incorrectas. Intentos restantes: ${this.remainingAttempts}`;
				this.showError = true;
			}
		}
	}

	private goBack(): void {
		// Volver a la pantalla anterior (página principal)
		this.router.navigate(['/']);
	}
}
