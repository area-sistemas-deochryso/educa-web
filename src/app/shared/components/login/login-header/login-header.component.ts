import { Component, Input } from '@angular/core';

@Component({
	selector: 'app-login-header',
	standalone: true,
	imports: [],
	templateUrl: './login-header.component.html',
	styleUrl: './login-header.component.scss',
})
export class LoginHeaderComponent {
	// * Title + logo source used by the login header.
	@Input() title = 'INICIAR SESIÓN';
	@Input() logoSrc = 'images/logo.png';
}
