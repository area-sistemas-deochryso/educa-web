import { FocusTrapFactory } from '@angular/cdk/a11y';
import { GlobalPositionStrategy, Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	OnDestroy,
	TemplateRef,
	ViewContainerRef,
	contentChild,
	effect,
	inject,
	input,
	model,
	viewChild,
} from '@angular/core';
import { EduOverlayHandle } from '../overlay/edu-overlay-handle';
import { EduPassThrough, EduPtRoot } from '../passthrough/edu-pt-root';

export type EduDrawerPosition = 'left' | 'right' | 'top' | 'bottom';

@Component({
	selector: 'edu-drawer',
	standalone: true,
	imports: [EduPtRoot, NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<ng-template #overlayTemplate>
			<div
				class="edu-drawer-panel"
				[attr.data-position]="position()"
				[style]="style()"
				role="dialog"
				[attr.aria-label]="header() || null"
				[eduPtRoot]="$safeNavigationMigration(pt()?.root)"
			>
				@if (showHeader()) {
					<div class="edu-drawer-header">
						@if (headerTemplate(); as tpl) {
							<ng-container [ngTemplateOutlet]="tpl"></ng-container>
						} @else {
							<span class="edu-drawer-header__title">{{ header() }}</span>
						}
						<button
							type="button"
							class="edu-drawer-header__close"
							(click)="requestClose()"
							aria-label="Cerrar"
						>
							✕
						</button>
					</div>
				}
				<div class="edu-drawer-body">
					<ng-content></ng-content>
				</div>
				@if (footerTemplate(); as tpl) {
					<div class="edu-drawer-footer">
						<ng-container [ngTemplateOutlet]="tpl"></ng-container>
					</div>
				}
			</div>
		</ng-template>
	`,
	styleUrl: './edu-drawer.scss',
})
export class EduDrawer implements OnDestroy {
	readonly visible = model(false);
	readonly position = input<EduDrawerPosition>('right');
	readonly header = input('');
	readonly modal = input(true);
	readonly style = input<Record<string, string> | null>(null);
	readonly showHeader = input(true);
	readonly closeOnEscape = input(true);
	readonly pt = input<EduPassThrough>();

	protected readonly headerTemplate = contentChild<TemplateRef<unknown>>('header');
	protected readonly footerTemplate = contentChild<TemplateRef<unknown>>('footer');

	private readonly overlayTemplateRef =
		viewChild.required<TemplateRef<unknown>>('overlayTemplate');
	private readonly viewContainerRef = inject(ViewContainerRef);
	private readonly overlay = inject(Overlay);
	private readonly focusTrapFactory = inject(FocusTrapFactory);
	private readonly handle = new EduOverlayHandle(this.overlay, this.focusTrapFactory);

	constructor() {
		effect(() => {
			if (this.visible()) {
				this.open();
			} else {
				this.handle.close();
			}
		});
	}

	ngOnDestroy(): void {
		this.handle.close();
	}

	protected requestClose(): void {
		this.visible.set(false);
	}

	private open(): void {
		const portal = new TemplatePortal(this.overlayTemplateRef(), this.viewContainerRef);
		const positionStrategy = this.pinToEdge(this.overlay.position().global(), this.position());

		this.handle.open(
			portal,
			{
				positionStrategy,
				panelClass: 'edu-drawer-pane',
				hasBackdrop: this.modal(),
				backdropClass: 'cdk-overlay-dark-backdrop',
				closeOnBackdropClick: this.modal(),
				closeOnEscape: this.closeOnEscape(),
			},
			() => this.requestClose(),
		);
	}

	private pinToEdge(
		strategy: GlobalPositionStrategy,
		position: EduDrawerPosition,
	): GlobalPositionStrategy {
		switch (position) {
			case 'left':
				return strategy.left('0').top('0').height('100%');
			case 'top':
				return strategy.top('0').left('0').width('100%');
			case 'bottom':
				return strategy.bottom('0').left('0').width('100%');
			default:
				return strategy.right('0').top('0').height('100%');
		}
	}
}
