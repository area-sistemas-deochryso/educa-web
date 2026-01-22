import { Directive, ElementRef, HostListener, input } from '@angular/core';

@Directive({
	selector: '[appHighlight]',
	standalone: true,
})
export class HighlightDirective {
	appHighlight = input<string>('#ffeb3b');

	constructor(private el: ElementRef) {}

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
