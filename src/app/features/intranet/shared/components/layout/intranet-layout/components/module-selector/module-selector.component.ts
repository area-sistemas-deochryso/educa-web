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
import { Router } from '@angular/router';

import { ModuloMenu } from '../../intranet-menu.config';
import { ModuloId } from '@shared/constants/module-registry';
import { QuickAccessFavoritesService } from '@intranet-shared/services';
// #endregion

// #region Types
export type PaletteViewMode = 'flat' | 'tree';

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
	readonly viewMode = signal<PaletteViewMode>('flat');
	readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
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

	/** Tree view: grouped by module → section. Uses same filter. */
	readonly treeGroups = computed((): TreeGroup[] => {
		const results = this.filteredResults();
		const moduloMap = new Map<ModuloId, { label: string; icon: string; sections: Map<string, SearchResult[]> }>();

		for (const r of results) {
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

	/** Flat list of results in tree order (for keyboard nav in tree mode). */
	readonly treeFlat = computed((): SearchResult[] => {
		const flat: SearchResult[] = [];
		for (const group of this.treeGroups()) {
			for (const section of group.sections) {
				flat.push(...section.items);
			}
		}
		return flat;
	});

	/** The active list depends on the current view mode. */
	readonly activeList = computed((): SearchResult[] =>
		this.viewMode() === 'flat' ? this.filteredResults() : this.treeFlat(),
	);

	readonly selectedModulo = computed(() => {
		const id = this.selectedModuloId();
		return this.modulos().find((m) => m.id === id);
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

	toggleViewMode(): void {
		this.viewMode.update((m) => (m === 'flat' ? 'tree' : 'flat'));
		this.activeIndex.set(0);
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
			const el = this.elementRef.nativeElement.querySelector('.result-item.active');
			el?.scrollIntoView({ block: 'nearest' });
		}, 0);
	}
	// #endregion
}
// #endregion
