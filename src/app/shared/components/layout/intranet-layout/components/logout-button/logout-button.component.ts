// #region Imports
import { Component, Output, EventEmitter } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

// #endregion
// #region Implementation
@Component({
	selector: 'app-logout-button',
	standalone: true,
	imports: [Tooltip],
	templateUrl: './logout-button.component.html',
	styleUrl: './logout-button.component.scss',
})
export class LogoutButtonComponent {
	// * Emits when user clicks logout.
	@Output() logoutClick = new EventEmitter<void>();

	onLogout(): void {
		// * Bubble logout action to parent.
		this.logoutClick.emit();
	}
}
// #endregion
