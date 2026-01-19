import { Directive, ElementRef, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
	selector: '[appUppercaseInput]',
	standalone: true,
})
export class UppercaseInputDirective {
	constructor(
		private el: ElementRef,
		private control: NgControl,
	) {}

	@HostListener('input')
	onInput(): void {
		const input = this.el.nativeElement as HTMLInputElement;
		const uppercased = input.value.toUpperCase();
		input.value = uppercased;
		this.control.control?.setValue(uppercased, { emitEvent: false });
	}
}
