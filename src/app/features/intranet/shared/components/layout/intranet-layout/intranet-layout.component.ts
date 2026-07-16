// #region Imports
import { ChangeDetectionStrategy, Component, HostListener, inject, OnInit, OnDestroy, DestroyRef, signal, effect, computed, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { VoiceButtonComponent } from '@intranet-shared/components/voice-button';
import { FloatingNotificationBellComponent } from '@intranet-shared/components/floating-notification-bell';
import { SyncStatusComponent } from '@intranet-shared/components/sync-status';
import { OfflineIndicatorComponent } from '@intranet-shared/components/offline-indicator/offline-indicator.component';
import { FeedbackReportDialogComponent } from '@intranet-shared/components/feedback-report-dialog';
import { FeedbackReportLauncherComponent } from '@intranet-shared/components/feedback-report-launcher';
import { UserPermissionsService, SessionActivityService, KeyboardShortcutsService, FeedbackReportFacade } from '@core/services';
import { AuthService } from '@core/services/auth';
import {
	NavItemComponent,
	UserProfileMenuComponent,
	MobileMenuComponent,
	ModuleSelectorComponent,
	NavMenuItem,
} from './components';
import { ModuloMenu, buildModuloMenus, detectModuloFromUrl } from './intranet-menu.config';
import { findMenuItemDefByUrl } from '@intranet-shared/config/intranet-menu.config';
import { ModuloId, MODULOS } from '@shared/constants';
import { FeatureFlagsFacade } from '@core/services/feature-flags';
import { QuickAccessFavoritesService } from '@intranet-shared/services';
import { AccessDeniedModalComponent } from '@intranet-shared/components/access-denied-modal';
import { WalMigrationBannerComponent } from '@intranet-shared/components/wal-migration-banner';
import { WalDegradedBannerComponent } from '@intranet-shared/components/wal-degraded-banner';
import { ConnectionStatusIndicatorComponent } from '@intranet-shared/components/connection-status-indicator/connection-status-indicator.component';

// #endregion

// #region Helpers
const VISIBLE_NAV = 2;

/** Nivel de un tramo del breadcrumb — determina qué acción dispara el click. */
export interface BreadcrumbPart {
	label: string;
	kind: 'modulo' | 'grupo' | 'pagina';
}

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
		VoiceButtonComponent,
		FloatingNotificationBellComponent,
		SyncStatusComponent,
		OfflineIndicatorComponent,
		FeedbackReportDialogComponent,
		FeedbackReportLauncherComponent,
		NavItemComponent,
		UserProfileMenuComponent,
		MobileMenuComponent,
		ModuleSelectorComponent,
		AccessDeniedModalComponent,
		WalMigrationBannerComponent,
		WalDegradedBannerComponent,
		ConnectionStatusIndicatorComponent,
	],
	templateUrl: './intranet-layout.component.html',
	styleUrl: './intranet-layout.component.scss',
})
export class IntranetLayoutComponent implements OnInit, OnDestroy {
	private userPermissionsService = inject(UserPermissionsService);
	private authService = inject(AuthService);
	private destroyRef = inject(DestroyRef);
	private flags = inject(FeatureFlagsFacade);
	private sessionActivity = inject(SessionActivityService);
	private router = inject(Router);
	private keyboardService = inject(KeyboardShortcutsService);
	private feedbackFacade = inject(FeedbackReportFacade);
	readonly favoritesService = inject(QuickAccessFavoritesService);
	private readonly moduleSelector = viewChild(ModuleSelectorComponent);
	private readonly mobileMenu = viewChild(MobileMenuComponent);

	// Cowork F-002: ocultar el FAB Reportar mientras el drawer móvil está abierto.
	readonly mobileMenuOpen = computed(() => this.mobileMenu()?.isOpen() ?? false);

	// #region Estado del menú
	private readonly _modulos = signal<ModuloMenu[]>([]);
	readonly modulos = this._modulos.asReadonly();

	private readonly _selectedModuloId = signal<ModuloId>('inicio');
	readonly selectedModuloId = this._selectedModuloId.asReadonly();

	// Brief 428 (P84 F6): breadcrumb de "sección activa" — Módulo › Grupo › Página.
	// Único indicador consistente entre pantallas cuyo grupo de menú difiere (ej. Cursos/Horarios
	// bajo "Administración" en Académico, Usuarios bajo "Gestión" en Sistema).
	private readonly _currentUrl = signal('');
	readonly breadcrumb = computed((): BreadcrumbPart[] => {
		const modulo = MODULOS[this._selectedModuloId()];
		const item = findMenuItemDefByUrl(this._currentUrl(), this._selectedModuloId());
		const parts: BreadcrumbPart[] = [{ label: modulo.label, kind: 'modulo' }];
		if (item?.group) parts.push({ label: item.group.label, kind: 'grupo' });
		if (item) parts.push({ label: item.label, kind: 'pagina' });
		return parts;
	});

