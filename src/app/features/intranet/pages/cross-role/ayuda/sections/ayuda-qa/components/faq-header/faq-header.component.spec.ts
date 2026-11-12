import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';

import { FaqHeaderComponent } from './faq-header.component';

describe('FaqHeaderComponent', () => {
	let fixture: ComponentFixture<FaqHeaderComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [FaqHeaderComponent] });
		fixture = TestBed.createComponent(FaqHeaderComponent);
		fixture.componentRef.setInput('compact', false);
		fixture.componentRef.setInput('searchTerm', '');
		fixture.componentRef.setInput('modoVista', 'todas');
		fixture.componentRef.setInput('chips', [
			{ value: null, count: 5 },
			{ value: 'Profesor', count: 2 },
		]);
		fixture.componentRef.setInput('paraTiCount', 2);
		fixture.componentRef.setInput('todasCount', 5);
		fixture.componentRef.setInput('resultCount', 5);
		fixture.componentRef.setInput('populares', [
			{ id: 1, pregunta: '¿Cómo cambio mi contraseña?', respuesta: '', categoria: 'Común', wizard: null },
		]);
	});

	it('el modo activo es inequívoco y cada modo muestra su conteo', () => {
		fixture.detectChanges();

		const botones = fixture.debugElement.queryAll(By.css('.faq-seg__btn'));
		expect(botones.map((b) => b.nativeElement.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
		expect(botones[0].nativeElement.textContent).toContain('2');
		expect(botones[1].nativeElement.textContent).toContain('5');
	});

	it('estado inicial: buscador grande con «más consultadas»; compacto: barra con conteo de resultados', () => {
		fixture.detectChanges();
		expect(fixture.debugElement.query(By.css('.faq-popular'))).not.toBeNull();
		expect(fixture.debugElement.query(By.css('.faq-header--compact'))).toBeNull();

		fixture.componentRef.setInput('compact', true);
		fixture.componentRef.setInput('resultCount', 1);
		fixture.detectChanges();

		expect(fixture.debugElement.query(By.css('.faq-popular'))).toBeNull();
		expect(fixture.debugElement.query(By.css('.faq-header--compact'))).not.toBeNull();
		expect(fixture.debugElement.query(By.css('.faq-header__meta')).nativeElement.textContent).toContain('1 resultado');
	});

	it('emite búsqueda, modo, categoría y pregunta elegida', () => {
		const emitted: unknown[] = [];
		fixture.componentInstance.searchChange.subscribe((v) => emitted.push(['q', v]));
		fixture.componentInstance.modoChange.subscribe((v) => emitted.push(['modo', v]));
		fixture.componentInstance.categoriaChange.subscribe((v) => emitted.push(['cat', v]));
		fixture.componentInstance.faqSelected.subscribe((v) => emitted.push(['faq', v]));
		fixture.detectChanges();

		const input = fixture.debugElement.query(By.css('.faq-search__input')).nativeElement as HTMLInputElement;
		input.value = 'nota';
		input.dispatchEvent(new Event('input'));
		fixture.debugElement.queryAll(By.css('.faq-seg__btn'))[0].nativeElement.click();
		fixture.debugElement.queryAll(By.css('.faq-chip'))[1].nativeElement.click();
		fixture.debugElement.query(By.css('.faq-popular__item')).nativeElement.click();

		expect(emitted).toEqual([['q', 'nota'], ['modo', 'para-ti'], ['cat', 'Profesor'], ['faq', 1]]);
	});
});
