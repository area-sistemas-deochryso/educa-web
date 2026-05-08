import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CorrelationStore } from './correlation.store';
import { CorrelationSnapshot, SECTION_DEFENSIVE_CAP } from '../models';

function buildSnapshot(over: Partial<CorrelationSnapshot> = {}): CorrelationSnapshot {
	return {
		correlationId: 'abc-1',
		generatedAt: '2026-05-08T12:00:00',
		errorLogs: [],
		rateLimitEvents: [],
		reportesUsuario: [],
		emailOutbox: [],
		...over,
	};
}

describe('CorrelationStore — Plan 41 F1', () => {
	let store: CorrelationStore;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		store = TestBed.inject(CorrelationStore);
	});

	describe('timelineEvents', () => {
		it('returns empty array when snapshot is null', () => {
			expect(store.timelineEvents()).toEqual([]);
		});

		it('mixes the 4 arrays and orders by fecha descending', () => {
			store.setSnapshot(
				buildSnapshot({
					errorLogs: [
						{
							id: 1,
							severidad: 'ERROR',
							mensaje: 'a',
							url: '/x',
							httpMethod: 'GET',
							httpStatus: 500,
							errorCode: null,
							usuarioDniMasked: null,
							usuarioRol: null,
							plataforma: 'web',
							fecha: '2026-05-08T10:00:00',
						},
					],
					rateLimitEvents: [
						{
							id: 2,
							endpoint: '/y',
							httpMethod: 'POST',
							policy: 'reports',
							usuarioDniMasked: null,
							usuarioRol: null,
							limiteEfectivo: 5,
							tokensConsumidos: 6,
							fueRechazado: true,
							fecha: '2026-05-08T12:00:00',
						},
					],
					reportesUsuario: [
						{
							id: 3,
							tipo: 'X',
							descripcionResumen: 'd',
							propuestaResumen: null,
							url: '/z',
							estado: 'NUEVO',
							plataforma: 'web',
							usuarioDniMasked: null,
							usuarioRol: null,
							usuarioNombre: null,
							fechaReg: '2026-05-08T09:00:00',
						},
					],
					emailOutbox: [
						{
							id: 4,
							tipo: 'ASISTENCIA',
							estado: 'SENT',
							destinatarioMasked: 'a***@x.com',
							asunto: 'asunto',
							entidadOrigen: null,
							entidadId: null,
							intentos: 1,
							ultimoErrorResumen: null,
							tipoFallo: null,
							fechaEnvio: '2026-05-08T11:00:00',
							fechaReg: '2026-05-08T10:55:00',
						},
					],
				}),
			);

			const events = store.timelineEvents();
			expect(events).toHaveLength(4);
			// orden esperado por fecha desc: rate-limit (12) > outbox (11, fechaEnvio) > error (10) > reporte (9)
			expect(events.map((e) => e.kind)).toEqual(['rate-limit', 'outbox', 'error', 'reporte']);
		});

		it('outbox uses fechaReg when fechaEnvio is null', () => {
			store.setSnapshot(
				buildSnapshot({
					emailOutbox: [
						{
							id: 1,
							tipo: 'ASISTENCIA',
							estado: 'PENDING',
							destinatarioMasked: 'a***@x.com',
							asunto: 'asunto',
							entidadOrigen: null,
							entidadId: null,
							intentos: 0,
							ultimoErrorResumen: null,
							tipoFallo: null,
							fechaEnvio: null,
							fechaReg: '2026-05-08T08:00:00',
						},
					],
				}),
			);

			const events = store.timelineEvents();
			expect(events).toHaveLength(1);
			expect(events[0].fecha).toBe('2026-05-08T08:00:00');
		});
	});

	describe('hasDefensiveCap', () => {
		it('is false when all sections are below the cap', () => {
			expect(store.hasDefensiveCap()).toBe(false);
		});

		it('is true when any section reaches SECTION_DEFENSIVE_CAP', () => {
			const items = Array.from({ length: SECTION_DEFENSIVE_CAP }, (_, i) => ({
				id: i,
				severidad: 'ERROR',
				mensaje: '',
				url: '',
				httpMethod: null,
				httpStatus: null,
				errorCode: null,
				usuarioDniMasked: null,
				usuarioRol: null,
				plataforma: 'web',
				fecha: '2026-05-08T10:00:00',
			}));

			store.setSnapshot(buildSnapshot({ errorLogs: items }));
			expect(store.hasDefensiveCap()).toBe(true);
		});
	});
});
