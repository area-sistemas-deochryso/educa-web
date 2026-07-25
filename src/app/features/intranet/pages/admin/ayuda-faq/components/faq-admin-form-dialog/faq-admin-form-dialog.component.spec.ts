import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { FaqAdminDto } from '../../models/faq-admin.models';
import { FaqAdminFormDialogComponent } from './faq-admin-form-dialog.component';

const FAQ_WITH_WIZARD: FaqAdminDto = {
	id: 1,
	pregunta: '¿Cómo registro asistencia?',
	respuesta: 'Ve a...',
	categoria: 'Asistencia',
	capabilityId: 5,
	capabilityCodigo: 'ADMIN_ASISTENCIAS',
	estado: true,
	wizard: {
		titulo: 'Registrar asistencia',
		pasos: [
			{ orden: 1, texto: 'Paso 1', imagenUrl: null },
			{ orden: 2, texto: 'Paso 2', imagenUrl: null },
		],
	},
	rowVersion: 'AAAA',
};

describe('FaqAdminFormDialogComponent', () => {
	let fixture: ComponentFixture<FaqAdminFormDialogComponent>;
	let component: FaqAdminFormDialogComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [FaqAdminFormDialogComponent] });
		fixture = TestBed.createComponent(FaqAdminFormDialogComponent);
		component = fixture.componentInstance;
		fixture.componentRef.setInput('visible', true);
		fixture.componentRef.setInput('faq', null);
		fixture.detectChanges();
	});

	it('arranca en modo crear con el formulario vacío', () => {
		expect(component.isEditing()).toBe(false);
		expect(component.pregunta()).toBe('');
		expect(component.pasos()).toEqual([]);
		expect(component.isValid()).toBe(false);
	});

	it('precarga el formulario al recibir una FAQ para editar', () => {
		fixture.componentRef.setInput('faq', FAQ_WITH_WIZARD);
		fixture.detectChanges();

		expect(component.isEditing()).toBe(true);
		expect(component.pregunta()).toBe(FAQ_WITH_WIZARD.pregunta);
		expect(component.pasos()).toHaveLength(2);
	});

	it('addPaso agrega un paso con el siguiente orden', () => {
		component.addPaso();
		component.addPaso();

		expect(component.pasos().map((p) => p.orden)).toEqual([1, 2]);
	});

	it('removePaso quita el paso y renumera el orden de los restantes', () => {
		component.addPaso();
		component.addPaso();
		component.addPaso();

		component.removePaso(1); // quita el paso #2

		expect(component.pasos()).toHaveLength(2);
		expect(component.pasos().map((p) => p.orden)).toEqual([1, 2]);
	});

	it('movePaso reordena dos pasos adyacentes', () => {
		component.addPaso();
		component.updatePasoTexto(0, 'Primero');
		component.addPaso();
		component.updatePasoTexto(1, 'Segundo');

		component.movePaso(0, 1);

		expect(component.pasos().map((p) => p.texto)).toEqual(['Segundo', 'Primero']);
		expect(component.pasos().map((p) => p.orden)).toEqual([1, 2]);
	});

	it('onSave emite CrearFaqRequest con wizard=null cuando no hay pasos', () => {
		component.pregunta.set('Pregunta');
		component.respuesta.set('Respuesta');

		let emitted: unknown = null;
		component.saveFaq.subscribe((e) => (emitted = e));
		component.onSave();

		expect(emitted).toEqual({
			id: null,
			request: { pregunta: 'Pregunta', respuesta: 'Respuesta', categoria: null, capabilityId: null, wizard: null },
		});
	});

	it('onSave emite ActualizarFaqRequest con rowVersion cuando edita', () => {
		fixture.componentRef.setInput('faq', FAQ_WITH_WIZARD);
		fixture.detectChanges();

		let emitted: { id: number | null; request: { rowVersion?: string } } | null = null;
		component.saveFaq.subscribe((e) => (emitted = e as typeof emitted));
		component.onSave();

		expect(emitted?.id).toBe(1);
		expect(emitted?.request.rowVersion).toBe('AAAA');
	});

	it('onSave no emite si la pregunta o respuesta están vacías', () => {
		let emitted = false;
		component.saveFaq.subscribe(() => (emitted = true));
		component.onSave();

		expect(emitted).toBe(false);
	});
});
