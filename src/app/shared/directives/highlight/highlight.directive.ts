import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

@Directive({
	selector: '[appHighlight]',
	standalone: true,
})
export class HighlightDirective {
	appHighlight = input<string>('#ffeb3b');

	private el = inject(ElementRef);

	@HostListener('mouseenter') onMouseEnter() {
		// Falls back to default color if the binding is empty.
		this.highlight(this.appHighlight() || '#ffeb3b');
	}

	@HostListener('mouseleave') onMouseLeave() {
		// Reset to inherited background.
		this.highlight('');
	}

	private highlight(color: string) {
		this.el.nativeElement.style.backgroundColor = color;
	}
}
