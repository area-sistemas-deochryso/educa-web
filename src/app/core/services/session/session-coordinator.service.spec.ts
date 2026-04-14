// * Tests para SessionCoordinatorService — verifica coordinación multi-tab vía BroadcastChannel.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionCoordinatorService, SessionMessage } from './session-coordinator.service';
import { AuthService } from '@core/services/auth/auth.service';
import { AuthUser } from '@core/services/auth/auth.models';
// #endregion

// #region Mock BroadcastChannel controllable
interface MockChannel {
	name: string;
	postMessage: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
	onmessage: ((e: MessageEvent<SessionMessage>) => void) | null;
	// Helpers de test
	fire(msg: SessionMessage): void;
}

const channels: MockChannel[] = [];

class MockBroadcastChannel {
	onmessage: ((e: MessageEvent<SessionMessage>) => void) | null = null;
	postMessage = vi.fn();
	close = vi.fn(() => {
		const idx = channels.indexOf(this as unknown as MockChannel);
		if (idx >= 0) channels.splice(idx, 1);
	});

	constructor(public name: string) {
		const self = this as unknown as MockChannel;
		self.fire = (msg: SessionMessage) => {
			this.onmessage?.({ data: msg } as MessageEvent<SessionMessage>);
		};
		channels.push(self);
	}
}
// #endregion

// #region Tests
describe('SessionCoordinatorService', () => {
	let service: SessionCoordinatorService;
	let authMock: { currentUser: AuthUser | null };
	let originalBroadcastChannel: typeof globalThis.BroadcastChannel;

	beforeEach(() => {
		channels.length = 0;
		originalBroadcastChannel = globalThis.BroadcastChannel;
		(globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = MockBroadcastChannel;

		authMock = { currentUser: null };

		TestBed.configureTestingModule({
			providers: [
				SessionCoordinatorService,
				{ provide: AuthService, useValue: authMock },
			],
		});

		service = TestBed.inject(SessionCoordinatorService);
	});

	afterEach(() => {
		(globalThis as unknown as { BroadcastChannel: typeof globalThis.BroadcastChannel }).BroadcastChannel =
			originalBroadcastChannel;
	});

	// #region setup / teardown
	describe('setup / teardown', () => {
		it('abre BroadcastChannel con el nombre correcto en setup()', () => {
			service.setup();
			expect(channels).toHaveLength(1);
			expect(channels[0].name).toBe('educa-session');
		});

		it('no revienta si BroadcastChannel no está disponible (fallback graceful)', () => {
			(globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = undefined;
			expect(() => service.setup()).not.toThrow();
		});

		it('teardown() cierra el canal y futuros broadcast() son no-op', () => {
			service.setup();
			const channel = channels[0];
			service.teardown();
			expect(channel.close).toHaveBeenCalled();

			service.broadcast({ type: 'logout' });
			expect(channel.postMessage).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region broadcast
	describe('broadcast', () => {
		it('envía mensaje por el canal', () => {
			service.setup();
			const msg: SessionMessage = { type: 'refresh-done', timestamp: 123 };

			service.broadcast(msg);

			expect(channels[0].postMessage).toHaveBeenCalledWith(msg);
		});

		it('tolera postMessage que lanza (canal cerrado) sin propagar', () => {
			service.setup();
			channels[0].postMessage.mockImplementation(() => {
				throw new Error('channel closed');
			});

			expect(() => service.broadcast({ type: 'logout' })).not.toThrow();
		});

		it('es no-op si setup no fue llamado', () => {
			expect(() => service.broadcast({ type: 'logout' })).not.toThrow();
		});
	});
	// #endregion

	// #region message$ forwarding
	describe('message$', () => {
		it('re-emite cualquier mensaje recibido del canal', () => {
			service.setup();
			const received: SessionMessage[] = [];
			service.message$.subscribe((msg) => received.push(msg));

			const msg: SessionMessage = { type: 'refresh-done', timestamp: 999 };
			channels[0].fire(msg);

			expect(received).toEqual([msg]);
		});

		it('re-emite mensajes logout', () => {
			service.setup();
			const received: SessionMessage[] = [];
			service.message$.subscribe((msg) => received.push(msg));

			channels[0].fire({ type: 'logout' });

			expect(received).toEqual([{ type: 'logout' }]);
		});
	});
	// #endregion

	// #region cross-user detection
	describe('detección de login con usuario distinto', () => {
		it('re-emite mensaje login aunque haya usuario distinto (warning no bloquea)', () => {
			authMock.currentUser = {
				rol: 'Estudiante',
				nombreCompleto: 'Alice',
				entityId: 1,
				sedeId: 1,
			};

			service.setup();
			const received: SessionMessage[] = [];
			service.message$.subscribe((msg) => received.push(msg));

			// Otro tab hace login con otro usuario
			channels[0].fire({ type: 'login', entityId: 2, rol: 'Profesor' });

			expect(received).toHaveLength(1);
			expect(received[0]).toEqual({ type: 'login', entityId: 2, rol: 'Profesor' });
		});

		it('re-emite login del mismo usuario sin problema', () => {
			authMock.currentUser = {
				rol: 'Profesor',
				nombreCompleto: 'Bob',
				entityId: 5,
				sedeId: 1,
			};

			service.setup();
			const received: SessionMessage[] = [];
			service.message$.subscribe((msg) => received.push(msg));

			channels[0].fire({ type: 'login', entityId: 5, rol: 'Profesor' });

			expect(received).toHaveLength(1);
		});

		it('re-emite login cuando no hay usuario actual', () => {
			authMock.currentUser = null;

			service.setup();
			const received: SessionMessage[] = [];
			service.message$.subscribe((msg) => received.push(msg));

			channels[0].fire({ type: 'login', entityId: 10, rol: 'Director' });

			expect(received).toHaveLength(1);
		});
	});
	// #endregion
});
// #endregion
