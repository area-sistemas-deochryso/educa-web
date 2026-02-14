// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import { Popover } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { UserProfileService } from '@core/services';

// #endregion
// #region Implementation
@Component({
	selector: 'app-user-profile-menu',
	standalone: true,
	imports: [Popover, ButtonModule, AvatarModule],
	templateUrl: './user-profile-menu.component.html',
	styleUrl: './user-profile-menu.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileMenuComponent {
	// * User profile info for the menu display.
	private userProfile = inject(UserProfileService);

	// * Popover styling + logout event.
	popoverStyleClass = input<string>('');
	logoutClick = output<void>();

	// * ViewChild for PrimeNG popover control.
	readonly popover = viewChild.required<Popover>('profilePopover');
	readonly isOpen = signal(false);

	readonly displayName = this.userProfile.displayName;
	readonly userRole = this.userProfile.userRole;
	readonly initials = this.userProfile.initials;

	toggleMenu(event: Event): void {
		// * Toggle popover from click.
		this.popover().toggle(event);
	}

	onPopoverShow(): void {
		// * Track open state for styling.
		this.isOpen.set(true);
	}

	onPopoverHide(): void {
		// * Track closed state for styling.
		this.isOpen.set(false);
	}

	onLogout(): void {
		// * Hide popover before emitting logout.
		this.popover().hide();
		this.logoutClick.emit();
	}
}
// #endregion
