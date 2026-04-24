import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { Subject } from 'rxjs';

import { logger } from '@core/helpers';
import { environment } from '@config/environment';
import { StorageService } from '@core/services/storage/storage.service';
import { AttendanceSignalRService } from './attendance-signalr.service';
import {
	CrossChexSyncStatusDto,
	SyncEstado,
} from './crosschex-sync-status.models';

// #region Constants

const SYNC_PROGRESS_EVENT = 'SyncProgress';
const SUBSCRIBE_METHOD = 'SubscribeToSyncJob';
const UNSUBSCRIBE_METHOD = 'UnsubscribeFromSyncJob';
const JOB_ID_REGEX = /^[a-f0-9]{32}$/;

// #endregion

// #region Types

type SyncProgressHandler = (dto: CrossChexSyncStatusDto) => void;

/**
 * Evento emitido cuando el job alcanza un estado terminal (COMPLETED o FAILED).
 * Permite al consumer refetchar tabla/stats sin acoplar el service a esas capas.
 */
export interface SyncTerminalEvent {
	status: CrossChexSyncStatusDto;
}

// #endregion

/**
 * Plan 24 Chat 3 — Servicio singleton que trackea el progreso de un job
 * de sincronización CrossChex vía SignalR.
 *
 * Reutiliza la HubConnection del `AttendanceSignalRService` (un solo hub,
 * una sola conexión) y expone un signal reactivo con el estado actual del
 * job. La UI consume el signal; no toca el hub directamente.
 *
 * Ciclo de vida del tracking:
 *   1. `startTracking(jobId)` → guarda en sessionStorage + suscribe al grupo
 *   2. Eventos `"SyncProgress"` actualizan el signal `status`
 *   3. Al recibir COMPLETED/FAILED → emite en `terminal$` + limpia storage
 *   4. `stopTracking()` → unsubscribe + clear + reset signal
 *
 * Recuperación tras refresh F5:
 *   - `rehydrate()` lee sessionStorage, consulta `GET /sync/{id}/status` y
 *     si el estado aún es activo, re-suscribe al hub. Si ya terminó, emite
 *     el evento terminal y limpia el storage.
 */
@Injectable({ providedIn: 'root' })
export class CrossChexSyncStatusService {
	// #region Dependencias
	private hubService = inject(AttendanceSignalRService);
	private http = inject(HttpClient);
	private storage = inject(StorageService);
	private readonly apiUrl = `${environment.apiUrl}/api/asistencia-admin`;
	// #endregion

	// #region Estado privado
	private readonly _status = signal<CrossChexSyncStatusDto | null>(null);
	private readonly _trackingJobId = signal<string | null>(null);
	private handler: SyncProgressHandler | null = null;
	private readonly terminalSubject = new Subject<SyncTerminalEvent>();
	// #endregion

	// #region Lecturas públicas
	readonly status = this._status.asReadonly();
	readonly trackingJobId = this._trackingJobId.asReadonly();

	/** `true` mientras haya job activo (QUEUED o RUNNING). */
	readonly hasActiveJob = computed(() => {
		const s = this._status();
		return s !== null && s.estado !== 'COMPLETED' && s.estado !== 'FAILED';
	});

	/** Alias semántico usado para deshabilitar el botón "Sincronizar". */
	readonly isActive = this.hasActiveJob;

	/** Stream de eventos terminales (COMPLETED/FAILED) — para refetchar tabla/stats. */
	readonly terminal$ = this.terminalSubject.asObservable();
	// #endregion

	// #region Commands

	/**
	 * Comienza a trackear un job. Idempotente: llamar dos veces con el mismo
	 * jobId no duplica la suscripción. Llamar con un jobId distinto desuscribe
	 * el anterior antes de suscribir el nuevo.
	 */
	async startTracking(jobId: string): Promise<void> {
		if (!this.isValidJobId(jobId)) {
			logger.warn('[CrossChexSync] startTracking ignorado — jobId inválido', { jobId });
			return;
		}

		const previous = this._trackingJobId();
		if (previous === jobId) {
			// Ya suscrito al mismo job — no-op.
			return;
		}

		if (previous) {
			await this.unsubscribeFrom(previous);
		}

		this._trackingJobId.set(jobId);
		this.persistJobId(jobId);

		try {
			const hub = await this.hubService.ensureConnected();
			this.attachHandler(hub);
			await hub.invoke(SUBSCRIBE_METHOD, jobId);
			logger.log('[CrossChexSync] Suscrito al job', { jobId });
		} catch (err) {
			logger.error('[CrossChexSync] Error al suscribir al hub', err);
			// Reset defensivo — el consumer puede reintentar más tarde.
			this._trackingJobId.set(null);
			this.clearPersistedJobId();
		}
	}

