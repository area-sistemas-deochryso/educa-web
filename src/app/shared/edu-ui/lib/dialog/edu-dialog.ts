import { FocusTrapFactory } from '@angular/cdk/a11y';
import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	OnDestroy,
	TemplateRef,
	ViewContainerRef,
	effect,
	inject,
	input,
	model,
	viewChild,
} from '@angular/core';
import { EduOverlayHandle } from '../overlay/edu-overlay-handle';
import { EduPassThrough, EduPtRoot } from '../passthrough/edu-pt-root';

@Component({
	selector: 'edu-dialog',
	standalone: true,
	imports: [EduPtRoot],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<ng-template #overlayTemplate>
			<div
				class="edu-dialog-panel"
				[class]="styleClass()"
				[style]="style()"
				[attr.role]="modal() ? 'dialog' : null"
				[attr.aria-modal]="modal() ? 'true' : null"
				[attr.aria-label]="header() || null"
				[eduPtRoot]="pt()?.root"
			>
				@if (showHeader()) {
					<div class="edu-dialog-header" [class.edu-dialog-header--draggable]="draggable()" (mousedown)="onHeaderMouseDown($event)">
						<span class="edu-dialog-header__title">{{ header() }}</span>
						@if (closable()) {
							<button type="button" class="edu-dialog-header__close" (click)="requestClose()" aria-label="Cerrar">✕</button>
						}
					</div>
				}
				<div class="edu-dialog-body" [style]="contentStyle()">
					<ng-content></ng-content>
				</div>
				@if (resizable()) {
					<div class="edu-dialog-resize-handle" (mousedown)="onResizeMouseDown($event)"></div>
				}
			</div>
		</ng-template>
	`,
	styleUrl: './edu-dialog.scss',
})
export class EduDialog implements OnDestroy {
	readonly visible = model(false);
	readonly modal = input(true);
	readonly draggable = input(false);
	readonly resizable = input(false);
	readonly closable = input(true);
	readonly closeOnEscape = input(true);
	readonly dismissableMask = input(false);
	readonly showHeader = input(true);
	readonly header = input('');
	readonly style = input<Record<string, string> | null>(null);
	readonly styleClass = input('');
	readonly contentStyle = input<Record<string, string> | null>(null);
	readonly pt = input<EduPassThrough>();

	private readonly overlayTemplateRef = viewChild.required<TemplateRef<unknown>>('overlayTemplate');
	private readonly viewContainerRef = inject(ViewContainerRef);
	private readonly overlay = inject(Overlay);
	private readonly focusTrapFactory = inject(FocusTrapFactory);
	private readonly handle = new EduOverlayHandle(this.overlay, this.focusTrapFactory);

	private panelEl: HTMLElement | null = null;
	private dragOffset = { x: 0, y: 0 };

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

	protected onHeaderMouseDown(event: MouseEvent): void {
		if (!this.draggable() || !this.panelEl) {
			return;
		}
		if ((event.target as HTMLElement).closest('.edu-dialog-header__close')) {
			return;
		}
		event.preventDefault();

		const startX = event.clientX;
		const startY = event.clientY;
		const baseX = this.dragOffset.x;
		const baseY = this.dragOffset.y;
		const panel = this.panelEl;

		const onMove = (moveEvent: MouseEvent) => {
			this.dragOffset = { x: baseX + (moveEvent.clientX - startX), y: baseY + (moveEvent.clientY - startY) };
			panel.style.transform = `translate3d(${this.dragOffset.x}px, ${this.dragOffset.y}px, 0)`;
		};
		const onUp = () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}

	protected onResizeMouseDown(event: MouseEvent): void {
		if (!this.resizable() || !this.panelEl) {
			return;
		}
		event.preventDefault();

		const startX = event.clientX;
		const startY = event.clientY;
		const rect = this.panelEl.getBoundingClientRect();
		const startWidth = rect.width;
		const startHeight = rect.height;
		const panel = this.panelEl;

		const onMove = (moveEvent: MouseEvent) => {
			panel.style.width = `${Math.max(240, startWidth + (moveEvent.clientX - startX))}px`;
			panel.style.height = `${Math.max(160, startHeight + (moveEvent.clientY - startY))}px`;
		};
		const onUp = () => {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}

	private open(): void {
		this.dragOffset = { x: 0, y: 0 };

		const portal = new TemplatePortal(this.overlayTemplateRef(), this.viewContainerRef);
		const positionStrategy = this.overlay.position().global().centerHorizontally().centerVertically();

		this.handle.open(
			portal,
			{
				positionStrategy,
				panelClass: 'edu-dialog-pane',
				hasBackdrop: this.modal(),
				backdropClass: 'cdk-overlay-dark-backdrop',
				closeOnBackdropClick: this.dismissableMask(),
				closeOnEscape: this.closeOnEscape(),
			},
			() => this.requestClose(),
		);

		this.panelEl = this.handle.overlayElement?.querySelector<HTMLElement>('.edu-dialog-panel') ?? null;
	}
}
