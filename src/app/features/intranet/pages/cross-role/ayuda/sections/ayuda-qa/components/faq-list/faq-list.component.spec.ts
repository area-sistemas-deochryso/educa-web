import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, beforeEach } from 'vitest';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { FaqListComponent } from './faq-list.component';

const FAQ_SIN_WIZARD: FaqDto = {
	id: 1,
	pregunta: '¿Cómo cambio mi contraseña?',
	respuesta: 'Ve a tu perfil...',
	categoria: 'Cuenta',
	wizard: null,
};

const FAQ_CON_WIZARD: FaqDto = {
	id: 2,
	pregunta: '¿Cómo registro asistencia?',
	respuesta: 'Ve a...',
	categoria: 'Asistencia',
	wizard: { titulo: 'Registrar asistencia', pasos: [{ orden: 1, texto: 'Paso 1', imagenUrl: null }] },
};

describe('FaqListComponent', () => {
	let fixture: ComponentFixture<FaqListComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [FaqListComponent] });
		fixture = TestBed.createComponent(FaqListComponent);
		fixture.componentRef.setInput('faqs', [FAQ_SIN_WIZARD, FAQ_CON_WIZARD]);
	});

	it('agrupa por categoría y solo marca con indicador de guía a la FAQ con wizard', () => {
		fixture.detectChanges();

		expect(fixture.debugElement.queryAll(By.css('.faq-categoria'))).toHaveLength(2);
		expect(fixture.debugElement.queryAll(By.css('.faq-item__guia'))).toHaveLength(1);
	});

	it('emite el id de la pregunta elegida', () => {
		let emitted: number | null = null;
		fixture.componentInstance.faqSelected.subscribe((id) => (emitted = id));
		fixture.detectChanges();

		const items = fixture.debugElement.queryAll(By.css('.faq-item'));
		items.find((d) => d.nativeElement.textContent.includes('registro asistencia'))?.nativeElement.click();

		expect(emitted).toBe(2);
	});

	it('solo la pregunta seleccionada queda marcada y la lista conserva su orden', () => {
		fixture.componentRef.setInput('selectedId', 2);
		fixture.detectChanges();
		const antes = fixture.debugElement.queryAll(By.css('.faq-item')).map((d) => d.nativeElement.textContent.trim());

		fixture.componentRef.setInput('selectedId', 1);
		fixture.detectChanges();
		const items = fixture.debugElement.queryAll(By.css('.faq-item'));

		expect(items.filter((d) => d.nativeElement.classList.contains('faq-item--on'))).toHaveLength(1);
		expect(items.map((d) => d.nativeElement.textContent.trim())).toEqual(antes);
	});

	it('resalta las coincidencias del término en la pregunta', () => {
		fixture.componentRef.setInput('term', 'contraseña');
		fixture.detectChanges();

		const marks = fixture.debugElement.queryAll(By.css('.faq-item__mark'));
		expect(marks).toHaveLength(1);
		expect(marks[0].nativeElement.textContent).toBe('contraseña');
	});
});
