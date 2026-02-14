// #region Imports
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// #endregion
// #region Implementation
@Component({
	selector: 'app-login-button',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './login-button.component.html',
	styleUrl: './login-button.component.scss',
})
export class LoginButtonComponent {
	// * Button state + labels.
	@Input() isLoading = false;
	@Input() disabled = false;
	@Input() label = 'Ingresar';
	@Input() loadingLabel = 'Ingresando...';
	@Input() type: 'submit' | 'button' = 'submit';
}
// #endregion
