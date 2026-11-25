import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { PagoCorte } from '@data/models';
import { FotoFechaSelectorComponent } from './foto-fecha-selector.component';

const CORTES: PagoCorte[] = [
	{ anio: 2026, mes: 9, fecha: '2026-09-30T00:00:00' },
	{ anio: 2026, mes: 10, fecha: '2026-10-30T00:00:00' },
	{ anio: 2026, mes: 11, fecha: '2026-11-30T00:00:00' },
];
const HOY = '2026-11-25';

function crear(seleccion: string) {
	const fixture = TestBed.createComponent(FotoFechaSelectorComponent);
	fixture.componentRef.setInput('seleccion', seleccion);
	fixture.componentRef.setInput('cortes', CORTES);
	fixture.componentRef.setInput('hoy', HOY);
	fixture.detectChanges();
	return fixture;
}

describe('FotoFechaSelectorComponent', () => {
	it('«A hoy» no muestra la lista de cortes', () => {
		const el: HTMLElement = crear('hoy').nativeElement;

		expect(el.querySelector('[data-testid=selector-foto]')).toBeNull();
		expect(el.querySelector('[data-testid=fecha-foto]')?.textContent).toContain('(hoy)');
	});

	it('el desplegable queda en el corte elegido y no en el primero de la lista', () => {
		const el: HTMLElement = crear('2026-10-30').nativeElement;
		const select = el.querySelector<HTMLSelectElement>('[data-testid=selector-foto]');

		expect(select?.value).toBe('2026-10-30');
	});

	it('un corte que aún no llega aparece deshabilitado', () => {
		const el: HTMLElement = crear('2026-10-30').nativeElement;
		const opciones = [...el.querySelectorAll<HTMLOptionElement>('option')];

		expect(opciones.map((o) => o.disabled)).toEqual([false, false, true]);
	});

	it('al pasar a «Al corte» sin corte previo elige el más reciente que ya llegó', () => {
		const fixture = crear('hoy');
		const emitidos: string[] = [];
		fixture.componentInstance.seleccionChange.subscribe((v) => emitidos.push(v));

		(fixture.componentInstance as unknown as { onModo(m: string): void }).onModo('corte');

		expect(emitidos).toEqual(['2026-10-30']);
	});

	it('«A hoy» vuelve a la selección de hoy y «Al corte» regresa al último corte mirado', () => {
		const fixture = crear('2026-09-30');
		const emitidos: string[] = [];
		const comp = fixture.componentInstance as unknown as { onSelect(v: string): void; onModo(m: string): void };
		fixture.componentInstance.seleccionChange.subscribe((v) => emitidos.push(v));

		comp.onSelect('2026-09-30');
		comp.onModo('hoy');
		comp.onModo('corte');

		expect(emitidos).toEqual(['2026-09-30', 'hoy', '2026-09-30']);
	});

	it('un corte futuro no se puede elegir', () => {
		const fixture = crear('hoy');
		const emitidos: string[] = [];
		fixture.componentInstance.seleccionChange.subscribe((v) => emitidos.push(v));

		(fixture.componentInstance as unknown as { onSelect(v: string): void }).onSelect('2026-11-30');

		expect(emitidos).toEqual([]);
	});
});
