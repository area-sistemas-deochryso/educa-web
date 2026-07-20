// #region Imports
import { ChangeDetectionStrategy, Component, HostListener, inject, OnInit, OnDestroy, AfterViewInit, DestroyRef, signal, effect, computed, viewChild, viewChildren, ElementRef, afterRenderEffect } from '@angular/core';
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
import { findMenuItemDefByUrl, resolveMenuItemLabel } from '@intranet-shared/config/intranet-menu.config';
import { ModuloId, MODULOS } from '@shared/constants';
import { FeatureFlagsFacade } from '@core/services/feature-flags';
import { QuickAccessFavoritesService } from '@intranet-shared/services';
import { AccessDeniedModalComponent } from '@intranet-shared/components/access-denied-modal';
import { WalMigrationBannerComponent } from '@intranet-shared/components/wal-migration-banner';
import { WalDegradedBannerComponent } from '@intranet-shared/components/wal-degraded-banner';
import { ConnectionStatusIndicatorComponent } from '@intranet-shared/components/connection-status-indicator/connection-status-indicator.component';

// #endregion

// #region Helpers
/** Nivel de un tramo del breadcrumb — determina qué acción dispara el click. */
export interface BreadcrumbPart {
	label: string;
	kind: 'modulo' | 'grupo' | 'pagina';
}

/** Ancho aproximado (px) del pill "Más" reservado durante el cálculo de overflow. */
const MORE_PILL_RESERVE = 90;
const NAV_GAP = 4;
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
export class IntranetLayoutComponent implements OnInit, AfterViewInit, OnDestroy {
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
		// Sin grupo, "página" puede repetir el label del módulo (ej. Inicio > Inicio) — no aporta información.
		if (item && !(!item.group && item.label === modulo.label)) {
			parts.push({ label: resolveMenuItemLabel(item, this.authService.currentUser?.rol), kind: 'pagina' });
		}
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
		// * El mini-dropdown del breadcrumb solo sabe renderizar links con route directo —
		// aplana un eventual segundo nivel (subgroup, ej. tabs de una misma página) a hojas.
		return this.flattenToLeaves(groupNode?.children ?? []);
	});

	private flattenToLeaves(items: NavMenuItem[]): NavMenuItem[] {
		return items.flatMap((n) => (n.children && n.children.length > 0 ? this.flattenToLeaves(n.children) : [n]));
	}

	// Todas las items (grupos) del módulo seleccionado, sin recortar.
	private readonly _allItems = computed((): NavMenuItem[] => {
		const id = this._selectedModuloId();
		if (id === 'inicio') return [];
		return this._modulos().find((m) => m.id === id)?.items ?? [];
	});

	// #region Overflow del menú de navegación (reemplaza la antigua ventana circular)
	// * Grupo activo según la URL actual — se pinea siempre visible aunque no entre por ancho.
	private readonly _activeGroupIndex = computed(() => {
		const url = this._currentUrl();
		return this._allItems().findIndex((item) => this.matchesUrl(item, url));
	});

	/** Recorre `item` y sus hijos (a cualquier profundidad) buscando una route que matchee la URL actual. */
	private matchesUrl(item: NavMenuItem, url: string): boolean {
		if (item.route && url.startsWith(item.route)) return true;
		return item.children?.some((c) => this.matchesUrl(c, url)) ?? false;
	}

	// * Cantidad de grupos que entran en el ancho disponible, medida contra la fila oculta de medición.
	private readonly _visibleCount = signal(2);

	private readonly navLinksEl = viewChild<ElementRef<HTMLElement>>('navLinks');
	// Template ref sobre un <div> nativo: el read por defecto ya es ElementRef.
	private readonly measureItems = viewChildren<ElementRef<HTMLElement>>('measureItem');
	private resizeObserver?: ResizeObserver;

	readonly visibleNavItems = computed((): NavMenuItem[] => {
		const items = this._allItems();
		const count = Math.min(this._visibleCount(), items.length);
		const activeIdx = this._activeGroupIndex();
		if (count > 0 && activeIdx >= count) {
			// El grupo activo quedó fuera de la ventana visible: lo pineamos reemplazando el último slot.
			return [...items.slice(0, count - 1), items[activeIdx]];
		}
		return items.slice(0, count);
	});

	readonly overflowNavItems = computed((): NavMenuItem[] => {
		const visible = new Set(this.visibleNavItems());
		return this._allItems().filter((item) => !visible.has(item));
	});

	// * Alias público: la fila de medición del template necesita leerlo (strictTemplates).
	readonly allNavItems = this._allItems;
	// #endregion
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

		// Recalcula qué grupos entran en el ancho disponible cada vez que cambia
		// el módulo activo (la fila de medición oculta se re-renderiza con sus items).
		afterRenderEffect(() => {
			this._allItems();
			this.recomputeVisibleCount();
		});
	}

	ngAfterViewInit(): void {
		const nav = this.navLinksEl()?.nativeElement;
		if (!nav) return;
		this.resizeObserver = new ResizeObserver(() => this.recomputeVisibleCount());
		this.resizeObserver.observe(nav);
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
		this.resizeObserver?.disconnect();
	}

	// #region Acciones
	selectModulo(id: ModuloId): void {
		this._selectedModuloId.set(id);
		if (id === 'inicio') {
			this.router.navigate(['/intranet']);
		}
	}

	onStarClick(event: Event, route: string): void {
		event.preventDefault();
		event.stopPropagation();
		this.favoritesService.toggleFavorite(route);
	}

	/** Click en un tramo navegable del breadcrumb (todo salvo el último, "página actual"). */
	onBreadcrumbClick(event: MouseEvent, part: BreadcrumbPart): void {
		if (part.kind === 'modulo') {
			// Evita que el click siga burbujeando a document: el listener de click-outside
			// del module-selector lo cerraría en el mismo tick en que open() lo abre.
			event.stopPropagation();
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
	}

	/**
	 * Mide el ancho natural de cada grupo contra la fila oculta de medición y calcula
	 * cuántos entran en el ancho real disponible de `.nav-links`, reservando espacio
	 * para el pill "Más" cuando sobra al menos un grupo.
	 */
	private recomputeVisibleCount(): void {
		const nav = this.navLinksEl()?.nativeElement;
		const items = this.measureItems();
		if (!nav || items.length === 0) return;

		const available = nav.clientWidth;
		const totalItems = items.length;
		let used = 0;
		let count = 0;

		for (let i = 0; i < totalItems; i++) {
			const width = items[i].nativeElement.offsetWidth;
			const isLast = i === totalItems - 1;
			const reserve = isLast ? 0 : MORE_PILL_RESERVE + NAV_GAP;
			const gap = count > 0 ? NAV_GAP : 0;
			if (used + gap + width + reserve > available) break;
			used += gap + width;
			count++;
		}

		this._visibleCount.set(count);
	}
	// #endregion
}
// #endregion
