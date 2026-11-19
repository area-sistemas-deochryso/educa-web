import { afterNextRender, DestroyRef, Directive, effect, ElementRef, inject, input } from '@angular/core';

const SHAKE_CLASS = 'motion-shake';

/**
 * Sacude el host al pasar de válido a inválido (utilidad `.motion-shake` de F1). La sacudida nunca va sola:
 * el consumidor sigue siendo responsable del mensaje de texto y de `aria-invalid`.
 *
 * - Sin valor: observa el atributo `aria-invalid` del host (inputs/textarea gestionados por el consumidor).
 * - Con `[eduShakeOnInvalid]="bool"`: usa ese estado (campos con invalidez propia, como el datepicker).
 *
 * El estado inicial no sacude: un formulario que carga ya inválido queda quieto.
 */
@Directive({
	selector: '[eduShakeOnInvalid]',
	standalone: true,
})
export class EduShakeOnInvalid {
	readonly invalid = input<boolean | null | ''>(null, { alias: 'eduShakeOnInvalid' });

	private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
	private wasInvalid: boolean | null = null;

	constructor() {
		const observer = new MutationObserver(() => this.update(this.readAttribute()));
		inject(DestroyRef).onDestroy(() => observer.disconnect());

		// El atributo se observa tras el primer render: los bindings iniciales no cuentan como transición.
		afterNextRender(() => {
			if (this.invalid() === null || this.invalid() === '') {
				this.wasInvalid = this.readAttribute();
				observer.observe(this.host, { attributes: true, attributeFilter: ['aria-invalid'] });
			}
		});

		effect(() => {
			const value = this.invalid();
			if (value === null || value === '') return;
			this.update(value);
		});

		this.host.addEventListener('animationend', (event: AnimationEvent) => {
			if (event.animationName === 'motion-shake') this.host.classList.remove(SHAKE_CLASS);
		});
	}

	private readAttribute(): boolean {
		return this.host.getAttribute('aria-invalid') === 'true';
	}

	private update(invalid: boolean): void {
		const previous = this.wasInvalid;
		this.wasInvalid = invalid;
		// `previous === null`: primera lectura, solo fija la línea base.
		if (previous === false && invalid) this.shake();
	}

	private shake(): void {
		this.host.classList.remove(SHAKE_CLASS);
		void this.host.offsetWidth;
		this.host.classList.add(SHAKE_CLASS);
	}
}
