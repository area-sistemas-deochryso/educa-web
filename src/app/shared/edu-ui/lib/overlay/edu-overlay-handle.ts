import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { ESCAPE } from '@angular/cdk/keycodes';
import { Overlay, OverlayRef, PositionStrategy } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

/**
 * Shared open/close lifecycle for edu-dialog, edu-drawer, edu-popover, edu-menu,
 * edu-select, edu-multi-select, edu-datepicker and edu-autocomplete: CDK Overlay
 * creation, focus trap, Escape-to-close, backdrop-click-to-close, and the
 * enter/leave choreography via the `data-open` attribute on the panel's root
 * element.
 * Not exported from public-api.ts — internal implementation detail.
 */
export interface EduOverlayOpenOptions {
	positionStrategy: PositionStrategy;
	panelClass: string | string[];
	hasBackdrop: boolean;
	backdropClass?: string;
	closeOnBackdropClick: boolean;
	closeOnEscape?: boolean;
}

export interface EduOverlayCloseOptions {
	/** Skips waiting for the CSS transition and disposes right away. Meant for ngOnDestroy. */
	immediate?: boolean;
}

export class EduOverlayHandle {
	private overlayRef: OverlayRef | null = null;
	private focusTrap: FocusTrap | null = null;
	private previouslyFocused: HTMLElement | null = null;
	private subscriptions = new Subscription();
	private closing = false;

	constructor(
		private readonly overlay: Overlay,
		private readonly focusTrapFactory: FocusTrapFactory,
	) {}

	// overlayRef stays non-null through the whole leave transition, so isOpen
	// stays true and open() (`if (this.overlayRef) return`) blocks reopening
	// while a previous close is still animating out — avoids overlapping
	// overlays from the same handle without a separate flag.
	get isOpen(): boolean {
		return this.overlayRef !== null;
	}

	get overlayElement(): HTMLElement | null {
		return this.overlayRef?.overlayElement ?? null;
	}

	open(portal: TemplatePortal, options: EduOverlayOpenOptions, onCloseRequest: () => void): void {
		if (this.overlayRef) {
			return;
		}

		this.previouslyFocused = document.activeElement as HTMLElement | null;

		this.overlayRef = this.overlay.create({
			positionStrategy: options.positionStrategy,
			scrollStrategy: this.overlay.scrollStrategies.block(),
			hasBackdrop: options.hasBackdrop,
			backdropClass: options.backdropClass,
			panelClass: options.panelClass,
		});

		this.overlayRef.attach(portal);

		// The first real element inside .cdk-overlay-pane is always the root
		// panel each component defines in its <ng-template #overlayTemplate>.
		const panelEl = this.overlayRef.overlayElement.firstElementChild as HTMLElement | null;
		if (panelEl) {
			// rAF: let the browser paint the initial state (no data-open) before
			// toggling, so the CSS engine actually animates the transition
			// instead of starting straight at the final state.
			requestAnimationFrame(() => panelEl.setAttribute('data-open', ''));
		}

		this.focusTrap = this.focusTrapFactory.create(this.overlayRef.overlayElement);
		this.focusTrap.focusInitialElementWhenReady();

		if (options.closeOnEscape ?? true) {
			this.subscriptions.add(
				this.overlayRef
					.keydownEvents()
					.pipe(filter((event) => event.keyCode === ESCAPE))
					.subscribe(() => onCloseRequest()),
			);
		}

		if (options.closeOnBackdropClick) {
			this.subscriptions.add(this.overlayRef.backdropClick().subscribe(() => onCloseRequest()));
		}
	}

	close(options?: EduOverlayCloseOptions): void {
		if (!this.overlayRef) {
			return;
		}

		if (this.closing) {
			// An animated close is already in flight; a second call can only
			// force disposal right away (ngOnDestroy asking for immediate).
			if (options?.immediate) {
				this.disposeNow();
			}
			return;
		}
		this.closing = true;

		this.subscriptions.unsubscribe();
		this.subscriptions = new Subscription();
		this.focusTrap?.destroy();
		this.focusTrap = null;

		const panelEl = this.overlayRef.overlayElement.firstElementChild as HTMLElement | null;
		panelEl?.removeAttribute('data-open');

		if (options?.immediate || !panelEl) {
			this.disposeNow();
			return;
		}

		waitForTransition(panelEl).then(() => this.disposeNow());
	}

	private disposeNow(): void {
		if (!this.overlayRef) {
			// Already fired through another path (an immediate close interrupted
			// a pending transition wait).
			return;
		}

		this.overlayRef.dispose();
		this.overlayRef = null;
		this.closing = false;

		this.previouslyFocused?.focus();
		this.previouslyFocused = null;
	}
}

/**
 * Resolves when `el`'s CSS transition ends, or right away if the element has
 * no transition defined (computed duration 0). Includes a guard timeout in
 * case `transitionend` never fires.
 */
function waitForTransition(el: HTMLElement): Promise<void> {
	const durationMs = getTransitionDurationMs(el);

	if (durationMs <= 0) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve) => {
		let settled = false;

		const finish = () => {
			if (settled) return;
			settled = true;
			el.removeEventListener('transitionend', onTransitionEnd);
			clearTimeout(timeoutId);
			resolve();
		};

		const onTransitionEnd = (event: TransitionEvent) => {
			if (event.target === el) finish();
		};

		el.addEventListener('transitionend', onTransitionEnd);
		// Guard buffer in case the event never arrives (interrupted transition,
		// element removed from layout by the parent, etc.)
		const timeoutId = setTimeout(finish, durationMs + 50);
	});
}

function getTransitionDurationMs(el: HTMLElement): number {
	// May come as a comma-separated list if several properties have a
	// transition (e.g. "200ms, 150ms, 0s") — take the max.
	return getComputedStyle(el)
		.transitionDuration.split(',')
		.reduce((max, part) => {
			const trimmed = part.trim();
			const ms = trimmed.endsWith('ms') ? parseFloat(trimmed) : parseFloat(trimmed) * 1000;
			return Number.isNaN(ms) ? max : Math.max(max, ms);
		}, 0);
}
