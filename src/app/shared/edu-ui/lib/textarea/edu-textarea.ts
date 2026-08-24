import { Directive, ElementRef, HostListener, effect, inject, input } from '@angular/core';

@Directive({
	selector: 'textarea[eduTextarea]',
	standalone: true,
	host: { class: 'edu-textarea' },
})
export class EduTextarea {
	readonly autoResize = input(false);

	private readonly elementRef = inject(ElementRef<HTMLTextAreaElement>);

	constructor() {
		effect(() => {
			if (this.autoResize()) {
				this.resize();
			}
		});
	}

	@HostListener('input')
	onInput(): void {
		if (this.autoResize()) {
			this.resize();
		}
	}

	private resize(): void {
		const textarea = this.elementRef.nativeElement;
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}
}
