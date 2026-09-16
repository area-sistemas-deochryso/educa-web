// #region Imports
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

// #endregion
// #region Implementation
@Component({
	selector: 'app-login-button',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [],
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
