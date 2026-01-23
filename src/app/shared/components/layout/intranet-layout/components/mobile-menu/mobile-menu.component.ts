import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
	imports: [RouterLink, RouterLinkActive],
	templateUrl: './mobile-menu.component.html',
	styleUrl: './mobile-menu.component.scss',
})
export class MobileMenuComponent {
	@Input({ required: true }) items: NavMenuItem[] = [];
	@Output() logoutClick = new EventEmitter<void>();

	isOpen = signal(false);
	expandedItems = signal<Set<string>>(new Set());

	toggle(): void {
		this.isOpen.update((v) => !v);
	}

	close(): void {
		this.isOpen.set(false);
		this.expandedItems.set(new Set());
	}

	toggleSubmenu(label: string): void {
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
		this.close();
		this.logoutClick.emit();
	}
}
