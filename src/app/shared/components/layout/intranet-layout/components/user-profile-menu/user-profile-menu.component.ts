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

@Component({
	selector: 'app-user-profile-menu',
	standalone: true,
	imports: [Popover, ButtonModule, AvatarModule],
	templateUrl: './user-profile-menu.component.html',
	styleUrl: './user-profile-menu.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileMenuComponent {
	private userProfile = inject(UserProfileService);

	popoverStyleClass = input<string>('');
	logoutClick = output<void>();

	readonly popover = viewChild.required<Popover>('profilePopover');
	readonly isOpen = signal(false);

	readonly displayName = this.userProfile.displayName;
	readonly userRole = this.userProfile.userRole;
	readonly initials = this.userProfile.initials;

	toggleMenu(event: Event): void {
		this.popover().toggle(event);
	}

	onPopoverShow(): void {
		this.isOpen.set(true);
	}

	onPopoverHide(): void {
		this.isOpen.set(false);
	}

	onLogout(): void {
		this.popover().hide();
		this.logoutClick.emit();
	}
}
