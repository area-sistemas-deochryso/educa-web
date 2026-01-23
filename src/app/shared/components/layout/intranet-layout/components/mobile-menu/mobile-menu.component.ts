import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavMenuItem {
	route: string;
	label: string;
	icon: string;
	exact?: boolean;
}

@Component({
	selector: 'app-mobile-menu',
	standalone: true,
	imports: [RouterLink, RouterLinkActive],
	templateUrl: './mobile-menu.component.html',
	styleUrl: './mobile-menu.component.scss',
})
export class MobileMenuComponent {
	@Input({ required: true }) items: NavMenuItem[] = [];
	@Output() logoutClick = new EventEmitter<void>();

	isOpen = signal(false);

	toggle(): void {
		this.isOpen.update((v) => !v);
	}

	close(): void {
		this.isOpen.set(false);
	}

	onLogout(): void {
		this.close();
		this.logoutClick.emit();
	}
}
