import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';

import { FaqDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { FaqDetailComponent } from './faq-detail.component';

const FAQ_SIN_WIZARD: FaqDto = { id: 1, pregunta: '¿Cómo cambio mi contraseña?', respuesta: 'Ve a tu perfil.', categoria: 'Común', wizard: null };
const FAQ_CON_WIZARD: FaqDto = {
	id: 2,
	pregunta: '¿Cómo registro asistencia?',
	respuesta: 'Ve a Asistencias.',
	categoria: 'Profesor',
	wizard: { titulo: 'Registrar', pasos: [{ orden: 1, texto: 'Paso 1', imagenUrl: null }] },
};

describe('FaqDetailComponent', () => {
	let fixture: ComponentFixture<FaqDetailComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [FaqDetailComponent] });
		fixture = TestBed.createComponent(FaqDetailComponent);
	});

	it('una FAQ sin wizard no muestra el bloque de guía', () => {
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.detectChanges();

		expect(fixture.debugElement.query(By.css('.faq-detail__guia'))).toBeNull();
	});

	it('una FAQ con wizard muestra la guía y emite la FAQ al abrirla', () => {
		let emitted: FaqDto | null = null;
		fixture.componentInstance.openWizard.subscribe((f) => (emitted = f));
		fixture.componentRef.setInput('faq', FAQ_CON_WIZARD);
		fixture.detectChanges();

		fixture.debugElement.query(By.css('.faq-detail__guia button')).nativeElement.click();

		expect(emitted).toEqual(FAQ_CON_WIZARD);
	});

	it('«Volver a la lista» emite back', () => {
		let backs = 0;
		fixture.componentInstance.back.subscribe(() => backs++);
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.detectChanges();

		fixture.debugElement.query(By.css('.faq-detail__back')).nativeElement.click();

		expect(backs).toBe(1);
	});

	it('registrar feedback reemplaza los botones por el agradecimiento', () => {
		fixture.componentRef.setInput('faq', FAQ_SIN_WIZARD);
		fixture.detectChanges();

		fixture.componentInstance.registrarFeedback(1, 'util');
		fixture.detectChanges();

		expect(fixture.debugElement.query(By.css('.faq-detail__confirm--util'))).not.toBeNull();
	});
});
