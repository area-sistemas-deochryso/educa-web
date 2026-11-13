// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { FaqStickyBarComponent } from './faq-sticky-bar.component';
// #endregion

describe('FaqStickyBarComponent', () => {
	let fixture: ComponentFixture<FaqStickyBarComponent>;
	let component: FaqStickyBarComponent;

	beforeEach(() => {
		fixture = TestBed.createComponent(FaqStickyBarComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('searchTerm', '');
		fixture.componentRef.setInput('modoVista', 'todas');
		fixture.componentRef.setInput('categoria', null);
		fixture.componentRef.setInput('chips', [
			{ value: null, count: 47 },
			{ value: 'Profesor', count: 12 },
		]);
		fixture.componentRef.setInput('paraTiCount', 25);
		fixture.componentRef.setInput('todasCount', 47);
		fixture.detectChanges();
	});

	const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

	it('muestra los conteos de «Para ti» y «Todas»', () => {
		const text = root().textContent ?? '';
		expect(text).toContain('Para ti');
		expect(text).toContain('25');
		expect(text).toContain('47');
	});

	it('el menú de categorías está cerrado hasta que se pulsa el botón', () => {
		expect(root().querySelector('.sbar__menu')).toBeNull();
		root().querySelector<HTMLButtonElement>('.sbar__catbtn')!.click();
		fixture.detectChanges();
		expect(root().querySelector('.sbar__menu')).not.toBeNull();
	});

	it('elegir una categoría la emite y cierra el menú', () => {
		const emitted: (string | null)[] = [];
		component.categoriaChange.subscribe((v) => emitted.push(v));
		root().querySelector<HTMLButtonElement>('.sbar__catbtn')!.click();
		fixture.detectChanges();
		const items = root().querySelectorAll<HTMLButtonElement>('.sbar__item');
		items[1].click();
		fixture.detectChanges();
		expect(emitted).toEqual(['Profesor']);
		expect(root().querySelector('.sbar__menu')).toBeNull();
	});

	it('emite el texto que se escribe en el buscador', () => {
		const emitted: string[] = [];
		component.searchChange.subscribe((v) => emitted.push(v));
		const input = root().querySelector<HTMLInputElement>('.sbar__input')!;
		input.value = 'asistencia';
		input.dispatchEvent(new Event('input'));
		expect(emitted).toEqual(['asistencia']);
	});

	it('Escape cierra el menú', () => {
		component.toggleMenu();
		fixture.detectChanges();
		component.onEscape();
		fixture.detectChanges();
		expect(component.menuOpen()).toBe(false);
	});
});
