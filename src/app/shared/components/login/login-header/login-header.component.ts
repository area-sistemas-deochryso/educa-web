// #region Imports
import { Component, Input } from '@angular/core';

// #endregion
// #region Implementation
@Component({
	selector: 'app-login-header',
	standalone: true,
	imports: [],
	templateUrl: './login-header.component.html',
	styleUrl: './login-header.component.scss',
})
export class LoginHeaderComponent {
	// * Title + logo source used by the login header.
	@Input() title = 'INICIAR SESIÃƒâ€œN';
	@Input() logoSrc = 'images/logo.png';
}
// #endregion
