import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
	selector: 'app-notifications-footer',
	imports: [CommonModule, RouterLink],
	templateUrl: './notifications-footer.component.html',
	styleUrl: './notifications-footer.component.scss',
})
export class NotificationsFooterComponent {
	@Input() linkRoute = '/intranet';
	@Input() linkText = 'Ver inicio de Intranet';
	@Input() linkIcon = 'pi-home';

	@Output() linkClick = new EventEmitter<void>();

	onLinkClick(): void {
		this.linkClick.emit();
	}
}
