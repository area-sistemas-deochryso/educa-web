import { describe, expect, it } from 'vitest';

import { WalEntry } from './models';
import { inFlightOutcome } from './wal-in-flight.utils';

const entry: WalEntry = {
	id: 'if-1',
	timestamp: 0,
	operation: 'CREATE',
	resourceType: 'reporte-usuario',
	endpoint: '/api/x',
	method: 'POST',
	payload: {},
	status: 'IN_FLIGHT',
	retries: 0,
	maxRetries: 2,
} as WalEntry;

describe('inFlightOutcome', () => {
	it('devuelve RETRYING con la misma entry y el próximo intento', () => {
		const updated = { ...entry, status: 'PENDING', retries: 2, nextRetryAt: 500 } as WalEntry;
		expect(inFlightOutcome(entry, updated)).toEqual({
			status: 'RETRYING',
			entryId: 'if-1',
			retries: 2,
			nextRetryAt: 500,
		});
	});

	it('devuelve VERIFICATION_PENDING cuando la entry quedó en VERIFICACION_PENDIENTE', () => {
		const updated = { ...entry, status: 'VERIFICACION_PENDIENTE' } as WalEntry;
		expect(inFlightOutcome(entry, updated)).toEqual({
			status: 'VERIFICATION_PENDING',
			entryId: 'if-1',
		});
	});
});
