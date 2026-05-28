import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

import { environment } from '@config/environment';
import { logger } from '@core/helpers';

import {
	BlacklistEntryCreatedEvent,
	CandidatoBlacklistDetectadoEvent,
	DeferFailStatusUpdatedEvent,
} from '../models/email-monitoreo.models';

const LOG_TAG = 'EmailHub:Service';
const HUB_GROUP = 'email-alerts';

/**
 * Plan 39 Chat C (D5/D13) — wrapper SignalR del `EmailHub` server-side
 * (Plan 39 Chat B 078). Suscripciones a los 3 eventos del hub:
 *
 * - `BlacklistEntryCreated` (Plan 38) — refresca tile candidatos / muestra toast.
 * - `DeferFailStatusUpdated` (Plan 39) — push del semáforo OK/WARNING/CRITICAL
 *   sin esperar polling 60s del widget.
 * - `CandidatoBlacklistDetectado` (Plan 39) — early warning antes del auto-blacklist.
 *
 * Reusable por Plan 38 Chat 6 (banner B9 + toast). Patrón análogo al
 * `SignalRService` de chat: long-polling forzado en producción (Netlify),
 * reconnect automático con backoff explícito.
 */
@Injectable({ providedIn: 'root' })
export class EmailHubService {
	// #region Estado privado
	private connection: signalR.HubConnection | null = null;
	private readonly _connected = signal(false);
	private readonly _reconnecting = signal(false);
	private joined = false;
	// #endregion

	// #region Lecturas públicas
	readonly connected = this._connected.asReadonly();
	readonly reconnecting = this._reconnecting.asReadonly();
	// #endregion

	// #region Event subjects
	private readonly blacklistEntryCreatedSubject = new Subject<BlacklistEntryCreatedEvent>();
	private readonly deferFailStatusUpdatedSubject = new Subject<DeferFailStatusUpdatedEvent>();
	private readonly candidatoBlacklistDetectadoSubject = new Subject<CandidatoBlacklistDetectadoEvent>();

	readonly blacklistEntryCreated$ = this.blacklistEntryCreatedSubject.asObservable();
	readonly deferFailStatusUpdated$ = this.deferFailStatusUpdatedSubject.asObservable();
	readonly candidatoBlacklistDetectado$ =
		this.candidatoBlacklistDetectadoSubject.asObservable();
	// #endregion

	// #region Connection lifecycle
	async connect(): Promise<void> {
		if (this.connection?.state === signalR.HubConnectionState.Connected) return;

		// Netlify no soporta WebSocket upgrade ni SSE persistente — Long Polling.
		const transport = environment.production
			? signalR.HttpTransportType.LongPolling
			: undefined;

		this.connection = new signalR.HubConnectionBuilder()
			.withUrl('/hubs/email-alerts', {
				withCredentials: true,
				transport,
			})
			.withAutomaticReconnect([0, 2000, 5000, 10000, 30000, 60000])
			.build();

		this.registerHandlers();

		try {
			await this.connection.start();
			this._connected.set(true);
			logger.tagged(LOG_TAG, 'log', 'connected');
			await this.joinAlerts();
		} catch (err) {
			logger.tagged(LOG_TAG, 'error', 'connect_failed', err);
			throw err;
		}
	}

	async disconnect(): Promise<void> {
		if (!this.connection) return;

		await this.leaveAlerts();
		this.connection.off('BlacklistEntryCreated');
		this.connection.off('DeferFailStatusUpdated');
		this.connection.off('CandidatoBlacklistDetectado');
		try {
			await this.connection.stop();
		} catch (err) {
			logger.tagged(LOG_TAG, 'error', 'disconnect_failed', err);
		}
		this.connection = null;
		this._connected.set(false);
		this.joined = false;
		logger.tagged(LOG_TAG, 'log', 'disconnected');
	}
	// #endregion

	// #region Group management
	async joinAlerts(): Promise<void> {
		if (this.joined) return;
		if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
			return;
		}
		try {
			await this.connection.invoke('JoinAlertsGroup', HUB_GROUP);
			this.joined = true;
			logger.tagged(LOG_TAG, 'log', 'joined_group', HUB_GROUP);
		} catch (err) {
			logger.tagged(LOG_TAG, 'warn', 'join_failed', err);
		}
	}

	async leaveAlerts(): Promise<void> {
		if (!this.joined || !this.connection) return;
		try {
			await this.connection.invoke('LeaveAlertsGroup', HUB_GROUP);
		} catch (err) {
			logger.tagged(LOG_TAG, 'warn', 'leave_failed', err);
		}
		this.joined = false;
	}
	// #endregion

	// #region Helpers privados
	private registerHandlers(): void {
		if (!this.connection) return;

		this.connection.off('BlacklistEntryCreated');
		this.connection.off('DeferFailStatusUpdated');
		this.connection.off('CandidatoBlacklistDetectado');

		this.connection.on('BlacklistEntryCreated', (raw: Record<string, unknown>) => {
			const dto: BlacklistEntryCreatedEvent = {
				correoEnmascarado: this.pick<string>(raw, 'correoEnmascarado'),
				motivo: this.pick<string>(raw, 'motivo'),
				origen: this.pick<string>(raw, 'origen'),
			};
			logger.tagged(LOG_TAG, 'log', 'evt:BlacklistEntryCreated', dto);
			this.blacklistEntryCreatedSubject.next(dto);
		});

		this.connection.on('DeferFailStatusUpdated', (raw: Record<string, unknown>) => {
			const dto: DeferFailStatusUpdatedEvent = {
				status: this.pick<DeferFailStatusUpdatedEvent['status']>(raw, 'status'),
				contadorActual: this.pick<number>(raw, 'contadorActual'),
				threshold: this.pick<number>(raw, 'threshold'),
			};
			logger.tagged(LOG_TAG, 'log', 'evt:DeferFailStatusUpdated', dto);
			this.deferFailStatusUpdatedSubject.next(dto);
		});

		this.connection.on('CandidatoBlacklistDetectado', (raw: Record<string, unknown>) => {
			const dto: CandidatoBlacklistDetectadoEvent = {
				correoEnmascarado: this.pick<string>(raw, 'correoEnmascarado'),
				hitsActuales: this.pick<number>(raw, 'hitsActuales'),
				thresholdHits: this.pick<number>(raw, 'thresholdHits'),
			};
			logger.tagged(LOG_TAG, 'log', 'evt:CandidatoBlacklistDetectado', dto);
			this.candidatoBlacklistDetectadoSubject.next(dto);
		});

		this.connection.onclose((err) => {
			this._connected.set(false);
			this._reconnecting.set(false);
			this.joined = false;
			if (err) {
				const msg = String(err);
				if (msg.includes('401') || msg.includes('Unauthorized')) {
					logger.tagged(LOG_TAG, 'warn', 'session_expired_stop_reconnect');
					this.connection?.stop().catch(() => {});
					return;
				}
				logger.tagged(LOG_TAG, 'warn', 'closed_with_error', err);
			}
		});

		this.connection.onreconnecting(() => {
			this._connected.set(false);
			this._reconnecting.set(true);
			this.joined = false;
			logger.tagged(LOG_TAG, 'log', 'reconnecting');
		});

		this.connection.onreconnected(async () => {
			this._connected.set(true);
			this._reconnecting.set(false);
			logger.tagged(LOG_TAG, 'log', 'reconnected');
			await this.joinAlerts();
		});
	}

	private pick<T>(raw: Record<string, unknown>, camel: string): T {
		const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
		return (raw[camel] ?? raw[pascal]) as T;
	}
	// #endregion
}
