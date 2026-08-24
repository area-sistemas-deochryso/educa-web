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
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { UserProfileService, NotificationsService } from '@core/services';
import { FeatureFlagsFacade } from '@core/services/feature-flags';
import { ThemeService } from '@core/services/theme';
import { FabMenuVisibilityService } from '@intranet-shared/services';
import { UserInfoDialogComponent } from '../user-info-dialog/user-info-dialog.component';
import { EduAvatar, EduBadge, EduPopover, EduToggle } from '@edu-ui';

// #endregion
// #region Implementation
@Component({
	selector: 'app-user-profile-menu',
	standalone: true,
	imports: [
		EduPopover,
		ButtonModule,
		EduAvatar,
		EduBadge,
		EduToggle,
		FormsModule,
		UserInfoDialogComponent],
	templateUrl: './user-profile-menu.component.html',
	styleUrl: './user-profile-menu.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileMenuComponent {
	// #region Dependencias
	private userProfile = inject(UserProfileService);
	private notificationsService = inject(NotificationsService);
	private flags = inject(FeatureFlagsFacade);
	private fabVisibility = inject(FabMenuVisibilityService);
	private theme = inject(ThemeService);
	// #endregion

	// #region I/O
	popoverStyleClass = input<string>('');
	logoutClick = output<void>();
	// #endregion

	// #region Estado
	readonly popover = viewChild.required<EduPopover>('profilePopover');
	readonly isOpen = signal(false);
	readonly infoDialogVisible = signal(false);

	readonly displayName = this.userProfile.displayName;
	readonly shortName = this.userProfile.shortName;
	readonly userRole = this.userProfile.userRole;
	readonly initials = this.userProfile.initials;

	readonly showNotifications = computed(() => this.flags.isEnabled('notifications'));
	readonly isDarkMode = this.theme.isDarkMode;
	readonly fabHidden = this.fabVisibility.hidden;
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

	onThemeToggle(): void {
		// * No cerramos el popover — el usuario puede querer ver el resultado
		//   del cambio (íconos, textos) antes de cerrar el menú.
		this.theme.toggle();
	}

	onShowFabClick(): void {
		this.popover().hide();
		this.fabVisibility.show();
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
