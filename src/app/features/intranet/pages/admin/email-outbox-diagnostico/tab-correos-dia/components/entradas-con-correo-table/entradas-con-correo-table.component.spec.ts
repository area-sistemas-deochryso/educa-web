import { provideRouter } from '@angular/router';
import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EntradaConCorreoEnviado } from '../../models/correos-dia.models';

import { EntradasConCorreoTableComponent } from './entradas-con-correo-table.component';

function makeEntradaConCorreo(
	overrides: Partial<EntradaConCorreoEnviado> = {},
): EntradaConCorreoEnviado {
	return {
		asistenciaId: 1,
		estudianteId: 100,
		dniMasked: '***1234',
		nombreCompleto: 'PEREZ, JUAN',
		salon: '5to Primaria A',
		graOrden: 8,
		horaEntrada: '2026-04-27T07:30:00',
		emailOutboxId: 5001,
		correoApoderadoMasked: 'e***o@dominio.com',
		estado: 'SENT',
		fechaEnvio: '2026-04-27T07:30:05',
		remitente: 'sistemas1@dominio.com',
		correlationId: 'abc12345-fede-cafe-0001',
		...overrides,
	};
}

describe('EntradasConCorreoTableComponent', () => {
	let fixture: ComponentFixture<EntradasConCorreoTableComponent>;
	let componentRef: ComponentRef<EntradasConCorreoTableComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [EntradasConCorreoTableComponent],
			providers: [provideRouter([])],
		});
		fixture = TestBed.createComponent(EntradasConCorreoTableComponent);
		componentRef = fixture.componentRef;
	});

	it('renderiza filas con DNI enmascarado, nombre y correo enmascarado', () => {
		componentRef.setInput('data', [
			makeEntradaConCorreo({
				dniMasked: '***5678',
				nombreCompleto: 'GARCIA, ANA',
				correoApoderadoMasked: 'a***a@dominio.com',
			}),
			makeEntradaConCorreo({
				dniMasked: '***9012',
				nombreCompleto: 'LOPEZ, LUIS',
				correoApoderadoMasked: 'l***z@dominio.com',
			}),
		]);
		fixture.detectChanges();

		const text = fixture.nativeElement.textContent ?? '';
		expect(text).toContain('***5678');
		expect(text).toContain('GARCIA, ANA');
		expect(text).toContain('a***a@dominio.com');
		expect(text).toContain('***9012');
		expect(text).toContain('LOPEZ, LUIS');
		expect(text).toContain('l***z@dominio.com');
	});

	it('muestra empty state cuando data() es array vacío', () => {
		componentRef.setInput('data', []);
		fixture.detectChanges();

		const text = fixture.nativeElement.textContent ?? '';
		expect(text).toContain('Aún no hay entradas con correo enviado hoy');
	});

	it('renderiza tag de severity success por fila cuando hay data', () => {
		componentRef.setInput('data', [
			makeEntradaConCorreo({ estado: 'SENT' }),
			makeEntradaConCorreo({ estado: 'SENT' }),
		]);
		fixture.detectChanges();

		const successTags = fixture.nativeElement.querySelectorAll('.p-tag-success');
		expect(successTags.length).toBeGreaterThan(0);
	});
});
