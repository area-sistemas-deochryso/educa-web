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
		if (!el) return;

		let top = this.appHeaderBottom();
		let frame = 0;
		const check = (): void => {
			frame = 0;
			// Solo cuenta como «fuera» si el bloque ya pasó por arriba del encabezado (no si aún no llegó).
			const gone = el.getBoundingClientRect().bottom < top;
			if (gone === this.gone()) return;
			this.gone.set(gone);
			if (!gone) this.open.set(false);
		};
		const schedule = (): void => {
			if (!frame) frame = requestAnimationFrame(check);
		};
		const measure = (): void => {
			top = this.appHeaderBottom();
			this.host.nativeElement.style.setProperty('--sfb-top', `${top}px`);
			schedule();
		};

		measure();
		// El scroll puede ocurrir en el documento o en un contenedor interno: se escucha en captura.
		window.addEventListener('scroll', schedule, { capture: true, passive: true });
		window.addEventListener('resize', measure);
		// El encabezado puede crecer después de montar (breadcrumb, banners): se vuelve a medir.
		const header = document.querySelector('header.intranet-header');
		const headerResize =
			header && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
		if (header) headerResize?.observe(header);
		onCleanup(() => {
			if (frame) cancelAnimationFrame(frame);
			window.removeEventListener('scroll', schedule, { capture: true });
			window.removeEventListener('resize', measure);
			headerResize?.disconnect();
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
