// #region Imports
import { Component } from '@angular/core';
import { UserRole } from '@core/services';

// #endregion
// #region Implementation
export interface RolOption {
	label: string;
	value: UserRole;
}

@Component({
	selector: 'app-login-role-selector',
	standalone: true,
	templateUrl: './login-role-selector.component.html',
	styleUrl: './login-role-selector.component.scss',
})
// * Content wrapper for the role selector row.
export class LoginRoleSelectorComponent {}
// #endregion
