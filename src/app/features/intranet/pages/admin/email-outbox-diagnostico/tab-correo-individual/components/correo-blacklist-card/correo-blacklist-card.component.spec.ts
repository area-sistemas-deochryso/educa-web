import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EmailDiagnosticoBlacklist } from '../../models/correo-individual.models';

import { CorreoBlacklistCardComponent } from './correo-blacklist-card.component';

function makeBlacklist(
	overrides: Partial<EmailDiagnosticoBlacklist> = {},
): EmailDiagnosticoBlacklist {
	return {
		estado: 'ACTIVO',
		motivoBloqueo: 'BOUNCE_5XX',
		intentosFallidos: 3,
		fechaPrimerFallo: '2026-04-01T08:00:00',
		fechaUltimoFallo: '2026-04-15T09:30:00',
		fechaReg: '2026-04-15T09:31:00',
		ultimoError: '550 user unknown',
		...overrides,
	};
}

describe('CorreoBlacklistCardComponent', () => {
	let fixture: ComponentFixture<CorreoBlacklistCardComponent>;
	let component: CorreoBlacklistCardComponent;
	let componentRef: ComponentRef<CorreoBlacklistCardComponent>;

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [CorreoBlacklistCardComponent] });
		fixture = TestBed.createComponent(CorreoBlacklistCardComponent);
		component = fixture.componentInstance;
		componentRef = fixture.componentRef;
	});

	it('estado ACTIVO: severity=danger y headline mencionan blacklist activa', () => {
		componentRef.setInput('blacklist', makeBlacklist({ estado: 'ACTIVO' }));
		fixture.detectChanges();

		expect(component.severity()).toBe('danger');
		expect(component.headline()).toContain('activa');
		const text = fixture.nativeElement.textContent ?? '';
		expect(text).toContain('BOUNCE_5XX');
		expect(text).toContain('550 user unknown');
	});

	it('estado DESPEJADO: severity=warn y headline indica que puede volver a enviarse', () => {
		componentRef.setInput('blacklist', makeBlacklist({ estado: 'DESPEJADO' }));
		fixture.detectChanges();

		expect(component.severity()).toBe('warn');
		expect(component.headline()).toContain('despejada');
		expect(component.headline()).toContain('volver a enviarse');
	});
});
