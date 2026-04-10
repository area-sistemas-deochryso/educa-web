// #region Imports
import { ChangeDetectionStrategy, Component, inject, OnInit, DestroyRef, signal, effect, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { VoiceButtonComponent } from '@intranet-shared/components/voice-button';
import { FloatingNotificationBellComponent } from '@intranet-shared/components/floating-notification-bell';
import { SyncStatusComponent } from '@intranet-shared/components/sync-status';
import { OfflineIndicatorComponent } from '@intranet-shared/components/offline-indicator/offline-indicator.component';
import { UserPermissionsService, SessionActivityService } from '@core/services';
import {
	NavItemComponent,
	UserProfileMenuComponent,
	MobileMenuComponent,
	NavMenuItem,
} from './components';
import { ModuloMenu, buildModuloMenus, detectModuloFromUrl } from './intranet-menu.config';
import { ModuloId } from '@shared/constants/module-registry';
import { FeatureFlagsFacade } from '@core/services/feature-flags';
import { QuickAccessFavoritesService } from '@intranet-shared/services';
import { AccessDeniedModalComponent } from '@intranet-shared/components/access-denied-modal';

// #endregion

// #region Helpers
const VISIBLE_PILLS = 5;
const VISIBLE_NAV = 3;

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
	selector: 'app-intranet-layout',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		RouterOutlet,
		RouterLink,
		RouterLinkActive,
		VoiceButtonComponent,
		FloatingNotificationBellComponent,
		SyncStatusComponent,
		OfflineIndicatorComponent,
		NavItemComponent,
		UserProfileMenuComponent,
		MobileMenuComponent,
		AccessDeniedModalComponent,
	],
	templateUrl: './intranet-layout.component.html',
	styleUrl: './intranet-layout.component.scss',
})
export class IntranetLayoutComponent implements OnInit {
	private userPermissionsService = inject(UserPermissionsService);
	private destroyRef = inject(DestroyRef);
	private flags = inject(FeatureFlagsFacade);
	private sessionActivity = inject(SessionActivityService);
	private router = inject(Router);
	readonly favoritesService = inject(QuickAccessFavoritesService);

	// #region Estado del menú
	private readonly _modulos = signal<ModuloMenu[]>([]);
	readonly modulos = this._modulos.asReadonly();

	private readonly _selectedModuloId = signal<ModuloId>('inicio');
	readonly selectedModuloId = this._selectedModuloId.asReadonly();

	// Todas las items del módulo seleccionado (sin recortar).
	private readonly _allItems = computed((): NavMenuItem[] => {
		const id = this._selectedModuloId();
		if (id === 'inicio') return [];
		return this._modulos().find((m) => m.id === id)?.items ?? [];
	});

	// Ventana circular de 3 pills.
	private readonly _pillCenter = signal(0);
	readonly visiblePills = computed(() =>
		circularSlice(this._modulos(), this._pillCenter(), VISIBLE_PILLS),
	);

	// Ventana circular de 3 nav items.
	private readonly _navCenter = signal(0);
	readonly visibleNavItems = computed(() =>
		circularSlice(this._allItems(), this._navCenter(), VISIBLE_NAV),
	);
	// #endregion

	// #region Feature flags
	readonly showNotifications = computed(() => this.flags.isEnabled('notifications'));
	readonly showVoiceRecognition = computed(() => this.flags.isEnabled('voiceRecognition'));
	// #endregion

	constructor() {
		effect(() => {
			const loaded = this.userPermissionsService.loaded();
			const vistasPermitidas = this.userPermissionsService.vistasPermitidas();
			if (loaded) {
				const modulos = buildModuloMenus(vistasPermitidas);
				this._modulos.set(modulos);
				const id = detectModuloFromUrl(this.router.url, modulos);
				this.applySelection(id, modulos, this.router.url);
			}
		});

		this.router.events
			.pipe(
				filter((e) => e instanceof NavigationEnd),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((e) => {
				const url = (e as NavigationEnd).urlAfterRedirects;
				const modulos = this._modulos();
				if (modulos.length > 0) {
					const id = detectModuloFromUrl(url, modulos);
					this.applySelection(id, modulos, url);
				}
			});
	}

	ngOnInit(): void {
		this.sessionActivity.start();
		if (!this.userPermissionsService.loaded()) {
			this.userPermissionsService.loadPermisos(this.destroyRef);
		} else {
			const modulos = buildModuloMenus(this.userPermissionsService.vistasPermitidas());
			this._modulos.set(modulos);
			const id = detectModuloFromUrl(this.router.url, modulos);
			this.applySelection(id, modulos, this.router.url);
		}
	}

	// #region Acciones
	selectModulo(id: ModuloId): void {
		this._selectedModuloId.set(id);
		this._pillCenter.set(this._modulos().findIndex((m) => m.id === id));
		this._navCenter.set(0);
		if (id === 'inicio') {
			this.router.navigate(['/intranet']);
		}
	}

	/** Al hacer clic en un nav item visible, centrarlo en la ventana. */
	onNavItemClick(item: NavMenuItem): void {
		const idx = this._allItems().findIndex((i) => i.route === item.route);
		if (idx >= 0) this._navCenter.set(idx);
	}

	onStarClick(event: Event, route: string): void {
		event.preventDefault();
		event.stopPropagation();
		this.favoritesService.toggleFavorite(route);
	}

	logout(): void {
		this.sessionActivity.forceLogout();
	}
	// #endregion

	// #region Helpers privados
	private applySelection(id: ModuloId, modulos: ModuloMenu[], url: string): void {
		this._selectedModuloId.set(id);
		const pillIdx = modulos.findIndex((m) => m.id === id);
		if (pillIdx >= 0) this._pillCenter.set(pillIdx);

		const items = id === 'inicio' ? [] : (modulos.find((m) => m.id === id)?.items ?? []);
		const navIdx = items.findIndex((i) => i.route && url.startsWith(i.route));
		this._navCenter.set(navIdx >= 0 ? navIdx : 0);
	}
	// #endregion
}
// #endregion
