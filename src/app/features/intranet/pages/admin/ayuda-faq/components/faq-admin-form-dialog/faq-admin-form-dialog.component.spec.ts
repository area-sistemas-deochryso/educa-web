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
	capabilityCodigo: 'ASISTENCIA_ADMIN_PAGE_VIEW',
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

	describe('título por paso', () => {
		interface Emitted {
			request: { wizard: { pasos: { orden: number; titulo: string | null; texto: string }[] } | null };
		}

		function save(): Emitted {
			let emitted: Emitted | null = null;
			component.saveFaq.subscribe((e) => (emitted = e as unknown as Emitted));
			component.onSave();
			return emitted as unknown as Emitted;
		}

		function openWith(pasos: { orden: number; titulo?: string | null; texto: string }[]): void {
			fixture.componentRef.setInput('faq', {
				...FAQ_WITH_WIZARD,
				wizard: { titulo: null, pasos: pasos.map((p) => ({ imagenUrl: null, ...p })) },
			});
			fixture.detectChanges();
		}

		it('envía el título escrito en un paso y reenvía el de los demás', () => {
			openWith([
				{ orden: 1, titulo: 'Abrir el menú', texto: 'A' },
				{ orden: 2, titulo: null, texto: 'B' },
			]);
			component.updatePasoTitulo(1, 'Elegir el salón');

			expect(save().request.wizard?.pasos.map((p) => p.titulo)).toEqual(['Abrir el menú', 'Elegir el salón']);
		});

		it('un título vacío o solo espacios se envía como null, no como cadena vacía', () => {
			openWith([
				{ orden: 1, titulo: 'Algo', texto: 'A' },
				{ orden: 2, titulo: null, texto: 'B' },
			]);
			component.updatePasoTitulo(0, '   ');
			component.updatePasoTitulo(1, '');

			expect(save().request.wizard?.pasos.map((p) => p.titulo)).toEqual([null, null]);
		});

		it('limita el título a 120 caracteres en el campo', () => {
			expect(component.pasoTituloMaxLength).toBe(120);
			component.addPaso();
			fixture.detectChanges();

			// El dialog se monta en <body> (appendTo="body"), no dentro del fixture.
			const input = document.body.querySelector<HTMLInputElement>(
				'[data-info-anchor="admin-faq-form-paso-titulo-input"]',
			);
			expect(input?.maxLength).toBe(120);
		});

		it('el título viaja con su paso al subir, bajar o quitar', () => {
			openWith([
				{ orden: 1, titulo: 'Uno', texto: 'A' },
				{ orden: 2, titulo: 'Dos', texto: 'B' },
				{ orden: 3, titulo: 'Tres', texto: 'C' },
			]);

			component.movePaso(2, -1);
			expect(component.pasos().map((p) => p.titulo)).toEqual(['Uno', 'Tres', 'Dos']);

			component.removePaso(0);
			expect(component.pasos().map((p) => p.titulo)).toEqual(['Tres', 'Dos']);
			expect(component.pasos().map((p) => p.orden)).toEqual([1, 2]);
		});

		it('guardar una guía sin títulos no inventa ninguno', () => {
			openWith([
				{ orden: 1, texto: 'Primer paso. Detalle.' },
				{ orden: 2, titulo: null, texto: 'Segundo' },
			]);

			expect(save().request.wizard?.pasos.map((p) => p.titulo)).toEqual([null, null]);
		});

		it('guardar sin cambios conserva los títulos existentes', () => {
			openWith([{ orden: 1, titulo: 'Abrir', texto: 'A' }]);

			expect(save().request.wizard?.pasos[0].titulo).toBe('Abrir');
		});

		it('guardar renumera el orden aunque los datos vengan repetidos', () => {
			openWith([
				{ orden: 0, titulo: 'A', texto: 'x' },
				{ orden: 0, titulo: 'B', texto: 'y' },
				{ orden: 1, titulo: 'C', texto: 'z' },
			]);

			expect(save().request.wizard?.pasos.map((p) => p.orden)).toEqual([1, 2, 3]);
		});

		it('una FAQ sin guía no muestra ningún campo de título', () => {
			fixture.componentRef.setInput('faq', { ...FAQ_WITH_WIZARD, wizard: null });
			fixture.detectChanges();

			expect(document.body.querySelector('[data-info-anchor="admin-faq-form-paso-titulo-input"]')).toBeNull();
			expect(save().request.wizard).toBeNull();
		});
	});
});
