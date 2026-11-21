import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { DateBadgeComponent } from './date-badge.component';

function render(inputs: Record<string, unknown>): HTMLElement {
	const fixture = TestBed.createComponent(DateBadgeComponent);
	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
	fixture.detectChanges();
	return fixture.nativeElement as HTMLElement;
}

describe('DateBadgeComponent', () => {
	it('muestra día y mes abreviado', () => {
		const el = render({ date: '2026-11-23' });
		expect(el.querySelector('.day')?.textContent).toBe('23');
		expect(el.querySelector('.sub')?.textContent).toBe('Nov');
	});

	it('muestra el día de la semana', () => {
		const el = render({ date: '2026-11-23', sub: 'weekday' });
		expect(el.querySelector('.sub')?.textContent).toBe('Lun');
	});

	it('ignora la hora de un ISO completo', () => {
		const el = render({ date: '2026-12-04T00:00:00' });
		expect(el.querySelector('.day')?.textContent).toBe('4');
	});

	it('aplica el tipo como data-kind', () => {
		const el = render({ date: '2026-12-08', kind: 'holiday' });
		expect(el.querySelector('.date-badge')?.getAttribute('data-kind')).toBe('holiday');
	});

	it('no renderiza con fecha inválida', () => {
		expect(render({ date: 'x' }).querySelector('.date-badge')).toBeNull();
	});
});
