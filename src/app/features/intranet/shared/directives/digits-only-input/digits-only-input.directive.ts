// #region Imports
import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

import { NgControl } from '@angular/forms';

// #endregion
// #region Implementation
/**
 * Restringe un input a dígitos (0-9) y a un máximo de caracteres.
 * Filtra teclear, pegar y autofill; al rechazar un carácter dispara una
 * animación corta (`digits-rejected`) para dar feedback visual.
 */
@Directive({
	selector: '[appDigitsOnlyInput]',
	standalone: true,
	host: {
		inputmode: 'numeric',
		'[attr.maxlength]': 'maxDigits()',
	},
})
export class DigitsOnlyInputDirective {
	private el = inject<ElementRef<HTMLInputElement>>(ElementRef);
	private control = inject(NgControl, { optional: true });

	readonly maxDigits = input(8, { alias: 'appDigitsOnlyInput' });

	@HostListener('input')
	onInput(): void {
		const input = this.el.nativeElement;
		const raw = input.value;
		const digits = raw.replace(/\D/g, '').slice(0, this.maxDigits());

		if (digits === raw) return;

		// * Había letras/símbolos o excedía el máximo: corregir y avisar visualmente.
		input.value = digits;
		this.control?.control?.setValue(digits);
		this.flashRejected();
	}

	private flashRejected(): void {
		const field = this.el.nativeElement.closest('.login-field');
		if (!field) return;
		field.classList.remove('is-rejected');
		// ! Forzar reflow para reiniciar la animación si se rechaza varias veces seguidas.
		void (field as HTMLElement).offsetWidth;
		field.classList.add('is-rejected');
	}
}
// #endregion
