// #region Imports
import {
	Directive,
	ElementRef,
	Input,
	OnChanges,
	Renderer2,
	SimpleChanges,
	inject,
} from '@angular/core';

// #endregion
// #region Implementation
@Directive({
	selector: '[appTableLoading]',
	standalone: true,
})
export class TableLoadingDirective implements OnChanges {
	private host = inject(ElementRef<HTMLElement>);
	private r2 = inject(Renderer2);

	/** Control principal */
	@Input() loading = false;

	/** Blur al contenido */
	@Input() blurPx = 2;

	/**
	 * Reserva altura al entrar en loading:
	 * - captura el alto actual del host y lo fija como min-height
	 * - evita CLS cuando el contenido interno cambia
	 */
	@Input() freezeHeight = true;

	/** Fallback si no se puede medir (por ejemplo, primera carga) */
	@Input() minHeightPx = 320;

	private overlayEl?: HTMLDivElement;
	private frozenMinHeight?: string;

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['loading']) {
			this.ensureBaseHostStyles();
			this.ensureOverlay();

			if (this.loading) this.enableLoading();
			else this.disableLoading();
		}
	}

	private ensureBaseHostStyles() {
		const el = this.host.nativeElement;

		// Evita romper layouts: solo fuerza relative si no lo tiene
		const pos = getComputedStyle(el).position;
		if (pos === 'static') this.r2.setStyle(el, 'position', 'relative');
	}

	private ensureOverlay() {
		if (this.overlayEl) return;

		const el = this.host.nativeElement;
		const overlay = this.r2.createElement('div') as HTMLDivElement;
		overlay.className = 'table-loading__overlay';
		overlay.setAttribute('aria-hidden', 'true');

		// Spinner puro CSS (composited: transform)
		const spinner = this.r2.createElement('div') as HTMLDivElement;
		spinner.className = 'table-loading__spinner';
		spinner.setAttribute('role', 'status');
		spinner.setAttribute('aria-label', 'Cargando');

		this.r2.appendChild(overlay, spinner);
		this.r2.appendChild(el, overlay);

		this.overlayEl = overlay;
	}

	private enableLoading() {
		const el = this.host.nativeElement;

		// Reservar altura: congela el alto actual como min-height
		if (this.freezeHeight) {
			const current = el.getBoundingClientRect().height;
			const minH = Math.max(Math.round(current), this.minHeightPx);
			this.frozenMinHeight = el.style.minHeight;
			this.r2.setStyle(el, 'minHeight', `${minH}px`);
		}

		// Blur + bloquear interacciÃƒÂ³n sin afectar layout
		this.r2.addClass(el, 'table-loading--active');
		this.r2.setStyle(el, '--table-loading-blur', `${this.blurPx}px`);
		el.setAttribute('aria-busy', 'true');

		if (this.overlayEl) {
			this.overlayEl.style.display = 'grid';
		}
	}

	private disableLoading() {
		const el = this.host.nativeElement;

		this.r2.removeClass(el, 'table-loading--active');
		el.removeAttribute('aria-busy');

		if (this.overlayEl) {
			this.overlayEl.style.display = 'none';
		}

		// Restaurar min-height
		if (this.freezeHeight) {
			this.r2.setStyle(el, 'minHeight', this.frozenMinHeight ?? null);
			this.frozenMinHeight = undefined;
		}
	}
}
// #endregion
