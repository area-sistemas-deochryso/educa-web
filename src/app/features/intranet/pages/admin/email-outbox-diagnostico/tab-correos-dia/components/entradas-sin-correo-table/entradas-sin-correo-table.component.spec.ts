import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EntradaSinCorreoEnviado } from '../../models/correos-dia.models';

import { EntradasSinCorreoTableComponent } from './entradas-sin-correo-table.component';

function makeEntrada(
	overrides: Partial<EntradaSinCorreoEnviado> = {},
): EntradaSinCorreoEnviado {
	return {
		asistenciaId: 1,
		estudianteId: 100,
		dniMasked: '***1234',
		nombreCompleto: 'PEREZ, JUAN',
		salon: '5to Primaria A',
		graOrden: 8,
		horaEntrada: '2026-04-27T07:30:00',
		razon: 'SIN_CORREO',
		tipoFallo: null,
		...overrides,
	};
}

describe('EntradasSinCorreoTableComponent', () => {
	let fixture: ComponentFixture<EntradasSinCorreoTableComponent>;
	let component: EntradasSinCorreoTableComponent;
	let componentRef: ComponentRef<EntradasSinCorreoTableComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [EntradasSinCorreoTableComponent] });
		fixture = TestBed.createComponent(EntradasSinCorreoTableComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;
	});

	it('razonSeverity mapea cada razón a la severity esperada', () => {
		componentRef.setInput('data', []);
		fixture.detectChanges();

		expect(component.razonSeverity('SIN_CORREO')).toBe('warn');
		expect(component.razonSeverity('PENDIENTE')).toBe('warn');
		expect(component.razonSeverity('BLACKLISTED')).toBe('danger');
		expect(component.razonSeverity('FALLIDO')).toBe('danger');
		expect(component.razonSeverity('SIN_RASTRO')).toBe('danger');
	});

	it('isCritical solo es true para BLACKLISTED, FALLIDO y SIN_RASTRO', () => {
		componentRef.setInput('data', []);
		fixture.detectChanges();

		expect(component.isCritical('BLACKLISTED')).toBe(true);
		expect(component.isCritical('FALLIDO')).toBe(true);
		expect(component.isCritical('SIN_RASTRO')).toBe(true);
		expect(component.isCritical('SIN_CORREO')).toBe(false);
		expect(component.isCritical('PENDIENTE')).toBe(false);
	});

	it('renderiza filas con DNI enmascarado y nombre del estudiante', () => {
		componentRef.setInput('data', [
			makeEntrada({ dniMasked: '***5678', nombreCompleto: 'GARCIA, ANA' }),
			makeEntrada({ dniMasked: '***9012', nombreCompleto: 'LOPEZ, LUIS', razon: 'BLACKLISTED' }),
		]);
		fixture.detectChanges();

		const text = fixture.nativeElement.textContent ?? '';
		expect(text).toContain('***5678');
		expect(text).toContain('GARCIA, ANA');
		expect(text).toContain('***9012');
		expect(text).toContain('LOPEZ, LUIS');
	});
});
