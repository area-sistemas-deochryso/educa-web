import { FocusTrapFactory } from '@angular/cdk/a11y';
import { ConnectedPosition, Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, TemplateRef, ViewContainerRef, contentChild, inject, input, output, viewChild } from '@angular/core';
import { EduOverlayHandle } from '../overlay/edu-overlay-handle';

const POPUP_POSITIONS: ConnectedPosition[] = [
	{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
	{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
	{ originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
	{ originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
];

@Component({
	selector: 'edu-popover',
	standalone: true,
	exportAs: 'eduPopover',
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<ng-template #overlayTemplate>
			<div class="edu-popover-panel">
				<ng-container [ngTemplateOutlet]="contentTemplate() ?? null"></ng-container>
			</div>
		</ng-template>
	`,
	styleUrl: './edu-popover.scss',
})
export class EduPopover implements OnDestroy {
	readonly appendTo = input<'body'>('body');
	readonly styleClass = input<string>();

	readonly onShow = output<void>();
	readonly onHide = output<void>();

	// Consumer wraps their content in <ng-template>, not <ng-content>, so it can be captured as a TemplateRef for TemplatePortal.
	protected readonly contentTemplate = contentChild(TemplateRef<unknown>);
	private readonly overlayTemplateRef = viewChild<TemplateRef<unknown>>('overlayTemplate');

	private readonly viewContainerRef = inject(ViewContainerRef);
	private readonly overlay = inject(Overlay);
	private readonly focusTrapFactory = inject(FocusTrapFactory);
	private readonly handle = new EduOverlayHandle(this.overlay, this.focusTrapFactory);

	ngOnDestroy(): void {
		this.handle.close();
	}

	toggle(event: Event): void {
		if (this.handle.isOpen) {
			this.hide();
			return;
		}
		this.show(event);
	}

	show(event: Event): void {
		if (this.handle.isOpen) {
			return;
		}

		const overlayTemplate = this.overlayTemplateRef();
		if (!overlayTemplate) {
			return;
		}

		const portal = new TemplatePortal(overlayTemplate, this.viewContainerRef);
		const trigger = event.currentTarget as HTMLElement;
		const positionStrategy = this.overlay.position().flexibleConnectedTo(trigger).withPositions(POPUP_POSITIONS).withFlexibleDimensions(false);

		this.handle.open(
			portal,
			{
				positionStrategy,
				// classList.add() rejects tokens containing spaces — split each class
				// individually rather than joining into one space-separated string.
				panelClass: ['edu-popover-pane', ...(this.styleClass()?.split(' ').filter(Boolean) ?? [])],
				hasBackdrop: true,
				backdropClass: 'cdk-overlay-transparent-backdrop',
				closeOnBackdropClick: true,
			},
			() => this.hide(),
		);

		this.onShow.emit();
	}

	hide(): void {
		if (!this.handle.isOpen) {
			return;
		}

		this.handle.close();
		this.onHide.emit();
	}
}
