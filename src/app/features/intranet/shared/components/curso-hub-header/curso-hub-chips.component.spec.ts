// #region Imports
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { CursoHubChip, CursoHubChipsComponent } from './curso-hub-chips.component';
// #endregion

const CHIPS: CursoHubChip[] = [
	{ key: 'archivos', icon: 'pi pi-paperclip', label: 'Archivos', count: 3, ariaLabel: 'Ver todos los archivos' },
	{ key: 'calificaciones', icon: 'pi pi-chart-bar', label: 'Calificaciones', count: null, ariaLabel: 'Ir a calificaciones' },
];

describe('CursoHubChipsComponent', () => {
	function create(inputs: { chips: CursoHubChip[]; loading?: boolean; skeletonCount?: number }) {
		const fixture = TestBed.createComponent(CursoHubChipsComponent);
		fixture.componentRef.setInput('chips', inputs.chips);
		if (inputs.loading !== undefined) fixture.componentRef.setInput('loading', inputs.loading);
		if (inputs.skeletonCount !== undefined) fixture.componentRef.setInput('skeletonCount', inputs.skeletonCount);
		fixture.detectChanges();
		return fixture;
	}

	const buttons = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLButtonElement>('button.hub-chip'));

	it('renders one button per chip with its count and label', () => {
		const fixture = create({ chips: CHIPS });
		const [files] = buttons(fixture.nativeElement);

		expect(buttons(fixture.nativeElement)).toHaveLength(2);
		expect(files.querySelector('.hub-chip__count')?.textContent?.trim()).toBe('3');
		expect(files.querySelector('.hub-chip__label')?.textContent?.trim()).toBe('Archivos');
	});

	it('names each button for screen readers and never submits a form', () => {
		const fixture = create({ chips: CHIPS });

		expect(buttons(fixture.nativeElement).map((b) => b.getAttribute('aria-label'))).toEqual([
			'Ver todos los archivos',
			'Ir a calificaciones',
		]);
		expect(buttons(fixture.nativeElement).every((b) => b.type === 'button')).toBe(true);
	});

	it('shows a dash while a count is still loading', () => {
		const fixture = create({ chips: CHIPS });
		const [, cal] = buttons(fixture.nativeElement);

		expect(cal.querySelector('.hub-chip__count')?.textContent?.trim()).toBe('—');
	});

	it('emits the key of the clicked chip', () => {
		const fixture = create({ chips: CHIPS });
		const onClick = vi.fn();
		fixture.componentInstance.chipClick.subscribe(onClick);

		buttons(fixture.nativeElement)[1].click();

		expect(onClick).toHaveBeenCalledExactlyOnceWith('calificaciones');
	});

	it('reserves the space with skeletons instead of chips while loading', () => {
		const fixture = create({ chips: CHIPS, loading: true, skeletonCount: 4 });

		expect(buttons(fixture.nativeElement)).toHaveLength(0);
		expect(fixture.nativeElement.querySelectorAll('app-skeleton-loader')).toHaveLength(4);
	});
});
