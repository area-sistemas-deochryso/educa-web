// #region Imports
import { ChangeDetectionStrategy, Component, Input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserProfileMenuComponent } from '../user-profile-menu';

// #endregion
// #region Implementation
export interface NavMenuItem {
	route?: string;
	label: string;
	icon: string;
	exact?: boolean;
	children?: NavMenuItem[];
}

@Component({
	selector: 'app-mobile-menu',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink, RouterLinkActive, UserProfileMenuComponent],
	templateUrl: './mobile-menu.component.html',
	styleUrl: './mobile-menu.component.scss',
})
export class MobileMenuComponent {
	// * Menu items passed from intranet layout.
	@Input({ required: true }) items: NavMenuItem[] = [];
	logoutClick = output<void>();

	// * Drawer and submenu expansion state.
	isOpen = signal(false);
	expandedItems = signal<Set<string>>(new Set());

	toggle(): void {
		// * Open/close the mobile menu drawer.
		this.isOpen.update((v) => !v);
	}

	close(): void {
		// * Close drawer and reset submenu state.
		this.isOpen.set(false);
		this.expandedItems.set(new Set());
	}

	toggleSubmenu(label: string): void {
		// * Toggle a submenu by label.
		this.expandedItems.update((set) => {
			const newSet = new Set(set);
			if (newSet.has(label)) {
				newSet.delete(label);
			} else {
				newSet.add(label);
			}
			return newSet;
		});
	}

	isExpanded(label: string): boolean {
		return this.expandedItems().has(label);
	}

	onLogout(): void {
		// * Close menu and bubble logout event.
		this.close();
		this.logoutClick.emit();
	}
}
// #endregion
