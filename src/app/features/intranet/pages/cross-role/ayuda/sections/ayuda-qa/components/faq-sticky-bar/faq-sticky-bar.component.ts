import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	HostListener,
	inject,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';

import { CategoriaChip, ModoVista } from '../../services/ayuda-qa.facade';

/**
 * Barra compacta de una línea (buscador + «Para ti / Todas» + menú «Categorías») que reemplaza a la
 * cabecera cuando esta sale de la pantalla al hacer scroll. Es presentacional: no tiene estado de
 * filtros propio, lo recibe y lo emite igual que `FaqHeaderComponent`.
 */
@Component({
	selector: 'app-faq-sticky-bar',
	standalone: true,
	templateUrl: './faq-sticky-bar.component.html',
	styleUrl: './faq-sticky-bar.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqStickyBarComponent {
	// #region Inputs / Outputs
	readonly searchTerm = input.required<string>();
	readonly modoVista = input.required<ModoVista>();
	readonly categoria = input<string | null>(null);
	readonly chips = input.required<CategoriaChip[]>();
	readonly paraTiCount = input.required<number>();
	readonly todasCount = input.required<number>();
	readonly hasFilters = input(false);

	readonly searchChange = output<string>();
	readonly modoChange = output<ModoVista>();
	readonly categoriaChange = output<string | null>();
	readonly filtersCleared = output<void>();
	// #endregion

	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
	private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

	readonly menuOpen = signal(false);

	focusSearch(): void {
		const input = this.searchInput()?.nativeElement;
		if (!input) return;
		input.focus();
		input.setSelectionRange(input.value.length, input.value.length);
	}

	/** `true` si el foco está dentro de la barra (para no perderlo cuando la barra se oculta). */
	hasFocus(): boolean {
		return this.host.nativeElement.contains(document.activeElement);
	}

	onSearchInput(event: Event): void {
		this.searchChange.emit((event.target as HTMLInputElement).value);
	}

	toggleMenu(): void {
		this.menuOpen.update((open) => !open);
	}

	onCategoria(value: string | null): void {
		this.categoriaChange.emit(value !== null && value === this.categoria() ? null : value);
		this.menuOpen.set(false);
	}

	onClear(): void {
		this.filtersCleared.emit();
		this.focusSearch();
	}

	@HostListener('document:click', ['$event'])
	onDocumentClick(event: MouseEvent): void {
		if (this.menuOpen() && !this.host.nativeElement.contains(event.target as Node)) {
			this.menuOpen.set(false);
		}
	}

	@HostListener('keydown.escape')
	onEscape(): void {
		this.menuOpen.set(false);
	}
}