	// Páginas del grupo activo (ej. Cursos/Salones/Horarios bajo "Administración"),
	// para el mini-dropdown que se abre al clickear el tramo "grupo" del breadcrumb.
	private readonly _groupDropdownOpen = signal(false);
	readonly groupDropdownOpen = this._groupDropdownOpen.asReadonly();

	readonly activeGroupItems = computed((): NavMenuItem[] => {
		const item = findMenuItemDefByUrl(this._currentUrl(), this._selectedModuloId());
		if (!item?.group) return [];
		const groupNode = this._allItems().find((n) => n.label === item.group!.label && n.children);
		return groupNode?.children ?? [];
	});

	// Todas las items del módulo seleccionado (sin recortar).
	private readonly _allItems = computed((): NavMenuItem[] => {
		const id = this._selectedModuloId();
		if (id === 'inicio') return [];
		return this._modulos().find((m) => m.id === id)?.items ?? [];
	});

	// Ventana circular de nav items.
	private readonly _navCenter = signal(0);
	readonly visibleNavItems = computed(() =>
		circularSlice(this._allItems(), this._navCenter(), VISIBLE_NAV),
	);
	// #endregion

	// #region Feature flags
	readonly showNotifications = computed(() => this.flags.isEnabled('notifications'));
	readonly showVoiceRecognition = computed(() => this.flags.isEnabled('voiceRecognition'));
	readonly showFeedbackReport = computed(() => this.flags.isEnabled('feedbackReport'));
	// #endregion

	constructor() {
		effect(() => {
			const loaded = this.userPermissionsService.loaded();
			const caps = this.userPermissionsService.userCapabilities();
			if (loaded) {
				const modulos = buildModuloMenus(caps, this.authService.currentUser?.rol);
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
				this._groupDropdownOpen.set(false);
			});
	}

	@HostListener('document:click', ['$event'])
	onDocumentClick(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		if (!target.closest?.('.active-section-breadcrumb')) {
			this._groupDropdownOpen.set(false);
		}
	}

	ngOnInit(): void {
		this.sessionActivity.start();
		if (!this.userPermissionsService.loaded()) {
			this.userPermissionsService.loadPermisos();
		} else {
			const modulos = buildModuloMenus(
				this.userPermissionsService.userCapabilities(),
				this.authService.currentUser?.rol,
			);
			this._modulos.set(modulos);
			const id = detectModuloFromUrl(this.router.url, modulos);
			this.applySelection(id, modulos, this.router.url);
		}

		// Atajo global Ctrl+Alt+F → abre/cierra dialog de reporte de usuario.
		if (this.showFeedbackReport()) {
			this.keyboardService.register('open-feedback-report', () => this.feedbackFacade.toggle());
		}

		// Atajo global Ctrl+K → abre command palette.
		this.keyboardService.register('open-command-palette', () => this.moduleSelector()?.toggle());
	}

	ngOnDestroy(): void {
		this.keyboardService.unregister('open-feedback-report');
		this.keyboardService.unregister('open-command-palette');
	}

	// #region Acciones
	selectModulo(id: ModuloId): void {
		this._selectedModuloId.set(id);
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

	/** Click en un tramo navegable del breadcrumb (todo salvo el último, "página actual"). */
	onBreadcrumbClick(part: BreadcrumbPart): void {
		if (part.kind === 'modulo') {
			this._groupDropdownOpen.set(false);
			this.moduleSelector()?.open();
		} else if (part.kind === 'grupo') {
			this._groupDropdownOpen.update((open) => !open);
		}
	}

	closeGroupDropdown(): void {
		this._groupDropdownOpen.set(false);
	}

	logout(): void {
		this.sessionActivity.forceLogout('manual');
	}
	// #endregion

	// #region Helpers privados
	private applySelection(id: ModuloId, modulos: ModuloMenu[], url: string): void {
		this._selectedModuloId.set(id);
		this._currentUrl.set(url);

		const items = id === 'inicio' ? [] : (modulos.find((m) => m.id === id)?.items ?? []);
		const navIdx = items.findIndex((i) => i.route && url.startsWith(i.route));
		this._navCenter.set(navIdx >= 0 ? navIdx : 0);
	}
	// #endregion
}
// #endregion
