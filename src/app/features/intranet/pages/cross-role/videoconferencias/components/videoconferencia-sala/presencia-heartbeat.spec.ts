// * Tests for the moderator presence heartbeat helper.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PRESENCIA_INTERVAL_MS, startPresenciaHeartbeat } from './presencia-heartbeat';

describe('startPresenciaHeartbeat', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('sends one heartbeat immediately', () => {
		const enviar = vi.fn();
		startPresenciaHeartbeat(enviar);
		expect(enviar).toHaveBeenCalledTimes(1);
	});

	it('keeps sending on every interval', () => {
		const enviar = vi.fn();
		startPresenciaHeartbeat(enviar);

		vi.advanceTimersByTime(PRESENCIA_INTERVAL_MS * 3);

		expect(enviar).toHaveBeenCalledTimes(4);
	});

	it('stops sending once stopped', () => {
		const enviar = vi.fn();
		const stop = startPresenciaHeartbeat(enviar);

		stop();
		vi.advanceTimersByTime(PRESENCIA_INTERVAL_MS * 3);

		expect(enviar).toHaveBeenCalledTimes(1);
	});
});
