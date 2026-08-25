import { Directive, ElementRef, OnDestroy, Renderer2, inject, input } from '@angular/core';

export type EduTooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface EduTooltipOptions {
	showDelay?: number;
}

@Directive({
	selector: '[eduTooltip]',
	standalone: true,
	host: {
		'(mouseenter)': 'show()',
		'(mouseleave)': 'hide()',
		'(focus)': 'show()',
		'(blur)': 'hide()',
	},
})
export class EduTooltip implements OnDestroy {
	readonly eduTooltip = input<string>('');
	readonly eduTooltipPosition = input<EduTooltipPosition>('top');
	/**
	 * No-op kept for API compatibility with other tooltip implementations.
	 * This directive already renders its panel by appending directly to
	 * `document.body` (see `show()`), so it is always "body-level" —
	 * there is no local `ViewContainerRef`/overlay container to redirect.
	 */
	readonly appendTo = input<'body' | string>();
	readonly tooltipDisabled = input(false);
	readonly tooltipOptions = input<EduTooltipOptions>();

	private readonly host = inject(ElementRef<HTMLElement>);
	private readonly renderer = inject(Renderer2);
	private tooltipEl: HTMLElement | null = null;
	private showTimeoutId: ReturnType<typeof setTimeout> | null = null;

	show(): void {
		if (this.tooltipDisabled()) {
			return;
		}

		const text = this.eduTooltip();
		if (!text || this.tooltipEl || this.showTimeoutId) {
			return;
		}

		const showDelay = this.tooltipOptions()?.showDelay;
		if (showDelay) {
			this.showTimeoutId = setTimeout(() => {
				this.showTimeoutId = null;
				this.render(text);
			}, showDelay);
			return;
		}

		this.render(text);
	}

	hide(): void {
		if (this.showTimeoutId) {
			clearTimeout(this.showTimeoutId);
			this.showTimeoutId = null;
		}
		if (this.tooltipEl) {
			this.renderer.removeChild(document.body, this.tooltipEl);
			this.tooltipEl = null;
		}
	}

	ngOnDestroy(): void {
		this.hide();
	}

	private render(text: string): void {
		const el = this.renderer.createElement('div') as HTMLElement;
		this.renderer.addClass(el, 'edu-tooltip');
		this.renderer.setProperty(el, 'textContent', text);
		this.renderer.appendChild(document.body, el);
		this.tooltipEl = el;
		this.position();
	}

	private position(): void {
		if (!this.tooltipEl) {
			return;
		}

		const hostRect = this.host.nativeElement.getBoundingClientRect();
		const tipRect = this.tooltipEl.getBoundingClientRect();
		const gutter = 4;
		let top: number;
		let left: number;

		switch (this.eduTooltipPosition()) {
			case 'bottom':
				top = hostRect.bottom + gutter;
				left = hostRect.left + hostRect.width / 2 - tipRect.width / 2;
				break;
			case 'left':
				top = hostRect.top + hostRect.height / 2 - tipRect.height / 2;
				left = hostRect.left - tipRect.width - gutter;
				break;
			case 'right':
				top = hostRect.top + hostRect.height / 2 - tipRect.height / 2;
				left = hostRect.right + gutter;
				break;
			default:
				top = hostRect.top - tipRect.height - gutter;
				left = hostRect.left + hostRect.width / 2 - tipRect.width / 2;
		}

		this.renderer.setStyle(this.tooltipEl, 'top', `${top}px`);
		this.renderer.setStyle(this.tooltipEl, 'left', `${left}px`);
	}
}
