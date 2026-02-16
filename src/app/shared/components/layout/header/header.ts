// #region Imports
import { RouterLink, RouterLinkActive } from '@angular/router';
import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, throttleTime, map } from 'rxjs';
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
	// #region Dependencias
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado
	showIntranetLink = environment.showIntranetLink;
	isMenuOpen = signal(false);
	isDropdownOpen = signal(false);
	isAtTop = signal(true);
	isExpanded = signal(false);

	readonly headerState = computed(() => {
		if (this.isAtTop()) return 'normal';
		return this.isExpanded() ? 'glass' : 'collapsed';
	});
	// #endregion

	// #region Scroll listener
	constructor() {
		afterNextRender(() => {
			fromEvent(window, 'scroll')
				.pipe(
					throttleTime(100, undefined, { leading: true, trailing: true }),
					map(() => window.scrollY),
					takeUntilDestroyed(this.destroyRef),
				)
				.subscribe((scrollY) => {
					const atTop = scrollY <= 10;
					this.isAtTop.set(atTop);
					if (atTop) this.isExpanded.set(false);
				});
		});
	}
	// #endregion

	// #region Event handlers
	toggleHeaderExpand(): void {
		this.isExpanded.update((v) => !v);
	}

	toggleMenu(): void {
		this.isMenuOpen.update((v) => !v);
		if (!this.isMenuOpen()) {
			this.isDropdownOpen.set(false);
		}
	}

	toggleDropdown(event: Event): void {
		event.preventDefault();
		event.stopPropagation();
		this.isDropdownOpen.update((v) => !v);
	}

	closeMenu(): void {
		this.isMenuOpen.set(false);
		this.isDropdownOpen.set(false);
	}
	// #endregion
}
// #endregion
