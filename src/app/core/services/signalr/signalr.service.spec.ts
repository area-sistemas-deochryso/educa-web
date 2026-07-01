// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HubConnectionState } from '@microsoft/signalr';

import { SignalRService } from './signalr.service';
// #endregion

// #region Mock setup

interface MockHubConnection {
	state: HubConnectionState;
	start: ReturnType<typeof vi.fn>;
	stop: ReturnType<typeof vi.fn>;
	invoke: ReturnType<typeof vi.fn>;
	on: ReturnType<typeof vi.fn>;
	off: ReturnType<typeof vi.fn>;
	onclose: ReturnType<typeof vi.fn>;
	onreconnecting: ReturnType<typeof vi.fn>;
	onreconnected: ReturnType<typeof vi.fn>;
	handlers: Map<string, (...args: unknown[]) => void>;
}

let mockConn: MockHubConnection;

function createMockConnection(): MockHubConnection {
	const handlers = new Map<string, (...args: unknown[]) => void>();
	return {
		state: HubConnectionState.Disconnected,
		start: vi.fn().mockImplementation(() => {
			mockConn.state = HubConnectionState.Connected;
			return Promise.resolve();
		}),
		stop: vi.fn().mockResolvedValue(undefined),
		invoke: vi.fn().mockResolvedValue(undefined),
		on: vi.fn().mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
			handlers.set(event, cb);
		}),
		off: vi.fn().mockImplementation((event: string) => {
			handlers.delete(event);
		}),
		onclose: vi.fn(),
		onreconnecting: vi.fn(),
		onreconnected: vi.fn(),
		handlers,
	};
}

// The mock factory runs once at import time. We use a closure that defers
// to `mockConn` (reassigned in beforeEach) so each test gets fresh state.
vi.mock('@microsoft/signalr', () => {
	const HCS = {
		Disconnected: 0,
		Connecting: 1,
		Connected: 2,
		Disconnecting: 3,
		Reconnecting: 4,
	};

	class FakeHubConnectionBuilder {
		withUrl() { return this; }
		withAutomaticReconnect() { return this; }
		build() { return mockConn; }
	}

	return {
		HubConnectionBuilder: FakeHubConnectionBuilder,
		HubConnectionState: HCS,
		HttpTransportType: { LongPolling: 4 },
	};
});

// #endregion

// #region Helpers

function getCloseCb(): (err?: Error) => void {
	const calls = mockConn.onclose.mock.calls;
	return calls[calls.length - 1][0] as (err?: Error) => void;
}

function getReconnectingCb(): () => void {
	const calls = mockConn.onreconnecting.mock.calls;
	return calls[calls.length - 1][0] as () => void;
}

function getReconnectedCb(): () => Promise<void> {
	const calls = mockConn.onreconnected.mock.calls;
	return calls[calls.length - 1][0] as () => Promise<void>;
}

// #endregion

