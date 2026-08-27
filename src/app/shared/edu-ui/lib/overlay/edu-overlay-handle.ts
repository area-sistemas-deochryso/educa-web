import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { ESCAPE } from '@angular/cdk/keycodes';
import { Overlay, OverlayRef, PositionStrategy } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

/**
 * Shared open/close lifecycle for edu-dialog, edu-drawer and edu-menu: CDK Overlay
 * creation, focus trap, Escape-to-close and (optional) backdrop-click-to-close.
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

export class EduOverlayHandle {
	private overlayRef: OverlayRef | null = null;
	private focusTrap: FocusTrap | null = null;
	private previouslyFocused: HTMLElement | null = null;
	private subscriptions = new Subscription();

	constructor(
		private readonly overlay: Overlay,
		private readonly focusTrapFactory: FocusTrapFactory,
	) {}

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

	close(): void {
		if (!this.overlayRef) {
			return;
		}

		this.subscriptions.unsubscribe();
		this.subscriptions = new Subscription();

		this.focusTrap?.destroy();
		this.focusTrap = null;

		this.overlayRef.dispose();
		this.overlayRef = null;

		this.previouslyFocused?.focus();
		this.previouslyFocused = null;
	}
}
