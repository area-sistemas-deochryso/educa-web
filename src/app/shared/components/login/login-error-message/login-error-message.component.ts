// #region Imports
import { Component, Input } from '@angular/core';

// #endregion
// #region Implementation
@Component({
	selector: 'app-login-error-message',
	standalone: true,
	imports: [],
	templateUrl: './login-error-message.component.html',
	styleUrl: './login-error-message.component.scss',
})
export class LoginErrorMessageComponent {
	// * Toggleable validation/message banner.
	@Input() message = '';
	@Input() show = false;
}
// #endregion
