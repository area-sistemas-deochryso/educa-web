import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { FormSectionComponent } from './form-section.component';

function render(inputs: Record<string, unknown>): HTMLElement {
	const fixture = TestBed.createComponent(FormSectionComponent);
	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
	fixture.detectChanges();
	return fixture.nativeElement as HTMLElement;
}

describe('FormSectionComponent', () => {
	it('muestra el encabezado', () => {
		expect(render({ heading: 'Vigencia' }).querySelector('.form-section__title')?.textContent).toBe('Vigencia');
	});

	it('omite la ayuda cuando no se pasa', () => {
		expect(render({ heading: 'Vigencia' }).querySelector('.form-section__hint')).toBeNull();
	});

	it('muestra la ayuda cuando se pasa', () => {
		const el = render({ heading: 'Vigencia', hint: 'Cuándo se ve' });
		expect(el.querySelector('.form-section__hint')?.textContent).toBe('Cuándo se ve');
	});
});
