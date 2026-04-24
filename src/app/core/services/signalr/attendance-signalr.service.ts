import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { logger } from '@core/helpers';
import { environment } from '@config/environment';

// #region Types
export interface SignalRAsistenciaEvent {
	dni: string;
	nombre: string;
	tipo: 'entrada' | 'salida';
	hora: string;
	sede: string;
}
// #endregion

@Injectable({ providedIn: 'root' })
export class AttendanceSignalRService {
	// #region Estado privado
	private connection: signalR.HubConnection | null = null;
	private readonly _connected = signal(false);
	// #endregion

	// #region Lecturas públicas
	readonly connected = this._connected.asReadonly();
	// #endregion

	// #region Event subjects
	private readonly asistenciaRegistradaSubject = new Subject<SignalRAsistenciaEvent>();

	readonly asistenciaRegistrada$ = this.asistenciaRegistradaSubject.asObservable();
	// #endregion

	// #region Connection sharing — Plan 24 Chat 3

	/**
	 * Garantiza que el hub esté conectado y devuelve la conexión viva para que
	 * consumidores del mismo hub (ej: CrossChexSyncStatusService) puedan hacer
	 * `invoke()` y `on()` sin abrir una segunda WebSocket/SSE.
	 */
	async ensureConnected(): Promise<signalR.HubConnection> {
		if (this.connection?.state !== signalR.HubConnectionState.Connected) {
			await this.connect();
		}
		// After `connect()` succeeds, `this.connection` está seteada. El cast es seguro.
		return this.connection as signalR.HubConnection;
	}

	// #endregion

	// #region Connection lifecycle
	async connect(): Promise<void> {
		if (this.connection?.state === signalR.HubConnectionState.Connected) return;

		// Netlify no soporta WebSocket upgrade ni SSE persistente (timeout ~26s).
		// Long Polling es el único transporte compatible con Netlify.
		const transport = environment.production
			? signalR.HttpTransportType.LongPolling
			: undefined;

		this.connection = new signalR.HubConnectionBuilder()
			.withUrl('/asistenciahub', {
				withCredentials: true,
				transport,
			})
			.withAutomaticReconnect([0, 2000, 5000, 10000, 30000, 60000])
			.build();

		this.registerHandlers();

		try {
			await this.connection.start();
			this._connected.set(true);
			logger.log('AsistenciaSignalR: Conectado al hub');
		} catch (err) {
			logger.error('AsistenciaSignalR: Error al conectar', err);
			throw err;
		}
	}

	async disconnect(): Promise<void> {
		if (!this.connection) return;

		this.connection.off('AsistenciaRegistrada');
		try {
			await this.connection.stop();
		} catch (err) {
			logger.error('AsistenciaSignalR: Error al desconectar', err);
		}
		this.connection = null;
		this._connected.set(false);
		logger.log('AsistenciaSignalR: Desconectado');
	}
	// #endregion

	// #region Helpers privados
	private registerHandlers(): void {
		if (!this.connection) return;

		// Prevent handler duplication on reconnect
		this.connection.off('AsistenciaRegistrada');

		this.connection.on('AsistenciaRegistrada', (raw: Record<string, unknown>) => {
			const event = this.normalizeEvent(raw);
			logger.log('AsistenciaSignalR: AsistenciaRegistrada', { dni: event.dni, tipo: event.tipo });
			this.asistenciaRegistradaSubject.next(event);
		});

		this.connection.onclose((err) => {
			this._connected.set(false);
			if (err) {
				const msg = String(err);
				if (msg.includes('401') || msg.includes('Unauthorized')) {
					logger.warn('AsistenciaSignalR: Sesión expirada, deteniendo reconexión');
					this.connection?.stop().catch(() => {});
					return;
				}
				logger.warn('AsistenciaSignalR: Conexión cerrada con error', err);
			}
		});

		this.connection.onreconnecting(() => {
			this._connected.set(false);
			logger.log('AsistenciaSignalR: Reconectando...');
		});

		this.connection.onreconnected(() => {
			this._connected.set(true);
			logger.log('AsistenciaSignalR: Reconectado');
		});
	}

	/** Normaliza PascalCase/camelCase del payload de SignalR */
	private normalizeEvent(raw: Record<string, unknown>): SignalRAsistenciaEvent {
		return {
			dni: (raw['dni'] ?? raw['Dni']) as string,
			nombre: (raw['nombre'] ?? raw['Nombre']) as string,
			tipo: (raw['tipo'] ?? raw['Tipo']) as 'entrada' | 'salida',
			hora: (raw['hora'] ?? raw['Hora']) as string,
			sede: (raw['sede'] ?? raw['Sede']) as string,
		};
	}
	// #endregion
}
