// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	ElementRef,
	HostListener,
	inject,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';

import { ModuloMenu } from '../../intranet-menu.config';
import { ModuloId } from '@shared/constants';
import { QuickAccessLayoutService } from '@intranet-shared/services';
import { buildAllResults, buildMegaColumns, scoreResult, SearchResult, TreeGroup } from './module-selector.helpers';
import { EduTooltip } from '@edu-ui';

export type { SearchResult, TreeGroup, TreeSection, TreeSubsection } from './module-selector.helpers';
// #endregion

// #region Implementation
@Component({
	selector: 'app-module-selector',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [FormsModule, EduTooltip],
	templateUrl: './module-selector.component.html',
	styleUrl: './module-selector.component.scss',
})
export class ModuleSelectorComponent {
	private elementRef = inject(ElementRef);
	private router = inject(Router);
	readonly favorites = inject(QuickAccessLayoutService);

	// #region Inputs / Outputs
	readonly modulos = input.required<ModuloMenu[]>();
	readonly selectedModuloId = input.required<ModuloId>();
	readonly moduloSelected = output<ModuloId>();
	// #endregion

	// #region Estado local
	readonly isOpen = signal(false);
	readonly searchTerm = signal('');
	readonly activeIndex = signal(0);
	readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
	/** Módulos expandidos en el acordeón. Por default solo el módulo activo. */
	private readonly _expandedModulos = signal<ReadonlySet<ModuloId>>(new Set());
	readonly expandedModulos = this._expandedModulos.asReadonly();

	/**
	 * Subgrupos expandidos (ej. "Correos" dentro de Monitoreo), keyed por
	 * `${moduloId}::${section}::${subgroup}`. Colapsados por default -- se listan muchos
	 * subgrupos (Monitoreo tiene 3) y no hace falta verlos todos abiertos de entrada.
	 */
	private readonly _expandedSubgroups = signal<ReadonlySet<string>>(new Set());

	/** Reactive current URL — used to highlight the page the user is on. */
	private readonly currentUrl = toSignal(
		this.router.events.pipe(
			filter((e): e is NavigationEnd => e instanceof NavigationEnd),
			map((e) => e.urlAfterRedirects),
			startWith(this.router.url),
		),
		{ initialValue: this.router.url },
	);
	// #endregion

	// #region Computed
	private readonly allResults = computed((): SearchResult[] => buildAllResults(this.modulos()));

