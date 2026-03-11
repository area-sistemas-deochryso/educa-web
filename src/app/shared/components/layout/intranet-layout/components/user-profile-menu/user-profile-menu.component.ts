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
import { UserInfoDialogComponent } from '../user-info-dialog/user-info-dialog.component';

// #endregion
// #region Implementation
@Component({
	selector: 'app-user-profile-menu',
	standalone: true,
	imports: [Popover, ButtonModule, AvatarModule, UserInfoDialogComponent],
	templateUrl: './user-profile-menu.component.html',
	styleUrl: './user-profile-menu.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileMenuComponent {
	// #region Dependencias
	private userProfile = inject(UserProfileService);
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
