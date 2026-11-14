// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { StickyFilterBarComponent } from './sticky-filter-bar.component';
// #endregion

describe('StickyFilterBarComponent', () => {
	let fixture: ComponentFixture<StickyFilterBarComponent>;
	let component: StickyFilterBarComponent;

	const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

	beforeEach(() => {
		fixture = TestBed.createComponent(StickyFilterBarComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('watch', null);
		fixture.componentRef.setInput('searchTerm', '');
		fixture.componentRef.setInput('activeFilters', 0);
		fixture.detectChanges();
	});

	it('arranca oculta y fuera del orden de tabulación', () => {
		const bar = root().querySelector('.sfb')!;
		expect(bar.classList.contains('sfb--on')).toBe(false);
		expect(bar.getAttribute('aria-hidden')).toBe('true');
		expect(bar.hasAttribute('inert')).toBe(true);
	});

	it('emite el texto que se escribe en el buscador', () => {
		const emitted: string[] = [];
		component.searchChange.subscribe((v) => emitted.push(v));
		const input = root().querySelector<HTMLInputElement>('.sfb__input')!;
		input.value = 'arte';
		input.dispatchEvent(new Event('input'));
		expect(emitted).toEqual(['arte']);
	});

	it('el panel de filtros se abre con el botón y se cierra con Escape', () => {
		expect(root().querySelector('.sfb__panel')).toBeNull();
		root().querySelector<HTMLButtonElement>('.sfb__btn')!.click();
		fixture.detectChanges();
		expect(root().querySelector('.sfb__panel')).not.toBeNull();
		component.onEscape();
		fixture.detectChanges();
		expect(root().querySelector('.sfb__panel')).toBeNull();
	});

	it('muestra la cantidad de filtros activos y ofrece limpiarlos', () => {
		fixture.componentRef.setInput('activeFilters', 2);
		fixture.detectChanges();
		expect(root().querySelector('.sfb__count')?.textContent?.trim()).toBe('2');

		let cleared = 0;
		component.clearFilters.subscribe(() => cleared++);
		root().querySelector<HTMLButtonElement>('.sfb__btn')!.click();
		fixture.detectChanges();
		root().querySelector<HTMLButtonElement>('.sfb__clear')!.click();
		expect(cleared).toBe(1);
	});

	it('sin filtros activos no muestra el contador ni «Limpiar filtros»', () => {
		root().querySelector<HTMLButtonElement>('.sfb__btn')!.click();
		fixture.detectChanges();
		expect(root().querySelector('.sfb__count')).toBeNull();
		expect(root().querySelector('.sfb__clear')).toBeNull();
	});
});

describe('StickyFilterBarComponent sin filtros', () => {
	it('oculta el botón «Filtros» cuando showFilters es falso', () => {
		const fixture = TestBed.createComponent(StickyFilterBarComponent);
		fixture.componentRef.setInput('watch', null);
		fixture.componentRef.setInput('searchTerm', '');
		fixture.componentRef.setInput('showFilters', false);
		fixture.detectChanges();
		expect((fixture.nativeElement as HTMLElement).querySelector('.sfb__btn')).toBeNull();
	});
});
