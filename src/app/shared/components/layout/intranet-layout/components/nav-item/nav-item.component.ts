// #region Imports
import {
	Component,
	Input,
	booleanAttribute,
	signal,
	HostListener,
	ElementRef,
	inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

import { logger } from '@core/helpers';
import { NavMenuItem } from '../mobile-menu';

// #endregion
// #region Implementation
@Component({
	selector: 'app-nav-item',
	standalone: true,
	imports: [RouterLink, RouterLinkActive],
	templateUrl: './nav-item.component.html',
	styleUrl: './nav-item.component.scss',
})
export class NavItemComponent {
	// * DOM access for click-outside and debug helpers.
	private elementRef = inject(ElementRef);
	private router = inject(Router);

	// * Menu item inputs (route or child menu).
	@Input() route?: string;
	@Input({ required: true }) label!: string;
	@Input({ required: true }) icon!: string;
	@Input({ transform: booleanAttribute }) exact = false;
	@Input() children?: NavMenuItem[];

	isOpen = signal(false);

	constructor() {
		// * Close dropdown on navigation change.
		this.router.events
			.pipe(filter((event) => event instanceof NavigationEnd))
			.subscribe(() => this.isOpen.set(false));
	}

	@HostListener('document:click', ['$event'])
	onDocumentClick(event: MouseEvent): void {
		// * Close menu when clicking outside.
		if (!this.elementRef.nativeElement.contains(event.target)) {
			this.isOpen.set(false);
		}
	}

	toggle(): void {
		// * Toggle dropdown and optionally log style diagnostics.
		this.isOpen.update((v) => !v);

		// Debug: Log dropdown styles after DOM update
		if (this.isOpen()) {
			setTimeout(() => this.debugDropdownStyles(), 0);
		}
	}

	private debugDropdownStyles(): void {
		const dropdown = this.elementRef.nativeElement.querySelector('.dropdown-menu');
		if (!dropdown) {
			logger.debug(`[${this.label}] dropdown-menu NOT FOUND in DOM`);
			return;
		}

		const styles = window.getComputedStyle(dropdown);
		const rect = dropdown.getBoundingClientRect();

		logger.debug(`[${this.label}] dropdown-menu DEBUG:`);
		logger.debug('  children:', this.children);
		logger.debug('  Element:', dropdown);
		logger.debug('  BoundingClientRect:', {
			top: rect.top,
			left: rect.left,
			width: rect.width,
			height: rect.height,
			bottom: rect.bottom,
			right: rect.right,
		});
		logger.debug('  Computed Styles:', {
			display: styles.display,
			visibility: styles.visibility,
			opacity: styles.opacity,
			position: styles.position,
			top: styles.top,
			left: styles.left,
			width: styles.width,
			height: styles.height,
			minWidth: styles.minWidth,
			minHeight: styles.minHeight,
			maxWidth: styles.maxWidth,
			maxHeight: styles.maxHeight,
			backgroundColor: styles.backgroundColor,
			zIndex: styles.zIndex,
			overflow: styles.overflow,
			transform: styles.transform,
			clip: styles.clip,
			clipPath: styles.clipPath,
		});

		// Check parent overflow
		let parent = dropdown.parentElement;
		let level = 0;
		while (parent && level < 5) {
			const parentStyles = window.getComputedStyle(parent);
			if (parentStyles.overflow !== 'visible') {
				logger.debug(
					`  Parent [${level}] ${parent.tagName}.${parent.className} has overflow: ${parentStyles.overflow}`,
				);
			}
			parent = parent.parentElement;
			level++;
		}
	}

	hasChildren(): boolean {
		return !!(this.children && this.children.length > 0);
	}

	isActive(): boolean {
		if (!this.children) return false;
		return this.isChildActive(this.children);
	}

	private isChildActive(items: NavMenuItem[]): boolean {
		const currentUrl = this.router.url;
		for (const item of items) {
			if (item.route && currentUrl.startsWith(item.route)) {
				return true;
			}
			if (item.children && this.isChildActive(item.children)) {
				return true;
			}
		}
		return false;
	}
}
// #endregion
