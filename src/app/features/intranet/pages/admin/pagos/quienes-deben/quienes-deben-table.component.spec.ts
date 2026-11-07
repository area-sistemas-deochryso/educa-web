import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import type { QuienDebeFila } from '@data/models';
import { QuienesDebenTableComponent } from './quienes-deben-table.component';

beforeEach(() => {
	// La tabla enlaza «Registrar pago» con routerLink, así que necesita un Router.
	TestBed.configureTestingModule({ providers: [provideRouter([])] });
});

function fila(over: Partial<QuienDebeFila>): QuienDebeFila {
	return {
		estudianteId: 1,
		estudiante: 'Ana Pérez',
		salonId: 7,
		salon: '3A',
		categoria: 'ConDeuda',
		cuotasVencidas: 2,
		diasAtrasoMaximo: 40,
		deudaVencida: 300,
		ultimoPago: null,
		cuotas: [
			{ cargoId: 10, concepto: 'Pensión', cuota: 'Marzo', vencimiento: '2026-03-31', diasAtraso: 40, saldo: 300, recargo: 0 },
		],
		...over,
	};
}

function render(filas: QuienDebeFila[]): HTMLElement {
	const fixture = TestBed.createComponent(QuienesDebenTableComponent);
	fixture.componentRef.setInput('filas', filas);
	fixture.componentRef.setInput('total', filas.length);
	fixture.detectChanges();
	return fixture.nativeElement as HTMLElement;
}

describe('QuienesDebenTableComponent', () => {
	it('muestra «Sin pagos» cuando ultimoPago es null', () => {
		const el = render([fila({ ultimoPago: null })]);
		expect(el.querySelector('.ultimo-pago')?.textContent).toContain('Sin pagos');
	});

	it('muestra fecha y monto cuando hay último pago', () => {
		const el = render([fila({ ultimoPago: { fecha: '2026-10-05', monto: 150 } })]);
		const text = el.querySelector('.ultimo-pago')?.textContent ?? '';
		expect(text).not.toContain('Sin pagos');
		expect(text).toContain('150');
	});

	it('la categoría lleva etiqueta de texto en español, no solo color', () => {
		const el = render([fila({ categoria: 'PagoParcial' })]);
		expect(el.textContent).toContain('Pago parcial');
	});

	it('expande el detalle de cuotas al pulsar el botón', () => {
		const fixture = TestBed.createComponent(QuienesDebenTableComponent);
		fixture.componentRef.setInput('filas', [fila({})]);
		fixture.detectChanges();
		const el = fixture.nativeElement as HTMLElement;
		expect(el.querySelector('app-quienes-deben-cuotas')).toBeNull();
		(el.querySelector('.expand-btn') as HTMLButtonElement).click();
		fixture.detectChanges();
		expect(el.querySelector('app-quienes-deben-cuotas')?.textContent).toContain('Pensión');
	});

	it('«Último pago» no es ordenable', () => {
		const el = render([fila({})]);
		const ths = Array.from(el.querySelectorAll('th'));
		const ultimo = ths.find((th) => th.textContent?.includes('Último pago'));
		expect(ultimo?.querySelector('button')).toBeNull();
	});
});
