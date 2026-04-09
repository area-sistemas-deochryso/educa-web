// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	inject,
	input,
	output,
	signal,
	computed,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { QuickAccessFavoritesService } from '@intranet-shared/services';
import { ModuloId } from '@shared/constants/module-registry';
import { UserProfileMenuComponent } from '../user-profile-menu';

// #endregion

// #region Types
export interface NavMenuItem {
	route?: string;
	label: string;
	icon: string;
	exact?: boolean;
	queryParams?: Record<string, string>;
	children?: NavMenuItem[];
}

export interface ModuloMenu {
	id: ModuloId;
	label: string;
	icon: string;
	items: NavMenuItem[];
}

const VISIBLE_PILLS = 5;
const VISIBLE_NAV = 3;
const LONG_PRESS_MS = 400;

function circularSlice<T>(items: T[], center: number, count: number): T[] {
	const len = items.length;
	if (len <= count) return [...items];
	const half = Math.floor(count / 2);
	const result: T[] = [];
	for (let i = -half; i <= half; i++) {
		result.push(items[((center + i) % len + len) % len]);
	}
	return result;
}
// #endregion

// #region Implementation
@Component({
	selector: 'app-mobile-menu',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [RouterLink, RouterLinkActive, UserProfileMenuComponent],
	templateUrl: './mobile-menu.component.html',
	styleUrl: './mobile-menu.component.scss',
})
export class MobileMenuComponent {
	readonly favoritesService = inject(QuickAccessFavoritesService);
	private router = inject(Router);

	readonly modulos = input.required<ModuloMenu[]>();
	logoutClick = output<void>();

	isOpen = signal(false);

	// #region Pills carousel
	private readonly _selectedModuloId = signal<ModuloId>('inicio');
	readonly selectedModuloId = this._selectedModuloId.asReadonly();

	private readonly _pillCenter = signal(0);
	readonly visiblePills = computed(() =>
		circularSlice(this.modulos(), this._pillCenter(), VISIBLE_PILLS),
	);
	// #endregion

	// #region Nav items carousel
	private readonly _allItems = computed((): NavMenuItem[] => {
		const id = this._selectedModuloId();
		if (id === 'inicio') return [];
		return this.modulos().find((m) => m.id === id)?.items ?? [];
	});

	private readonly _navCenter = signal(0);
	readonly visibleNavItems = computed(() =>
		circularSlice(this._allItems(), this._navCenter(), VISIBLE_NAV),
	);
	// #endregion

	// #region Long-press preview
	private readonly _previewModuloId = signal<ModuloId | null>(null);
	readonly previewModuloId = this._previewModuloId.asReadonly();
	private longPressTimer: ReturnType<typeof setTimeout> | null = null;
	// #endregion

	private destroyRef = inject(DestroyRef);

	constructor() {
		this.destroyRef.onDestroy(() => this.unlockBodyScroll());
	}

	toggle(): void {
		this.isOpen.update((v) => !v);
		if (this.isOpen()) {
			this.lockBodyScroll();
		} else {
			this.unlockBodyScroll();
		}
	}

	close(): void {
		this.isOpen.set(false);
		this.unlockBodyScroll();
	}

	selectModulo(id: ModuloId): void {
		// Si el preview está abierto, solo cerrarlo (el tap-up no debe navegar).
		if (this._previewModuloId() !== null) {
			return;
		}
		this._selectedModuloId.set(id);
		this._pillCenter.set(this.modulos().findIndex((m) => m.id === id));
		this._navCenter.set(0);
		if (id === 'inicio') {
			this.router.navigate(['/intranet']);
			this.close();
		}
	}

	onNavItemClick(item: NavMenuItem): void {
		const idx = this._allItems().findIndex((i) => i.route === item.route);
		if (idx >= 0) this._navCenter.set(idx);
	}

	// #region Long-press handlers
	onPillPressStart(id: ModuloId): void {
		this.cancelLongPress();
		this.longPressTimer = setTimeout(() => {
			this._previewModuloId.set(id);
		}, LONG_PRESS_MS);
	}

	onPillPressEnd(): void {
		this.cancelLongPress();
		// Cerrar preview con pequeño delay para que el click no dispare selectModulo.
		if (this._previewModuloId() !== null) {
			setTimeout(() => this._previewModuloId.set(null));
		}
	}

	private cancelLongPress(): void {
		if (this.longPressTimer) {
			clearTimeout(this.longPressTimer);
			this.longPressTimer = null;
		}
	}
	// #endregion

	onStarClick(event: Event, route: string): void {
		event.preventDefault();
		event.stopPropagation();
		this.favoritesService.toggleFavorite(route);
	}

	onLogout(): void {
		this.close();
		this.logoutClick.emit();
	}

	private lockBodyScroll(): void {
		document.body.style.overflow = 'hidden';
	}

	private unlockBodyScroll(): void {
		document.body.style.overflow = '';
	}
}
// #endregion
