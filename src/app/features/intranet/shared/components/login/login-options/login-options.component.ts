// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';

// #endregion
// #region Implementation
@Component({
	selector: 'app-login-options',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './login-options.component.html',
	styleUrl: './login-options.component.scss',
})
// * Wrapper for login options (remember me, links).
export class LoginOptionsComponent {}
// #endregion
