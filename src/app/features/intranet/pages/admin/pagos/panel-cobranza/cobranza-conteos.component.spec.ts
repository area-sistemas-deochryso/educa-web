import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { CobranzaConteosComponent } from './cobranza-conteos.component';

describe('CobranzaConteosComponent', () => {
	it('muestra «sin cargos» y «con datos sin confirmar» aparte, sin sumarlos al total (INV-PG14)', () => {
		const fixture = TestBed.createComponent(CobranzaConteosComponent);
		fixture.componentRef.setInput('conteos', {
			alDia: 10,
			pagoParcial: 3,
			conDeuda: 2,
			conDatosSinConfirmar: 7,
			sinCargos: 9,
		});
		fixture.detectChanges();
		const el = fixture.nativeElement as HTMLElement;

		expect(el.querySelector('[data-testid="total"]')?.textContent).toContain('15');
		expect(el.querySelector('[data-testid="sin-cargos"]')?.textContent).toContain('9');
		expect(el.querySelector('[data-testid="sin-confirmar"]')?.textContent).toContain('7');
	});
});
