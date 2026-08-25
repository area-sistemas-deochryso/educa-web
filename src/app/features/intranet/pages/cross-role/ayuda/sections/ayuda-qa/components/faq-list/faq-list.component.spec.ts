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
	let component: FaqListComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [FaqListComponent] });
		fixture = TestBed.createComponent(FaqListComponent);
		component = fixture.componentInstance;
	});

	it('una FAQ sin wizard no muestra el botón "ir"', () => {
		fixture.componentRef.setInput('faqs', [FAQ_SIN_WIZARD]);
		fixture.detectChanges();

		const button = fixture.debugElement.query(By.css('edu-button'));
		expect(button).toBeNull();
	});

	it('una FAQ con wizard muestra el botón "ir"', () => {
		fixture.componentRef.setInput('faqs', [FAQ_CON_WIZARD]);
		fixture.detectChanges();

		const button = fixture.debugElement.query(By.css('edu-button'));
		expect(button).not.toBeNull();
	});

	it('onOpenWizard emite la FAQ y detiene la propagación del click', () => {
		let emitted: FaqDto | null = null;
		component.openWizard.subscribe((faq) => (emitted = faq));
		const event = { stopPropagation: () => {} } as Event;

		component.onOpenWizard(FAQ_CON_WIZARD, event);

		expect(emitted).toEqual(FAQ_CON_WIZARD);
	});
});
