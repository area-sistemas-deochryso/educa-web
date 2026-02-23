// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';

// #endregion
// #region Implementation
@Component({
	selector: 'app-login-input',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './login-input.component.html',
	styleUrl: './login-input.component.scss',
})
// * Content wrapper to align icon + input styles.
export class LoginInputComponent {}
// #endregion
