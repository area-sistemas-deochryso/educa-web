import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorGroupLista } from '../../models';
import { ErrorGroupCardComponent } from './error-group-card.component';

function makeGroup(overrides: Partial<ErrorGroupLista> = {}): ErrorGroupLista {
	return {
		id: 1,
		fingerprintCorto: 'abc123',
		severidad: 'CRITICAL',
		mensajeRepresentativo: 'NullReferenceException at UserService',
		url: '/api/users/1',
		httpStatus: 500,
		errorCode: 'INV-USR-01',
		origen: 'BACKEND',
		estado: 'NUEVO',
		primeraFecha: '2026-04-25T10:00:00',
		ultimaFecha: '2026-04-25T11:00:00',
		contadorTotal: 12,
		contadorPostResolucion: 0,
		rowVersion: 'AAAAAAAAB9E=',
		...overrides,
	};
}

describe('ErrorGroupCardComponent', () => {
	let fixture: ComponentFixture<ErrorGroupCardComponent>;
	let component: ErrorGroupCardComponent;
	let componentRef: ComponentRef<ErrorGroupCardComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [ErrorGroupCardComponent],
		});
		fixture = TestBed.createComponent(ErrorGroupCardComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;
	});

	it('renderiza mensaje, severidad badge y contador', () => {
		componentRef.setInput('group', makeGroup());
		fixture.detectChanges();

		const text = fixture.nativeElement.textContent ?? '';
		expect(text).toContain('NullReferenceException at UserService');
		expect(text).toContain('CRITICAL');
		expect(text).toContain('12');
		expect(text).toContain('INV-USR-01');
	});

	it('renderiza badge "+N" cuando contadorPostResolucion > 0', () => {
		componentRef.setInput('group', makeGroup({ contadorPostResolucion: 4 }));
		fixture.detectChanges();

		const text = fixture.nativeElement.textContent ?? '';
		expect(component.hasPostResolucion()).toBe(true);
		expect(text).toContain('+4');
	});

	it('emite cardClick al hacer click en el host', () => {
		const spy = vi.fn();
		componentRef.setInput('group', makeGroup());
		component.cardClick.subscribe(spy);
		fixture.detectChanges();

		(fixture.nativeElement as HTMLElement).click();

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
	});
});
