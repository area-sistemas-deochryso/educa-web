import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EmailDashboardDiaDto } from '../models/email-dashboard-dia.models';
import { EmailOutboxDashboardDiaStore } from './email-outbox-dashboard-dia.store';

function makeDto(overrides: Partial<EmailDashboardDiaDto> = {}): EmailDashboardDiaDto {
	return {
		fecha: '2026-04-23',
		resumen: {
			enviados: 10,
			fallidos: 2,
			pendientes: 1,
			reintentando: 0,
			formatoInvalido: 1,
			sinCorreo: 0,
			blacklisteados: 0,
			throttleHost: 0,
			otrosFallos: 0,
			deferFailContadorCpanel: 3,
		},
		porHora: [
			{ hora: 8, enviados: 5, fallidos: 1, queLlegaronAlSmtp: 6 },
		],
		porTipo: [
			{ tipo: 'ASISTENCIA', enviados: 10, fallidos: 2, pendientes: 1 },
		],
		bouncesAcumulados: [
			{
				destinatarioMasked: 'j***z@dominio.com',
				bouncesAcumulados: 2,
				ultimoIntento: '2026-04-23T10:00:00',
				ultimoError: '5.1.1 mailbox unknown',
			},
		],
		generatedAt: '2026-04-23T11:00:00',
		...overrides,
	};
}

describe('EmailOutboxDashboardDiaStore', () => {
	let store: EmailOutboxDashboardDiaStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [EmailOutboxDashboardDiaStore],
		});
		store = TestBed.inject(EmailOutboxDashboardDiaStore);
	});

	it('starts empty', () => {
		expect(store.dto()).toBeNull();
		expect(store.loading()).toBe(false);
		expect(store.error()).toBeNull();
		expect(store.fechaConsulta()).toBeNull();
	});

	it('derives resumen / porHora / porTipo / bouncesAcumulados / generatedAt / fecha from dto', () => {
		const dto = makeDto();
		store.setDto(dto);

		expect(store.resumen()).toEqual(dto.resumen);
		expect(store.porHora()).toEqual(dto.porHora);
		expect(store.porTipo()).toEqual(dto.porTipo);
		expect(store.bouncesAcumulados()).toEqual(dto.bouncesAcumulados);
		expect(store.generatedAt()).toBe(dto.generatedAt);
		expect(store.fecha()).toBe(dto.fecha);
	});

	it('returns safe defaults when dto is null', () => {
		expect(store.resumen()).toBeNull();
		expect(store.porHora()).toEqual([]);
		expect(store.porTipo()).toEqual([]);
		expect(store.bouncesAcumulados()).toEqual([]);
		expect(store.generatedAt()).toBeNull();
		expect(store.fecha()).toBeNull();
	});

	it('vm reflects all readable fields', () => {
		const dto = makeDto();
		store.setDto(dto);
		store.setLoading(true);
		store.setFechaConsulta('2026-04-22');

		const vm = store.vm();
		expect(vm.dto).toBe(dto);
		expect(vm.loading).toBe(true);
		expect(vm.fechaConsulta).toBe('2026-04-22');
		expect(vm.resumen).toEqual(dto.resumen);
		expect(vm.generatedAt).toBe(dto.generatedAt);
	});
});
