import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { CobranzaConteosComponent } from './cobranza-conteos.component';

describe('CobranzaConteosComponent', () => {
	beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

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

	it('explica por qué «sin cargos» no es «al día» y enlaza al reporte solo si hay alguno', () => {
		const fixture = TestBed.createComponent(CobranzaConteosComponent);
		const base = { alDia: 1, pagoParcial: 0, conDeuda: 0, conDatosSinConfirmar: 0 };
		fixture.componentRef.setInput('conteos', { ...base, sinCargos: 4 });
		fixture.detectChanges();
		const el = fixture.nativeElement as HTMLElement;

		const sinCargos = el.querySelector('[data-testid="sin-cargos"]');
		expect(sinCargos?.textContent).toContain('no cuentan como «al día»');
		expect(sinCargos?.querySelector('a')?.getAttribute('href')).toBe('/intranet/admin/pagos/consistencia');

		fixture.componentRef.setInput('conteos', { ...base, sinCargos: 0 });
		fixture.detectChanges();
		expect(el.querySelector('[data-testid="sin-cargos"] a')).toBeNull();
	});
});
