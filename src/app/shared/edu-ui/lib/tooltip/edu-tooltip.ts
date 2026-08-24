import { Directive, ElementRef, OnDestroy, Renderer2, inject, input } from '@angular/core';

export type EduTooltipPosition = 'top' | 'bottom' | 'left' | 'right';

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

	private readonly host = inject(ElementRef<HTMLElement>);
	private readonly renderer = inject(Renderer2);
	private tooltipEl: HTMLElement | null = null;

	show(): void {
		const text = this.eduTooltip();
		if (!text || this.tooltipEl) {
			return;
		}

		const el = this.renderer.createElement('div') as HTMLElement;
		this.renderer.addClass(el, 'edu-tooltip');
		this.renderer.setProperty(el, 'textContent', text);
		this.renderer.appendChild(document.body, el);
		this.tooltipEl = el;
		this.position();
	}

	hide(): void {
		if (this.tooltipEl) {
			this.renderer.removeChild(document.body, this.tooltipEl);
			this.tooltipEl = null;
		}
	}

	ngOnDestroy(): void {
		this.hide();
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
