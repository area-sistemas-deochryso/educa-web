import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { EventTypeMarkerComponent } from './event-type-marker.component';

function render(kind: string, label = ''): HTMLElement {
	const fixture = TestBed.createComponent(EventTypeMarkerComponent);
	fixture.componentRef.setInput('kind', kind);
	fixture.componentRef.setInput('label', label);
	fixture.detectChanges();
	return (fixture.nativeElement as HTMLElement).querySelector('.marker') as HTMLElement;
}

describe('EventTypeMarkerComponent', () => {
	it('expone el tipo como data-kind', () => {
		expect(render('holiday').getAttribute('data-kind')).toBe('holiday');
	});

	it('muestra un tipo desconocido como other', () => {
		expect(render('feriado').getAttribute('data-kind')).toBe('other');
	});

	it('es decorativo sin label', () => {
		const el = render('academic');
		expect(el.getAttribute('aria-hidden')).toBe('true');
		expect(el.getAttribute('role')).toBeNull();
	});

	it('es una imagen accesible con label', () => {
		const el = render('sports', 'Deportivo');
		expect(el.getAttribute('role')).toBe('img');
		expect(el.getAttribute('aria-label')).toBe('Deportivo');
		expect(el.getAttribute('aria-hidden')).toBeNull();
	});
});
