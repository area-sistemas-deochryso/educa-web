// #region Imports
import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	inject,
	input,
	output,
	signal,
	computed,
	viewChild,
	ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

type MobileViewMode = 'flat' | 'tree';

interface MobileSearchResult {
	label: string;
	route: string;
	icon: string;
	moduloId: ModuloId;
	moduloLabel: string;
	moduloIcon: string;
	groupLabel: string;
	queryParams?: Record<string, string>;
	keywords: string;
}

interface MobileTreeGroup {
	moduloLabel: string;
	moduloIcon: string;
	sections: { label: string; items: MobileSearchResult[] }[];
}
// #endregion

// #region Implementation
@Component({
	selector: 'app-mobile-menu',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	encapsulation: ViewEncapsulation.None,
	imports: [FormsModule, RouterLink, UserProfileMenuComponent],
	templateUrl: './mobile-menu.component.html',
	styleUrl: './mobile-menu.component.scss',
})
export class MobileMenuComponent {
	private router = inject(Router);
	private destroyRef = inject(DestroyRef);

	readonly modulos = input.required<ModuloMenu[]>();
	logoutClick = output<void>();

	// #region Estado local
	readonly isOpen = signal(false);
	readonly searchTerm = signal('');
	readonly viewMode = signal<MobileViewMode>('tree');
	readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('mobileSearchInput');
	// #endregion

	// #region Computed — Flat index
	private readonly allResults = computed((): MobileSearchResult[] => {
		const results: MobileSearchResult[] = [];

		for (const modulo of this.modulos()) {
			if (modulo.id === 'inicio') continue;

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

	readonly filteredResults = computed((): MobileSearchResult[] => {
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

	readonly treeGroups = computed((): MobileTreeGroup[] => {
		const results = this.filteredResults();
		const moduloMap = new Map<ModuloId, { label: string; icon: string; sections: Map<string, MobileSearchResult[]> }>();

		for (const r of results) {
			let entry = moduloMap.get(r.moduloId);
			if (!entry) {
				entry = { label: r.moduloLabel, icon: r.moduloIcon, sections: new Map() };
				moduloMap.set(r.moduloId, entry);
			}
			const key = r.groupLabel || '(General)';
			const items = entry.sections.get(key) ?? [];
			items.push(r);
			entry.sections.set(key, items);
		}

		return Array.from(moduloMap.values()).map((e) => ({
			moduloLabel: e.label,
			moduloIcon: e.icon,
			sections: Array.from(e.sections.entries()).map(([label, items]) => ({ label, items })),
		}));
	});

	readonly resultCount = computed(() => this.filteredResults().length);
	readonly isSearching = computed(() => this.searchTerm().trim().length > 0);
	// #endregion

	constructor() {
		this.destroyRef.onDestroy(() => this.unlockBodyScroll());
	}

	// #region Acciones
	toggle(): void {
		this.isOpen.update((v) => !v);
		if (this.isOpen()) {
			this.lockBodyScroll();
			this.searchTerm.set('');
		} else {
			this.unlockBodyScroll();
		}
	}

	close(): void {
		this.isOpen.set(false);
		this.searchTerm.set('');
		this.unlockBodyScroll();
	}

	toggleViewMode(): void {
		this.viewMode.update((m) => (m === 'flat' ? 'tree' : 'flat'));
	}

	onSearchChange(value: string): void {
		this.searchTerm.set(value);
	}

	selectResult(result: MobileSearchResult): void {
		this.router.navigate([result.route], { queryParams: result.queryParams });
		this.close();
	}

	goHome(): void {
		this.router.navigate(['/intranet']);
		this.close();
	}

	onLogout(): void {
		this.close();
		this.logoutClick.emit();
	}
	// #endregion

	// #region Helpers privados
	private toResult(
		item: { route?: string; label: string; icon: string; queryParams?: Record<string, string> },
		modulo: ModuloMenu,
		groupLabel: string,
	): MobileSearchResult {
		const route = item.route!;
		const routeExpanded = route.replace(/\//g, ' ').replace(/-/g, ' ');
		const keywords = [item.label, modulo.label, groupLabel, route, routeExpanded].join(' ').toLowerCase();

		return {
			label: item.label,
			route,
			icon: item.icon,
			moduloId: modulo.id,
			moduloLabel: modulo.label,
			moduloIcon: modulo.icon,
			groupLabel,
			queryParams: item.queryParams,
			keywords,
		};
	}

	private score(result: MobileSearchResult, words: string[]): number {
		let total = 0;
		for (const word of words) {
			const labelMatch = result.label.toLowerCase().includes(word);
			const keywordsMatch = result.keywords.includes(word);
			if (!labelMatch && !keywordsMatch) return 0;
			total += labelMatch ? 2 : 1;
		}
		return total;
	}

	private lockBodyScroll(): void {
		document.body.style.overflow = 'hidden';
	}

	private unlockBodyScroll(): void {
		document.body.style.overflow = '';
	}
	// #endregion
}
// #endregion