	/** Flat view: alphabetical or ranked by search score. */
	readonly filteredResults = computed((): SearchResult[] => {
		const term = this.searchTerm().toLowerCase().trim();
		if (!term) {
			return [...this.allResults()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
		}

		const words = term.split(/\s+/);
		return this.allResults()
			.map((r) => ({ result: r, score: scoreResult(r, words) }))
			.filter((r) => r.score > 0)
			.sort((a, b) => b.score - a.score)
			.map((r) => r.result);
	});

	/** Flat list of all panel items in visual order (for keyboard nav). Solo módulos/subgrupos expandidos. */
	private readonly panelFlat = computed((): SearchResult[] => {
		const flat: SearchResult[] = [...this.favoriteResults()];
		const expandedModulos = this._expandedModulos();
		const expandedSubgroups = this._expandedSubgroups();
		for (const col of this.megaColumns()) {
			if (!expandedModulos.has(col.moduloId)) continue;
			for (const section of col.sections) {
				flat.push(...section.items);
				for (const sub of section.subsections) {
					if (expandedSubgroups.has(this.subgroupKey(col.moduloId, section.label, sub.label))) {
						flat.push(...sub.items);
					}
				}
			}
		}
		return flat;
	});

	/** The active list depends on whether the user is searching. */
	readonly activeList = computed((): SearchResult[] =>
		this.isSearching() ? this.filteredResults() : this.panelFlat(),
	);

	readonly selectedModulo = computed(() => {
		const id = this.selectedModuloId();
		return this.modulos().find((m) => m.id === id);
	});

	/** Favorite items with full metadata for the top row. */
	readonly favoriteResults = computed((): SearchResult[] => {
		const routes = this.favorites.favoriteRoutes();
		const all = this.allResults();
		return routes.map((r) => all.find((a) => a.route === r)).filter((r): r is SearchResult => !!r);
	});

	/** Whether the user is actively searching (shows flat results instead of mega menu). */
	readonly isSearching = computed(() => this.searchTerm().trim().length > 0);

	/** Mega menu columns: todos los módulos, incluyendo 'inicio' (que tiene la página /intranet). */
	readonly megaColumns = computed((): TreeGroup[] => buildMegaColumns(this.allResults(), this.modulos()));
	// #endregion

	// #region Click outside
	@HostListener('document:click', ['$event'])
	onDocumentClick(event: MouseEvent): void {
		if (!this.elementRef.nativeElement.contains(event.target)) {
			this.close();
		}
	}
	// #endregion

	// #region Acciones
	open(): void {
		this.isOpen.set(true);
		this.searchTerm.set('');
		this.activeIndex.set(0);
		// Por default, expandir solo el módulo activo (acordeón estilo C).
		this._expandedModulos.set(new Set([this.selectedModuloId()]));
		// Auto-expandir solo el/los subgrupo(s) que contienen la página actual -- el resto
		// arranca colapsado, para no listar los ~10 items de Monitoreo de entrada.
		const currentSubgroups = new Set<string>();
		for (const col of this.megaColumns()) {
			for (const section of col.sections) {
				for (const sub of section.subsections) {
					if (sub.items.some((item) => this.isCurrentRoute(item))) {
						currentSubgroups.add(this.subgroupKey(col.moduloId, section.label, sub.label));
					}
				}
			}
		}
		this._expandedSubgroups.set(currentSubgroups);
		setTimeout(() => this.searchInput()?.nativeElement.focus(), 0);
	}

	close(): void {
		this.isOpen.set(false);
		this.searchTerm.set('');
		this.activeIndex.set(0);
	}

	toggleModulo(id: ModuloId): void {
		this._expandedModulos.update((set) => {
			const next = new Set(set);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
		this.activeIndex.set(0);
	}

	isModuloExpanded(id: ModuloId): boolean {
		return this._expandedModulos().has(id);
	}

	subgroupKey(moduloId: ModuloId, sectionLabel: string, subLabel: string): string {
		return `${moduloId}::${sectionLabel}::${subLabel}`;
	}

	toggleSubgroup(key: string): void {
		this._expandedSubgroups.update((set) => {
			const next = new Set(set);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	}

	isSubgroupExpanded(key: string): boolean {
		return this._expandedSubgroups().has(key);
	}

	toggle(): void {
		if (this.isOpen()) {
			this.close();
		} else {
			this.open();
		}
	}

	onSearchChange(value: string): void {
		this.searchTerm.set(value);
		this.activeIndex.set(0);
	}

	selectResult(result: SearchResult): void {
		this.moduloSelected.emit(result.moduloId);
		this.router.navigate([result.route], { queryParams: result.queryParams });
		this.close();
	}

	onStarClick(event: Event, route: string): void {
		event.preventDefault();
		event.stopPropagation();
		this.favorites.toggleFavorite(route);
	}

	/** Check if a result is the active one (used in tree view). */
	isActiveResult(result: SearchResult): boolean {
		return this.activeList()[this.activeIndex()] === result;
	}

	/**
	 * Check if a result corresponds to the page the user is currently on.
	 * Matches by exact path or as a prefix of the current URL (e.g.
	 * `/intranet/admin/monitoreo` highlights when on `/.../monitoreo/correos/bandeja`).
	 * Items que comparten route pero difieren en `queryParams` (ej. Gestión/Reportes/Panel de
	 * asistencias, todas en `/intranet/admin/asistencias?tab=...`) solo matchean si además el
	 * `tab` (u otro queryParam declarado) coincide con el de la URL actual -- sin esto, las 3
	 * quedaban resaltadas a la vez porque el path por sí solo no las distingue.
	 */
	isCurrentRoute(result: SearchResult): boolean {
		const [path, queryString] = this.currentUrl().split('?');
		const r = result.route;
		const pathMatches = path === r || path.startsWith(r + '/');
		if (!pathMatches) return false;
		if (!result.queryParams) return true;

		const currentParams = new URLSearchParams(queryString ?? '');
		return Object.entries(result.queryParams).every(([key, value]) => currentParams.get(key) === value);
	}

	/** Set active index from a result (used in tree view mouseenter). */
	setActiveFromResult(result: SearchResult): void {
		const idx = this.activeList().indexOf(result);
		if (idx >= 0) this.activeIndex.set(idx);
	}

	onKeydown(event: KeyboardEvent): void {
		const list = this.activeList();
		const max = list.length;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				this.activeIndex.update((i) => (max > 0 ? (i + 1) % max : 0));
				this.scrollActiveIntoView();
				break;

			case 'ArrowUp':
				event.preventDefault();
				this.activeIndex.update((i) => (max > 0 ? (i - 1 + max) % max : 0));
				this.scrollActiveIntoView();
				break;

			case 'Enter':
			case 'Tab':
				event.preventDefault();
				if (max > 0) {
					this.selectResult(list[this.activeIndex()]);
				}
				break;

			case 'Escape':
				this.close();
				break;
		}
	}

	private scrollActiveIntoView(): void {
		setTimeout(() => {
			const el = this.elementRef.nativeElement.querySelector('.panel-item.active');
			el?.scrollIntoView({ block: 'nearest' });
		}, 0);
	}
	// #endregion
}
// #endregion
