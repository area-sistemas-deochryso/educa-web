import { RouterLink, RouterLinkActive } from '@angular/router';
import { Component, signal } from '@angular/core';
import { environment } from '@config/environment';

@Component({
	selector: 'app-header',
	standalone: true,
	imports: [RouterLink, RouterLinkActive],
	templateUrl: './header.html',
	styleUrl: './header.scss',
})
export class HeaderComponent {
	showIntranetLink = environment.showIntranetLink;

	// Estado del menú móvil
	isMenuOpen = signal(false);
	// Estado del dropdown de niveles
	isDropdownOpen = signal(false);

	toggleMenu() {
		this.isMenuOpen.update((v) => !v);
		// Cerrar dropdown cuando se cierra el menú
		if (!this.isMenuOpen()) {
			this.isDropdownOpen.set(false);
		}
	}

	toggleDropdown(event: Event) {
		event.preventDefault();
		event.stopPropagation();
		this.isDropdownOpen.update((v) => !v);
	}

	closeMenu() {
		this.isMenuOpen.set(false);
		this.isDropdownOpen.set(false);
	}
}
