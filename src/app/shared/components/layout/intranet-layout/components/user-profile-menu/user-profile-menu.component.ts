// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import { Popover } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { UserProfileService, NotificationsService } from '@core/services';
import { FeatureFlagsFacade } from '@core/services/feature-flags';
import { UserInfoDialogComponent } from '../user-info-dialog/user-info-dialog.component';

// #endregion
// #region Implementation
@Component({
	selector: 'app-user-profile-menu',
	standalone: true,
	imports: [Popover, ButtonModule, AvatarModule, BadgeModule, UserInfoDialogComponent],
	templateUrl: './user-profile-menu.component.html',
	styleUrl: './user-profile-menu.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileMenuComponent {
	// #region Dependencias
	private userProfile = inject(UserProfileService);
	private notificationsService = inject(NotificationsService);
	private flags = inject(FeatureFlagsFacade);
	// #endregion

	// #region I/O
	popoverStyleClass = input<string>('');
	logoutClick = output<void>();
	// #endregion

	// #region Estado
	readonly popover = viewChild.required<Popover>('profilePopover');
	readonly isOpen = signal(false);
	readonly infoDialogVisible = signal(false);

	readonly displayName = this.userProfile.displayName;
	readonly userRole = this.userProfile.userRole;
	readonly initials = this.userProfile.initials;

	readonly showNotifications = computed(() => this.flags.isEnabled('notifications'));
	readonly unreadCount = this.notificationsService.unreadCount;
	readonly unreadBadge = computed(() => {
		const count = this.unreadCount();
		return count > 0 ? String(count) : '';
	});
	// #endregion

	// #region Handlers del popover
	toggleMenu(event: Event): void {
		this.popover().toggle(event);
	}

	onPopoverShow(): void {
		this.isOpen.set(true);
	}

	onPopoverHide(): void {
		this.isOpen.set(false);
	}
	// #endregion

	// #region Handlers de acciones del menú
	onNotificationsClick(): void {
		this.popover().hide();
		this.notificationsService.togglePanel();
	}

	onInfoClick(): void {
		// * Cerrar popover antes de abrir el diálogo.
		this.popover().hide();
		this.infoDialogVisible.set(true);
	}

	onInfoDialogVisibleChange(visible: boolean): void {
		if (!visible) this.infoDialogVisible.set(false);
	}

	onLogout(): void {
		this.popover().hide();
		this.logoutClick.emit();
	}
	// #endregion
}
// #endregion
