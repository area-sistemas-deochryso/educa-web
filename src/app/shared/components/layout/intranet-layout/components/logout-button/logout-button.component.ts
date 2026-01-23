import { Component, Output, EventEmitter } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

@Component({
	selector: 'app-logout-button',
	standalone: true,
	imports: [Tooltip],
	templateUrl: './logout-button.component.html',
	styleUrl: './logout-button.component.scss',
})
export class LogoutButtonComponent {
	@Output() logoutClick = new EventEmitter<void>();

	onLogout(): void {
		this.logoutClick.emit();
	}
}
