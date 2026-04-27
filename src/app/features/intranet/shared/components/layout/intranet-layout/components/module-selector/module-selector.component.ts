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
import { ModuloId } from '@shared/constants/module-registry';
import { QuickAccessFavoritesService } from '@intranet-shared/services';
// #endregion

// #region Types
/** Flat search result — a single navigable page. */
export interface SearchResult {
	label: string;
	route: string;
	icon: string;
	moduloId: ModuloId;
	moduloLabel: string;
	groupLabel: string;
	queryParams?: Record<string, string>;
	keywords: string;
}

/** Tree group — module or section header with its items. */
export interface TreeGroup {
	moduloLabel: string;
	moduloIcon: string;
	sections: TreeSection[];
}

export interface TreeSection {
	label: string;
	items: SearchResult[];
}
// #endregion

// #region Implementation
@Component({
	selector: 'app-module-selector',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [FormsModule],
	templateUrl: './module-selector.component.html',
	styleUrl: './module-selector.component.scss',
})
export class ModuleSelectorComponent {
	private elementRef = inject(ElementRef);
	private router = inject(Router);
	readonly favorites = inject(QuickAccessFavoritesService);

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

	// #region Computed — Flat index of all navigable pages
	private readonly allResults = computed((): SearchResult[] => {
		const results: SearchResult[] = [];

		for (const modulo of this.modulos()) {
			for (const item of modulo.items) {
				if (item.route) {
					results.push(this.toResult(item, modulo, ''));
				}
				if (item.children) {
					for (const child of item.children) {
						if (child.route) {
							results.push(this.toResult(child, modulo, item.label));
						}
					}
				}
			}
		}

		return results;
	});

	/** Flat view: alphabetical or ranked by search score. */
	readonly filteredResults = computed((): SearchResult[] => {
		const term = this.searchTerm().toLowerCase().trim();
		if (!term) {
			return [...this.allResults()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
		}

		const words = term.split(/\s+/);
		return this.allResults()
			.map((r) => ({ result: r, score: this.score(r, words) }))
			.filter((r) => r.score > 0)
			.sort((a, b) => b.score - a.score)
			.map((r) => r.result);
	});

	/** Flat list of all panel items in visual order (for keyboard nav). */
	private readonly panelFlat = computed((): SearchResult[] => {
		const flat: SearchResult[] = [...this.favoriteResults()];
		for (const col of this.megaColumns()) {
			for (const section of col.sections) {
				flat.push(...section.items);
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

	/** Mega menu columns: modules excluding 'inicio' (it has no pages). */
	readonly megaColumns = computed((): TreeGroup[] => {
		const all = this.allResults();
		const moduloMap = new Map<ModuloId, { label: string; icon: string; sections: Map<string, SearchResult[]> }>();

		for (const r of all) {
			if (r.moduloId === 'inicio') continue;
			let modEntry = moduloMap.get(r.moduloId);
			if (!modEntry) {
				const mod = this.modulos().find((m) => m.id === r.moduloId);
				modEntry = { label: r.moduloLabel, icon: mod?.icon ?? 'pi pi-folder', sections: new Map() };
				moduloMap.set(r.moduloId, modEntry);
			}
			const sectionKey = r.groupLabel || '(General)';
			const sectionItems = modEntry.sections.get(sectionKey) ?? [];
			sectionItems.push(r);
			modEntry.sections.set(sectionKey, sectionItems);
		}

		return Array.from(moduloMap.values()).map((entry) => ({
			moduloLabel: entry.label,
			moduloIcon: entry.icon,
			sections: Array.from(entry.sections.entries()).map(([label, items]) => ({ label, items })),
		}));
	});
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
		setTimeout(() => this.searchInput()?.nativeElement.focus(), 0);
	}

	close(): void {
		this.isOpen.set(false);
		this.searchTerm.set('');
		this.activeIndex.set(0);
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
	 */
	isCurrentRoute(result: SearchResult): boolean {
		const url = this.currentUrl().split('?')[0];
		const r = result.route;
		return url === r || url.startsWith(r + '/');
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
	// #endregion

	// #region Helpers privados
	private toResult(
		item: { route?: string; label: string; icon: string; queryParams?: Record<string, string> },
		modulo: ModuloMenu,
		groupLabel: string,
	): SearchResult {
		const route = item.route!;
		// Include route as-is (for "intranet/admin") AND with separators as spaces (for "admin horarios").
		const routeExpanded = route.replace(/\//g, ' ').replace(/-/g, ' ');
		const keywords = [item.label, modulo.label, groupLabel, route, routeExpanded].join(' ').toLowerCase();

		return {
			label: item.label,
			route,
			icon: item.icon,
			moduloId: modulo.id,
			moduloLabel: modulo.label,
			groupLabel,
			queryParams: item.queryParams,
			keywords,
		};
	}

	private score(result: SearchResult, words: string[]): number {
		let total = 0;
		for (const word of words) {
			const labelMatch = result.label.toLowerCase().includes(word);
			const keywordsMatch = result.keywords.includes(word);

			if (!labelMatch && !keywordsMatch) return 0;
			total += labelMatch ? 2 : 1;
		}
		return total;
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
