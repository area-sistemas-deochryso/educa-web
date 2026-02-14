// #region Imports
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// #endregion
// #region Implementation
@Component({
	selector: 'app-notifications-footer',
	imports: [CommonModule, RouterLink],
	templateUrl: './notifications-footer.component.html',
	styleUrl: './notifications-footer.component.scss',
})
export class NotificationsFooterComponent {
	// * Footer CTA link config.
	@Input() linkRoute = '/intranet';
	@Input() linkText = 'Ver inicio de Intranet';
	@Input() linkIcon = 'pi-home';

	// * Notify parent when link is clicked.
	@Output() linkClick = new EventEmitter<void>();

	onLinkClick(): void {
		this.linkClick.emit();
	}
}
// #endregion
