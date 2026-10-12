// * Tests for SalonMensajeriaFacade — el eco SignalR del propio mensaje no debe duplicar la burbuja.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { SignalRService } from '@core/services/signalr';
import { SalonMensajeriaApiService } from './mensajeria-api.service';
import { SalonMensajeriaFacade } from './mensajeria.facade';
import { SalonMensajeriaStore } from './mensajeria.store';

// #endregion

// #region Fixtures
const SESSION_DNI = '11111111';
const EFFECTIVE_DNI = '22222222';

const foroVacio = { id: 1, asunto: 'Foro: 5TO A', mensajes: [] } as never;

interface WalConfig {
	payload?: { mensajeInicial?: string; horarioId?: number };
	onCommit: (response: { mensajeId: number }) => void;
	optimistic: { apply: () => void };
}
// #endregion

describe('SalonMensajeriaFacade — foro y eco propio', () => {
	let facade: SalonMensajeriaFacade;
	let store: SalonMensajeriaStore;
	let echo$: Subject<unknown>;
	let walConfig: WalConfig;
	let obtenerForo: ReturnType<typeof vi.fn>;

	const echo = (id: number, contenido: string, remitenteDni = EFFECTIVE_DNI) =>
		echo$.next({ id, contenido, remitenteDni, remitenteNombre: 'Profe', fechaEnvio: '2026-10-12T10:00:00' });

	beforeEach(() => {
		echo$ = new Subject();
		obtenerForo = vi.fn().mockReturnValue(of(foroVacio));
		TestBed.configureTestingModule({
			providers: [
				SalonMensajeriaStore,
				SalonMensajeriaFacade,
				{ provide: SalonMensajeriaApiService, useValue: { obtenerForo, obtenerConversacion: () => of(foroVacio) } },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showWarning: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: { execute: (cfg: WalConfig) => { walConfig = cfg; cfg.optimistic.apply(); } } },
				{
					provide: SignalRService,
					useValue: {
						nuevoMensaje$: echo$.asObservable(),
						joinConversacion: vi.fn().mockResolvedValue(undefined),
						leaveConversacion: vi.fn().mockResolvedValue(undefined),
					},
				},
				{ provide: AuthService, useValue: { currentUser: { dni: SESSION_DNI, nombreCompleto: 'Admin' } } },
			],
		});
		facade = TestBed.inject(SalonMensajeriaFacade);
		store = TestBed.inject(SalonMensajeriaStore);
		facade.initForo('5TO A', [], 10);
	});

	it('un foro nuevo se crea sin mensaje inicial y con el horario', () => {
		obtenerForo.mockReturnValue(of(null));
		facade.initForo('5TO B', ['33333333'], 11);

		expect(walConfig.payload?.mensajeInicial).toBeUndefined();
		expect(walConfig.payload?.horarioId).toBe(11);
	});

	it('un foro vacío no tiene mensajes', () => {
		expect(store.mensajes()).toHaveLength(0);
	});

	it('el eco llega antes del commit con otro DNI (ver como): una sola burbuja', () => {
		facade.enviarMensaje(1, 'Hola');
		echo(50, 'Hola');
		walConfig.onCommit({ mensajeId: 50 });

		expect(store.mensajes()).toHaveLength(1);
		expect(store.mensajes()[0]).toMatchObject({ id: 50, esMio: true });
	});

	it('el eco llega después del commit con otro DNI: una sola burbuja', () => {
		facade.enviarMensaje(1, 'Hola');
		walConfig.onCommit({ mensajeId: 50 });
		echo(50, 'Hola');

		expect(store.mensajes()).toHaveLength(1);
		expect(store.mensajes()[0]).toMatchObject({ id: 50, esMio: true });
	});

	it('un mensaje de otra persona con distinto contenido se agrega', () => {
		facade.enviarMensaje(1, 'Hola');
		echo(51, 'Buenos días', '33333333');

		expect(store.mensajes()).toHaveLength(2);
	});
});
