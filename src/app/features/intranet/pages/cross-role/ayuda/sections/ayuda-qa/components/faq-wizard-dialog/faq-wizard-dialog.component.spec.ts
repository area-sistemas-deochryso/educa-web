import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { FaqWizardDto } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';
import { FaqWizardDialogComponent } from './faq-wizard-dialog.component';

const WIZARD: FaqWizardDto = {
	titulo: 'Registrar asistencia',
	pasos: [
		{ orden: 1, texto: 'Paso 1', imagenUrl: null },
		{ orden: 2, texto: 'Paso 2', imagenUrl: null },
		{ orden: 3, texto: 'Paso 3', imagenUrl: null },
	],
};

describe('FaqWizardDialogComponent', () => {
	let fixture: ComponentFixture<FaqWizardDialogComponent>;
	let component: FaqWizardDialogComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [FaqWizardDialogComponent] });
		fixture = TestBed.createComponent(FaqWizardDialogComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('visible', true);
		fixture.componentRef.setInput('wizard', WIZARD);
	});

	it('arranca en el paso 0', () => {
		expect(component.activeStep()).toBe(0);
		expect(component.isLastStep()).toBe(false);
	});

	it('goToStep avanza y detecta el último paso', () => {
		component.goToStep(2);
		expect(component.activeStep()).toBe(2);
		expect(component.isLastStep()).toBe(true);
	});

	it('goToStep no permite pasar el último paso', () => {
		component.goToStep(99);
		expect(component.activeStep()).toBe(2);
	});

	it('goToStep no permite ir antes del primer paso', () => {
		component.goToStep(-5);
		expect(component.activeStep()).toBe(0);
	});

	it('onHide resetea el paso activo y emite visibleChange(false)', () => {
		component.goToStep(2);
		let emitted: boolean | null = null;
		component.visibleChange.subscribe((v) => (emitted = v));

		component.onHide();

		expect(component.activeStep()).toBe(0);
		expect(emitted).toBe(false);
	});
});
