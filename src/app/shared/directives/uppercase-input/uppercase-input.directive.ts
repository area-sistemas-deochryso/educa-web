import { Directive, ElementRef, HostListener, inject } from '@angular/core';

import { NgControl } from '@angular/forms';

@Directive({
	selector: '[appUppercaseInput]',
	standalone: true,
})
export class UppercaseInputDirective {
	private el = inject(ElementRef);
	private control = inject(NgControl);

	@HostListener('input')
	onInput(): void {
		const input = this.el.nativeElement as HTMLInputElement;
		const uppercased = input.value.toUpperCase();
		input.value = uppercased;
		this.control.control?.setValue(uppercased, { emitEvent: false });
	}
}
