import { FocusTrapFactory } from '@angular/cdk/a11y';
import { ConnectedPosition, Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, TemplateRef, ViewContainerRef, inject, input, viewChild } from '@angular/core';
import { EduOverlayHandle } from '../overlay/edu-overlay-handle';

export interface EduMenuItemCommandEvent {
	originalEvent?: Event;
	item: EduMenuItem;
}

export interface EduMenuItem {
	label: string;
	icon?: string;
	command?: (event: EduMenuItemCommandEvent) => void;
}

const POPUP_POSITIONS: ConnectedPosition[] = [
	{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
	{ originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
];

@Component({
	selector: 'edu-menu',
	standalone: true,
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<ng-template #menuList>
			<ul class="edu-menu" role="menu">
				@for (item of model(); track $index) {
					<li class="edu-menu__item" role="menuitem" (click)="onItemClick($event, item)">
						@if (item.icon) {
							<i class="edu-menu__icon" [class]="item.icon"></i>
						}
						<span class="edu-menu__label">{{ item.label }}</span>
					</li>
				}
			</ul>
		</ng-template>

		@if (popup()) {
			<ng-template #overlayTemplate>
				<ng-container [ngTemplateOutlet]="menuList"></ng-container>
			</ng-template>
		} @else {
			<ng-container [ngTemplateOutlet]="menuList"></ng-container>
		}
	`,
	styleUrl: './edu-menu.scss',
})
export class EduMenu implements OnDestroy {
	readonly model = input<EduMenuItem[]>([]);
	readonly popup = input(false);
	readonly appendTo = input<'body'>('body');

	private readonly overlayTemplateRef = viewChild<TemplateRef<unknown>>('overlayTemplate');
	private readonly viewContainerRef = inject(ViewContainerRef);
	private readonly overlay = inject(Overlay);
	private readonly focusTrapFactory = inject(FocusTrapFactory);
	private readonly handle = new EduOverlayHandle(this.overlay, this.focusTrapFactory);

	ngOnDestroy(): void {
		this.handle.close({ immediate: true });
	}

	toggle(event: Event): void {
		if (this.handle.isOpen) {
			this.close();
			return;
		}
		this.open(event.currentTarget as HTMLElement);
	}

	close(): void {
		this.handle.close();
	}

	protected onItemClick(event: Event, item: EduMenuItem): void {
		item.command?.({ originalEvent: event, item });
		if (this.popup()) {
			this.close();
		}
	}

	private open(trigger: HTMLElement): void {
		const overlayTemplate = this.overlayTemplateRef();
		if (!overlayTemplate) {
			return;
		}

		const portal = new TemplatePortal(overlayTemplate, this.viewContainerRef);
		const positionStrategy = this.overlay.position().flexibleConnectedTo(trigger).withPositions(POPUP_POSITIONS).withFlexibleDimensions(false);

		this.handle.open(
			portal,
			{
				positionStrategy,
				panelClass: 'edu-menu-pane',
				hasBackdrop: true,
				backdropClass: 'cdk-overlay-transparent-backdrop',
				closeOnBackdropClick: true,
			},
			() => this.close(),
		);
	}
}
