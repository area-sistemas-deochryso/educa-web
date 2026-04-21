import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { RateLimitEventListaDto } from '../../models';
import { RateLimitTableComponent } from './rate-limit-table.component';

describe('RateLimitTableComponent', () => {
	let fixture: ComponentFixture<RateLimitTableComponent>;
	let component: RateLimitTableComponent;

	const sample: RateLimitEventListaDto = {
		id: 42,
		correlationId: '0123456789ABCDEF0123',
		endpoint: '/api/reports/heavy',
		httpMethod: 'GET',
		policy: 'heavy',
		usuarioDniMasked: '***5678',
		usuarioRol: 'Director',
		limiteEfectivo: null,
		tokensConsumidos: null,
		fueRechazado: true,
		ipAddress: '10.0.0.1',
		fecha: '2026-04-21T10:00:00',
	};

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [RateLimitTableComponent] });
		fixture = TestBed.createComponent(RateLimitTableComponent);
		component = fixture.componentInstance;
	});

	it('truncateCorrelation trunca a 12 chars con ellipsis', () => {
		expect(component.truncateCorrelation('0123456789ABCDEF')).toBe('0123456789AB…');
	});

	it('truncateCorrelation devuelve em dash para null', () => {
		expect(component.truncateCorrelation(null)).toBe('—');
	});

	it('truncateCorrelation no trunca si es corto', () => {
		expect(component.truncateCorrelation('abc')).toBe('abc');
	});

	it('onRowSelect emite rowSelected con el item', () => {
		let emitted: RateLimitEventListaDto | null = null;
		component.rowSelected.subscribe((v) => (emitted = v));

		component.onRowSelect(sample);

		expect(emitted).toEqual(sample);
	});
});