// #region Tests
describe('SignalRService', () => {
	let service: SignalRService;

	beforeEach(() => {
		mockConn = createMockConnection();

		TestBed.configureTestingModule({
			providers: [SignalRService],
		});

		service = TestBed.inject(SignalRService);
	});

	// #region connect()
	describe('connect()', () => {
		it('creates connection, starts it, and sets connected to true', async () => {
			expect(service.connected()).toBe(false);

			await service.connect();

			expect(mockConn.start).toHaveBeenCalledOnce();
			expect(service.connected()).toBe(true);
		});

		it('no-ops if already connected', async () => {
			await service.connect();
			mockConn.start.mockClear();

			await service.connect();

			expect(mockConn.start).not.toHaveBeenCalled();
		});

		it('throws if connection start fails', async () => {
			mockConn.start.mockRejectedValueOnce(new Error('Network error'));

			await expect(service.connect()).rejects.toThrow('Network error');
			expect(service.connected()).toBe(false);
		});
	});
	// #endregion

	// #region disconnect()
	describe('disconnect()', () => {
		it('stops connection and resets state', async () => {
			await service.connect();
			expect(service.connected()).toBe(true);

			await service.disconnect();

			expect(mockConn.stop).toHaveBeenCalledOnce();
			expect(service.connected()).toBe(false);
		});

		it('clears joined groups and removes handlers', async () => {
			await service.connect();
			await service.joinConversacion(1);

			await service.disconnect();

			expect(mockConn.off).toHaveBeenCalledWith('NuevoMensaje');
			expect(mockConn.off).toHaveBeenCalledWith('UserTyping');
		});

		it('no-ops if no connection exists', async () => {
			await service.disconnect();
			expect(mockConn.stop).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region joinConversacion
	describe('joinConversacion()', () => {
		it('invokes JoinConversacion on the hub', async () => {
			await service.connect();

			await service.joinConversacion(42);

			expect(mockConn.invoke).toHaveBeenCalledWith('JoinConversacion', 42);
		});

		it('prevents duplicate joins for the same conversation', async () => {
			await service.connect();

			await service.joinConversacion(42);
			await service.joinConversacion(42);

			const joinCalls = mockConn.invoke.mock.calls.filter(
				(c) => c[0] === 'JoinConversacion' && c[1] === 42,
			);
			expect(joinCalls).toHaveLength(1);
		});

		it('connects first if not connected', async () => {
			await service.joinConversacion(10);

			expect(mockConn.start).toHaveBeenCalledOnce();
			expect(mockConn.invoke).toHaveBeenCalledWith('JoinConversacion', 10);
		});
	});
	// #endregion

	// #region leaveConversacion
	describe('leaveConversacion()', () => {
		it('invokes LeaveConversacion and removes from tracked groups', async () => {
			await service.connect();
			await service.joinConversacion(5);

			await service.leaveConversacion(5);

			expect(mockConn.invoke).toHaveBeenCalledWith('LeaveConversacion', 5);
		});

		it('no-ops if not in the group', async () => {
			await service.connect();
			mockConn.invoke.mockClear();

			await service.leaveConversacion(99);

			expect(mockConn.invoke).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region leaveAll
	describe('leaveAll()', () => {
		it('leaves all joined groups', async () => {
			await service.connect();
			await service.joinConversacion(1);
			await service.joinConversacion(2);
			await service.joinConversacion(3);
			mockConn.invoke.mockClear();

			await service.leaveAll();

			expect(mockConn.invoke).toHaveBeenCalledWith('LeaveConversacion', 1);
			expect(mockConn.invoke).toHaveBeenCalledWith('LeaveConversacion', 2);
			expect(mockConn.invoke).toHaveBeenCalledWith('LeaveConversacion', 3);
		});
	});
	// #endregion

	// #region onEvent (dynamic handler registration)
	describe('onEvent()', () => {
		it('registers handler on connection when connected', async () => {
			await service.connect();
			const cb = vi.fn();

			service.onEvent('CustomEvent', cb);

			expect(mockConn.on).toHaveBeenCalledWith('CustomEvent', cb);
		});

		it('queues handler and attaches on next connect', async () => {
			const cb = vi.fn();
			service.onEvent('CustomEvent', cb);

			const callsBefore = mockConn.on.mock.calls.filter((c) => c[0] === 'CustomEvent');
			expect(callsBefore).toHaveLength(0);

			await service.connect();

			const callsAfter = mockConn.on.mock.calls.filter((c) => c[0] === 'CustomEvent');
			expect(callsAfter.length).toBeGreaterThanOrEqual(1);
		});

		it('returns unsubscribe function that removes the handler', async () => {
			await service.connect();
			const cb = vi.fn();

			const unsub = service.onEvent('CustomEvent', cb);
			unsub();

			expect(mockConn.off).toHaveBeenCalledWith('CustomEvent', cb);
		});
	});
	// #endregion

	// #region Reconnection behavior
	describe('reconnection behavior', () => {
		it('onreconnecting sets connected=false, reconnecting=true', async () => {
			await service.connect();

			expect(service.connected()).toBe(true);
			expect(service.reconnecting()).toBe(false);

			getReconnectingCb()();

			expect(service.connected()).toBe(false);
			expect(service.reconnecting()).toBe(true);
		});

		it('onreconnected sets connected=true, reconnecting=false and re-joins groups', async () => {
			await service.connect();
			await service.joinConversacion(7);

			getReconnectingCb()();
			expect(service.reconnecting()).toBe(true);

			mockConn.invoke.mockClear();
			await getReconnectedCb()();

			expect(service.connected()).toBe(true);
			expect(service.reconnecting()).toBe(false);
			expect(mockConn.invoke).toHaveBeenCalledWith('JoinConversacion', 7);
		});
	});
	// #endregion

	// #region disconnected computed signal
	describe('disconnected computed', () => {
		it('is true when wasConnected && !connected && !reconnecting', async () => {
			expect(service.disconnected()).toBe(false);

			await service.connect();
			expect(service.disconnected()).toBe(false);

			getCloseCb()();

			expect(service.connected()).toBe(false);
			expect(service.disconnected()).toBe(true);
		});

		it('is false during reconnection (wasConnected but reconnecting)', async () => {
			await service.connect();

			getReconnectingCb()();

			expect(service.reconnecting()).toBe(true);
			expect(service.disconnected()).toBe(false);
		});
	});
	// #endregion

	// #region NuevoMensaje normalization
	describe('NuevoMensaje normalization', () => {
		it('normalizes PascalCase payload to camelCase interface', async () => {
			const received: unknown[] = [];
			service.nuevoMensaje$.subscribe((m) => received.push(m));

			await service.connect();

			const handler = mockConn.handlers.get('NuevoMensaje');
			expect(handler).toBeDefined();

			handler!({
				Id: 10,
				RemitenteDni: '12345678',
				RemitenteNombre: 'Test User',
				Contenido: 'Hello',
				FechaEnvio: '2026-01-01',
				EsMio: true,
			});

			expect(received).toHaveLength(1);
			expect(received[0]).toEqual({
				id: 10,
				remitenteDni: '12345678',
				remitenteNombre: 'Test User',
				contenido: 'Hello',
				fechaEnvio: '2026-01-01',
				esMio: true,
			});
		});
	});
	// #endregion

	// #region onclose auth error
	describe('onclose with auth error', () => {
		it('stops reconnection on 401/Unauthorized', async () => {
			await service.connect();

			mockConn.stop.mockClear();

			getCloseCb()(new Error("Status code '401' Unauthorized"));

			expect(mockConn.stop).toHaveBeenCalledOnce();
			expect(service.connected()).toBe(false);
		});

		it('does not stop connection on non-auth close errors', async () => {
			await service.connect();

			mockConn.stop.mockClear();

			getCloseCb()(new Error('Network timeout'));

			expect(mockConn.stop).not.toHaveBeenCalled();
		});
	});
	// #endregion
});
// #endregion
