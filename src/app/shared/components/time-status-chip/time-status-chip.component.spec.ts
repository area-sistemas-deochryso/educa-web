import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TimeStatusChipComponent } from './time-status-chip.component';

function labelFor(start: string, end: string | null, today: string): string {
	const fixture = TestBed.createComponent(TimeStatusChipComponent);
	fixture.componentRef.setInput('start', start);
	fixture.componentRef.setInput('end', end);
	fixture.componentRef.setInput('today', today);
	fixture.detectChanges();
	return fixture.componentInstance.label();
}

describe('TimeStatusChipComponent', () => {
	it('Próximo antes del inicio', () => {
		expect(labelFor('2026-11-23', '2026-11-27', '2026-11-21')).toBe('Próximo');
	});

	it('En curso dentro del rango', () => {
		expect(labelFor('2026-11-23', '2026-11-27', '2026-11-25')).toBe('En curso');
	});

	it('permite reemplazar el texto de un estado', () => {
		const fixture = TestBed.createComponent(TimeStatusChipComponent);
		fixture.componentRef.setInput('start', '2026-11-23');
		fixture.componentRef.setInput('end', '2026-11-27');
		fixture.componentRef.setInput('today', '2026-11-25');
		fixture.componentRef.setInput('labels', { ongoing: 'Vigente' });
		fixture.detectChanges();
		expect(fixture.componentInstance.label()).toBe('Vigente');
	});

	it('Finalizado después del fin', () => {
		expect(labelFor('2026-11-20', null, '2026-11-21')).toBe('Finalizado');
	});
});
