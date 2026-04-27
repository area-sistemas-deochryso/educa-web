import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChangeGroupStatusDialogComponent } from './change-group-status-dialog.component';
import { ErrorGroupLista } from '../../models';

function makeGroup(estado: 'NUEVO' | 'RESUELTO' | 'IGNORADO' | 'VISTO' = 'NUEVO'): ErrorGroupLista {
	return {
		id: 1,
		fingerprintCorto: 'abc',
		severidad: 'ERROR',
		mensajeRepresentativo: 'm',
		url: '/api/x',
		httpStatus: 500,
		errorCode: null,
		origen: 'BACKEND',
		estado,
		primeraFecha: '2026-04-25T10:00:00',
		ultimaFecha: '2026-04-25T11:00:00',
		contadorTotal: 1,
		contadorPostResolucion: 0,
		rowVersion: 'AAAA',
	};
}

describe('ChangeGroupStatusDialogComponent', () => {
	let fixture: ComponentFixture<ChangeGroupStatusDialogComponent>;
	let component: ChangeGroupStatusDialogComponent;
	let componentRef: ComponentRef<ChangeGroupStatusDialogComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [ChangeGroupStatusDialogComponent],
			providers: [provideNoopAnimations()],
		});
		fixture = TestBed.createComponent(ChangeGroupStatusDialogComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;
	});

	it('estadoOptions desde NUEVO incluye todos los destinos válidos sin el actual', () => {
		componentRef.setInput('group', makeGroup('NUEVO'));
		fixture.detectChanges();
		const values = component.estadoOptions().map((o) => o.value);
		expect(values).toEqual(['VISTO', 'EN_PROGRESO', 'RESUELTO', 'IGNORADO']);
	});

	it('estadoOptions desde RESUELTO solo permite reabrir a NUEVO', () => {
		componentRef.setInput('group', makeGroup('RESUELTO'));
		fixture.detectChanges();
		expect(component.estadoOptions().map((o) => o.value)).toEqual(['NUEVO']);
	});

	it('estadoOptions desde IGNORADO solo permite reabrir a NUEVO', () => {
		componentRef.setInput('group', makeGroup('IGNORADO'));
		fixture.detectChanges();
		expect(component.estadoOptions().map((o) => o.value)).toEqual(['NUEVO']);
	});

	it('canSubmit=false sin estado seleccionado', () => {
		componentRef.setInput('group', makeGroup('NUEVO'));
		fixture.detectChanges();
		expect(component.canSubmit()).toBe(false);
	});

	it('canSubmit=true con estado válido y observación dentro del cap', () => {
		componentRef.setInput('group', makeGroup('NUEVO'));
		fixture.detectChanges();
		component.onEstadoChange('VISTO');
		component.onObservacionChange('hola');
		expect(component.canSubmit()).toBe(true);
	});

	it('onConfirm emite el dto con rowVersion del grupo y observación trimeada', () => {
		const group = makeGroup('NUEVO');
		componentRef.setInput('group', group);
		fixture.detectChanges();
		const spy = vi.fn();
		component.confirmStatus.subscribe(spy);
		component.onEstadoChange('VISTO');
		component.onObservacionChange('  ok  ');
		component.onConfirm();
		expect(spy).toHaveBeenCalledWith({
			group,
			dto: { estado: 'VISTO', observacion: 'ok', rowVersion: 'AAAA' },
		});
	});

	it('onConfirm con observación vacía manda null', () => {
		componentRef.setInput('group', makeGroup('NUEVO'));
		fixture.detectChanges();
		const spy = vi.fn();
		component.confirmStatus.subscribe(spy);
		component.onEstadoChange('VISTO');
		component.onConfirm();
		expect(spy).toHaveBeenCalledWith({
			group: expect.any(Object),
			dto: { estado: 'VISTO', observacion: null, rowVersion: 'AAAA' },
		});
	});

	it('reset al abrir el dialog (visible true)', () => {
		componentRef.setInput('group', makeGroup('NUEVO'));
		componentRef.setInput('visible', false);
		fixture.detectChanges();
		component.onEstadoChange('VISTO');
		component.onObservacionChange('algo');

		componentRef.setInput('visible', true);
		fixture.detectChanges();
		expect(component.estado()).toBeNull();
		expect(component.observacion()).toBe('');
	});
});
