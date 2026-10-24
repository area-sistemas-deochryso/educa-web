// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CorrelationHubEventDto } from '../../models';
import { CorrelationHubEventsSectionComponent } from './correlation-hub-events-section.component';
// #endregion

const EVENTS: CorrelationHubEventDto[] = [
	{ hub: 'chathub', tipo: 'conexion_rechazada', fecha: '2026-10-24T10:00:00', connectionId: 'conn-1' },
	{ hub: 'asistenciahub', tipo: 'invocacion_error', fecha: '2026-10-24T10:00:05', metodo: 'Marcar', exceptionClass: 'HubException', userId: 7 },
];

// #region Tests
describe('CorrelationHubEventsSectionComponent', () => {
	let fixture: ComponentFixture<CorrelationHubEventsSectionComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({ imports: [CorrelationHubEventsSectionComponent] }).compileComponents();
		fixture = TestBed.createComponent(CorrelationHubEventsSectionComponent);
	});

	function root(): HTMLElement {
		fixture.detectChanges();
		return fixture.nativeElement as HTMLElement;
	}

	it('shows an explicit empty state instead of hiding the section', () => {
		const text = root().textContent ?? '';
		expect(text).toContain('Eventos de SignalR');
		expect(text).toContain('Sin eventos de SignalR registrados');
	});

	it('renders one row per event in the order received, with hub, type, method and exception class', () => {
		fixture.componentRef.setInput('items', EVENTS);

		const el = root();
		const rows = el.querySelectorAll('li');
		expect(rows).toHaveLength(2);
		expect(rows[0].textContent).toContain('chathub');
		expect(rows[0].textContent).toContain('Conexión rechazada');
		expect(rows[0].textContent).toContain('conn-1');
		expect(rows[1].textContent).toContain('Marcar');
		expect(rows[1].textContent).toContain('HubException');
		expect(el.textContent).not.toContain('Sin eventos de SignalR registrados');
	});

	it('does not render "undefined" or "null" for fields the BE omits', () => {
		fixture.componentRef.setInput('items', [{ hub: 'chathub', tipo: 'conexion_fallida', fecha: '2026-10-24T10:00:00' }]);

		const text = root().textContent ?? '';
		expect(text).not.toContain('undefined');
		expect(text).not.toContain('null');
		expect(root().querySelectorAll('.cell-mono')).toHaveLength(1);
	});

	it('shows the "sin sesión resuelta" notice only when the session was not resolved', () => {
		expect(root().textContent).not.toContain('Sin sesión resuelta');

		fixture.componentRef.setInput('sessionResolved', false);
		fixture.detectChanges();

		expect(fixture.nativeElement.textContent).toContain('Sin sesión resuelta: solo se muestran los eventos guardados con este id.');
	});
});
// #endregion