	/**
	 * Detiene el tracking del job activo. Seguro de llamar aunque no haya
	 * nada suscrito (no-op).
	 */
	async stopTracking(): Promise<void> {
		const jobId = this._trackingJobId();
		if (!jobId) return;

		await this.unsubscribeFrom(jobId);
		this._trackingJobId.set(null);
		this._status.set(null);
		this.clearPersistedJobId();
	}

	/**
	 * Recupera un job activo tras refresh del navegador. Lee el jobId de
	 * sessionStorage, consulta `GET /sync/{id}/status` y:
	 *   - Si sigue activo → re-suscribe al hub.
	 *   - Si ya terminó → emite evento terminal y limpia storage.
	 *   - Si no existe → limpia storage silenciosamente.
	 */
	async rehydrate(): Promise<void> {
		const jobId = this.readPersistedJobId();
		if (!jobId) return;

		if (!this.isValidJobId(jobId)) {
			this.clearPersistedJobId();
			return;
		}

		this.http
			.get<CrossChexSyncStatusDto>(`${this.apiUrl}/sync/${jobId}/status`)
			.subscribe({
				next: (dto) => {
					if (!dto) {
						this.clearPersistedJobId();
						return;
					}

					this._status.set(dto);

					if (this.isTerminal(dto.estado)) {
						this.terminalSubject.next({ status: dto });
						this._trackingJobId.set(null);
						this.clearPersistedJobId();
						return;
					}

					// Job aún activo — re-suscribir al hub.
					void this.startTracking(jobId);
				},
				error: (err) => {
					logger.warn('[CrossChexSync] rehydrate falló — limpiando storage', err);
					this.clearPersistedJobId();
				},
			});
	}

	// #endregion

	// #region Helpers privados

	private attachHandler(hub: HubConnection): void {
		if (this.handler) {
			hub.off(SYNC_PROGRESS_EVENT, this.handler);
		}

		const handler: SyncProgressHandler = (raw) => {
			const dto = this.normalizePayload(raw as unknown as Record<string, unknown>);
			if (!dto) return;

			// Ignorar eventos de jobs que ya no trackeamos.
			if (dto.jobId !== this._trackingJobId()) return;

			this._status.set(dto);

			if (this.isTerminal(dto.estado)) {
				this.terminalSubject.next({ status: dto });
				void this.unsubscribeFrom(dto.jobId);
				this._trackingJobId.set(null);
				this.clearPersistedJobId();
			}
		};

		this.handler = handler;
		hub.on(SYNC_PROGRESS_EVENT, handler);
	}

	private async unsubscribeFrom(jobId: string): Promise<void> {
		try {
			const conn = await this.hubService.ensureConnected();
			if (conn.state === HubConnectionState.Connected) {
				await conn.invoke(UNSUBSCRIBE_METHOD, jobId);
			}
		} catch (err) {
			logger.warn('[CrossChexSync] Unsubscribe falló (puede ser benigno)', err);
		}
	}

	private isTerminal(estado: SyncEstado): boolean {
		return estado === 'COMPLETED' || estado === 'FAILED';
	}

	private isValidJobId(jobId: string): boolean {
		return typeof jobId === 'string' && JOB_ID_REGEX.test(jobId);
	}

	/** Normaliza PascalCase/camelCase del payload — el hub puede enviar cualquiera. */
	private normalizePayload(raw: Record<string, unknown>): CrossChexSyncStatusDto | null {
		const jobId = (raw['jobId'] ?? raw['JobId']) as string | undefined;
		const estado = (raw['estado'] ?? raw['Estado']) as SyncEstado | undefined;
		if (!jobId || !estado) return null;

		return {
			jobId,
			estado,
			pagina: (raw['pagina'] ?? raw['Pagina']) as number | null,
			totalPaginas: (raw['totalPaginas'] ?? raw['TotalPaginas']) as number | null,
			fase: (raw['fase'] ?? raw['Fase']) as string | null,
			mensaje: (raw['mensaje'] ?? raw['Mensaje']) as string | null,
			iniciadoEn: (raw['iniciadoEn'] ?? raw['IniciadoEn']) as string,
			finalizadoEn: (raw['finalizadoEn'] ?? raw['FinalizadoEn']) as string | null,
			error: (raw['error'] ?? raw['Error']) as string | null,
		};
	}

	private persistJobId(jobId: string): void {
		this.storage.setCrossChexJobId(jobId);
	}

	private readPersistedJobId(): string | null {
		return this.storage.getCrossChexJobId();
	}

	private clearPersistedJobId(): void {
		this.storage.setCrossChexJobId(null);
	}

	// #endregion
}
