import { Component, Input } from '@angular/core';

@Component({
	selector: 'app-login-header',
	standalone: true,
	imports: [],
	templateUrl: './login-header.component.html',
	styleUrl: './login-header.component.scss',
})
export class LoginHeaderComponent {
	@Input() title = 'INICIAR SESIÓN';
	@Input() logoSrc = 'images/logo.png';
}
