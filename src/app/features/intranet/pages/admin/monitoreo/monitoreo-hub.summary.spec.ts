import { describe, expect, it } from 'vitest';

import {
	HubExtras,
	initialHubExtras,
} from './models/monitoreo-hub-badges.models';
import { buildStats } from './monitoreo-hub.summary';

/**
 * Plan 43 Chat 1.1 (2026-05-11) — verifica que `buildStats` propaga el
 * `sourceChip` y `windowTooltip` desde el DTO BE a cada stat card de
 * correos. Cierra A1+B11 del feedback Cowork 2026-05-11.
 */
describe('buildStats (correos)', () => {
	function correosExtras(): HubExtras {
		return {
			...initialHubExtras(),
			outbox: {
				total: 5119,
				enviados: 5039,
				pendientes: 0,
				fallidos: 14,
				source: 'OutboxTotal',
				timeWindowLabel: 'Histórico completo',
			},
			deferFail: {
				current: 0,
				threshold: 5,
				percentUsed: 0,
				blacklistActivos: 3,
				last24hTotal: 100,
				last24hSent: 95,
				last24hFailedOther: 0,
				source: 'Outbox24h',
				timeWindowLabel: 'Últimas 24 h',
			},
		};
	}

	it('cada stat de outbox lleva sourceChip + windowTooltip provenientes del BE', () => {
		const stats = buildStats('correos', correosExtras());

		const labels = stats.map((s) => s.label);
		expect(labels).toEqual(['Enviados', 'Pendientes', 'Fallidos', 'En blacklist']);

		// Las 3 primeras stats (Enviados, Pendientes, Fallidos) consumen `outbox` —
		// deben llevar el chip "OutboxTotal" y la ventana "Histórico completo".
		for (const s of stats.slice(0, 3)) {
			expect(s.sourceChip).toBe('OutboxTotal');
			expect(s.windowTooltip).toBe('Histórico completo');
		}

		// La 4ta (En blacklist) viene de blacklist activos, no de outbox.
		expect(stats[3].sourceChip).toBe('Blacklist');
	});

	it('cae a labels default si BE no envía source/timeWindowLabel (back-compat)', () => {
		const extras = correosExtras();
		extras.outbox = { total: 1, enviados: 1, pendientes: 0, fallidos: 0 };
		const stats = buildStats('correos', extras);

		expect(stats[0].sourceChip).toBe('Outbox');
		expect(stats[0].windowTooltip).toBe('Histórico completo');
	});

	it('sin outbox devuelve arreglo vacío', () => {
		const stats = buildStats('correos', initialHubExtras());
		expect(stats).toEqual([]);
	});
});
