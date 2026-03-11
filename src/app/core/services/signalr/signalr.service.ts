import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { logger } from '@core/helpers';
import { environment } from '@config/environment';

// #region Types
export interface SignalRMensaje {
	id: number;
	remitenteDni: string;
	remitenteNombre: string;
	contenido: string;
	fechaEnvio: string;
	esMio: boolean;
}

export interface SignalRTypingEvent {
	conversacionId: number;
	dni: string;
	nombre: string;
}
// #endregion

@Injectable({ providedIn: 'root' })
export class SignalRService {
	// #region Estado privado
	private connection: signalR.HubConnection | null = null;
	private readonly _connected = signal(false);
	private readonly joinedGroups = new Set<number>();
	// #endregion

	// #region Lecturas públicas
	readonly connected = this._connected.asReadonly();
	// #endregion

	// #region Event subjects
	private readonly nuevoMensajeSubject = new Subject<SignalRMensaje>();
	private readonly typingSubject = new Subject<SignalRTypingEvent>();

	readonly nuevoMensaje$ = this.nuevoMensajeSubject.asObservable();
	readonly typing$ = this.typingSubject.asObservable();
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
			.withUrl('/chathub', {
				withCredentials: true,
				transport,
			})
			.withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
			.build();

		this.registerHandlers();

		try {
			await this.connection.start();
			this._connected.set(true);
			logger.log('SignalR: Conectado al hub');
		} catch (err) {
			logger.error('SignalR: Error al conectar', err);
			throw err;
		}
	}

	async disconnect(): Promise<void> {
		if (!this.connection) return;

		this.joinedGroups.clear();
		try {
			await this.connection.stop();
		} catch (err) {
			logger.error('SignalR: Error al desconectar', err);
		}
		this.connection = null;
		this._connected.set(false);
		logger.log('SignalR: Desconectado');
	}
	// #endregion

	// #region Group management
	async joinConversacion(conversacionId: number): Promise<void> {
		if (this.joinedGroups.has(conversacionId)) return;

		try {
			if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
				await this.connect();
			}

			await this.connection!.invoke('JoinConversacion', conversacionId);
			this.joinedGroups.add(conversacionId);
			logger.log(`SignalR: Unido a conversación ${conversacionId}`);
		} catch (err) {
			logger.error(`SignalR: Error al unirse a conversación ${conversacionId}`, err);
		}
	}

	async leaveConversacion(conversacionId: number): Promise<void> {
		if (!this.connection || !this.joinedGroups.has(conversacionId)) return;

		try {
			await this.connection.invoke('LeaveConversacion', conversacionId);
			this.joinedGroups.delete(conversacionId);
			logger.log(`SignalR: Salió de conversación ${conversacionId}`);
		} catch (err) {
			logger.error(`SignalR: Error al salir de conversación ${conversacionId}`, err);
		}
	}

	async leaveAll(): Promise<void> {
		const groups = [...this.joinedGroups];
		for (const id of groups) {
			await this.leaveConversacion(id);
		}
	}
	// #endregion

	// #region Helpers privados
	private registerHandlers(): void {
		if (!this.connection) return;

		this.connection.on('NuevoMensaje', (raw: Record<string, unknown>) => {
			const mensaje = this.normalizeMensaje(raw);
			logger.log('SignalR: NuevoMensaje recibido', { id: mensaje.id, remitente: mensaje.remitenteNombre });
			this.nuevoMensajeSubject.next(mensaje);
		});

		this.connection.on('UserTyping', (raw: Record<string, unknown>) => {
			const data: SignalRTypingEvent = {
				conversacionId: (raw['conversacionId'] ?? raw['ConversacionId']) as number,
				dni: (raw['dni'] ?? raw['Dni']) as string,
				nombre: (raw['nombre'] ?? raw['Nombre']) as string,
			};
			this.typingSubject.next(data);
		});

		this.connection.onclose((err) => {
			this._connected.set(false);
			if (err) {
				logger.warn('SignalR: Conexión cerrada con error', err);
			}
		});

		this.connection.onreconnecting(() => {
			this._connected.set(false);
			logger.log('SignalR: Reconectando...');
		});

		this.connection.onreconnected(async () => {
			this._connected.set(true);
			logger.log('SignalR: Reconectado');

			// Re-join groups after reconnection
			const groups = [...this.joinedGroups];
			this.joinedGroups.clear();
			for (const id of groups) {
				await this.joinConversacion(id);
			}
		});
	}

	/** Normalizes PascalCase/camelCase property names from SignalR payload */
	private normalizeMensaje(raw: Record<string, unknown>): SignalRMensaje {
		return {
			id: (raw['id'] ?? raw['Id']) as number,
			remitenteDni: (raw['remitenteDni'] ?? raw['RemitenteDni']) as string,
			remitenteNombre: (raw['remitenteNombre'] ?? raw['RemitenteNombre']) as string,
			contenido: (raw['contenido'] ?? raw['Contenido']) as string,
			fechaEnvio: (raw['fechaEnvio'] ?? raw['FechaEnvio']) as string,
			esMio: (raw['esMio'] ?? raw['EsMio'] ?? false) as boolean,
		};
	}
	// #endregion
}
