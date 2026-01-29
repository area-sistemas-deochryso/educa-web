import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

@Directive({
	selector: '[appHighlight]',
	standalone: true,
})
export class HighlightDirective {
	appHighlight = input<string>('#ffeb3b');

	private el = inject(ElementRef);

	@HostListener('mouseenter') onMouseEnter() {
		this.highlight(this.appHighlight() || '#ffeb3b');
	}

	@HostListener('mouseleave') onMouseLeave() {
		this.highlight('');
	}

	private highlight(color: string) {
		this.el.nativeElement.style.backgroundColor = color;
	}
}
