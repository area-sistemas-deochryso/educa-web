// #region Imports
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Component, signal } from '@angular/core';
import { environment } from '@config/environment';

// #endregion
// #region Implementation
@Component({
	selector: 'app-header',
	standalone: true,
	imports: [RouterLink, RouterLinkActive],
	templateUrl: './header.html',
	styleUrl: './header.scss',
})
export class HeaderComponent {
	// * Feature flag for intranet shortcut.
	showIntranetLink = environment.showIntranetLink;

	// * Mobile menu open state.
	isMenuOpen = signal(false);
	// * Dropdown for education levels.
	isDropdownOpen = signal(false);

	toggleMenu() {
		// * Toggle menu and collapse dropdown if closing.
		this.isMenuOpen.update((v) => !v);
		// Cerrar dropdown cuando se cierra el menÃƒÂº
		if (!this.isMenuOpen()) {
			this.isDropdownOpen.set(false);
		}
	}

	toggleDropdown(event: Event) {
		// * Prevent navigation and open/close the dropdown.
		event.preventDefault();
		event.stopPropagation();
		this.isDropdownOpen.update((v) => !v);
	}

	closeMenu() {
		// * Close both menu and dropdown.
		this.isMenuOpen.set(false);
		this.isDropdownOpen.set(false);
	}
}
// #endregion
