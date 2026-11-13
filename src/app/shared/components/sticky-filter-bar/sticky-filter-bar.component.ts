import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	HostListener,
	effect,
	inject,
	input,
	output,
	signal,
} from '@angular/core';

/** Alto de respaldo del encabezado fijo de la app (escritorio) si no se puede medir. */
const APP_HEADER_FALLBACK_PX = 80;

/**
 * Barra compacta de una línea (buscador + botón «Filtros (n)» + acciones) que aparece pegada bajo el
 * encabezado de la app cuando el bloque de filtros de la página sale de la pantalla al hacer scroll.
 * Así el buscador y los filtros siguen a mano sin un bloque alto fijo.
 *
 * Uso: colocarla justo después del bloque de filtros y pasarle ese bloque en `[watch]`. El contenido
 * proyectado por defecto son los controles de filtro (se muestran en el panel); lo marcado con
 * `sfbActions` queda a la derecha de la barra.
 *
 * ```html
 * <section class="filters" #filtersEl>…</section>
 * <app-sticky-filter-bar [watch]="filtersEl" [searchTerm]="term()" [activeFilters]="n()"
 *   (searchChange)="onSearch($event)" (clearFilters)="clear()">
 *   <edu-select … />            <!-- panel de filtros -->
 *   <edu-button sfbActions … /> <!-- acción a la derecha -->
 * </app-sticky-filter-bar>
 * ```
 */
@Component({
	selector: 'app-sticky-filter-bar',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './sticky-filter-bar.component.html',
	styleUrl: './sticky-filter-bar.component.scss',
})
export class StickyFilterBarComponent {
	/** Elemento cuya salida de pantalla hace aparecer la barra (normalmente el bloque de filtros). */
	readonly watch = input.required<HTMLElement | null>();
	readonly searchTerm = input.required<string>();
	readonly placeholder = input('Buscar…');
	/** Cantidad de filtros activos (sin contar el buscador); se muestra en el botón. */
	readonly activeFilters = input(0);

	readonly searchChange = output<string>();
	readonly clearFilters = output<void>();

	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

	protected readonly gone = signal(false);
	protected readonly open = signal(false);

	private readonly observe = effect((onCleanup) => {
		const el = this.watch();
		if (!el || typeof IntersectionObserver === 'undefined') return;

		let observer: IntersectionObserver | null = null;
		const start = (): void => {
			const top = this.appHeaderBottom();
			this.host.nativeElement.style.setProperty('--sfb-top', `${top}px`);
			observer?.disconnect();
			observer = new IntersectionObserver(
				([entry]) => {
					const gone = !entry.isIntersecting && entry.boundingClientRect.bottom < top;
					this.gone.set(gone);
					if (!gone) this.open.set(false);
				},
				{ rootMargin: `-${top}px 0px 0px 0px` },
			);
			observer.observe(el);
		};
		start();
		window.addEventListener('resize', start);
		onCleanup(() => {
			window.removeEventListener('resize', start);
			observer?.disconnect();
		});
	});

	protected onSearch(event: Event): void {
		this.searchChange.emit((event.target as HTMLInputElement).value);
	}

	protected toggle(): void {
		this.open.update((v) => !v);
	}

	@HostListener('document:click', ['$event'])
	onDocumentClick(event: MouseEvent): void {
		if (!this.open()) return;
		const target = event.target as HTMLElement | null;
		// Los desplegables de los selects se montan en <body> (appendTo="body"): no cuentan como «fuera».
		const inOverlay = !!target?.closest('[class*="overlay"], [class*="select-panel"]');
		if (!target || this.host.nativeElement.contains(target) || inOverlay) return;
		this.open.set(false);
	}

	@HostListener('keydown.escape')
	onEscape(): void {
		this.open.set(false);
	}

	/** Borde inferior del encabezado fijo de la app: cambia con el ancho (en móvil es más alto). */
	private appHeaderBottom(): number {
		const bottom = document.querySelector('header.intranet-header')?.getBoundingClientRect().bottom ?? 0;
		return bottom > 0 ? Math.round(bottom) : APP_HEADER_FALLBACK_PX;
	}
}
