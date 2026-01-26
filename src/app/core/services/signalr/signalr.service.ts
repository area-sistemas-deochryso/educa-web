import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, fromEvent, filter } from 'rxjs';
import * as signalR from '@microsoft/signalr';

import { environment } from '@config';
import { logger } from '@core/helpers';
import { StorageService } from '../storage';
import { NotificacionAsistencia, SignalRConnectionState } from './signalr.models';

/**
 * Servicio para manejar conexiones SignalR con el backend.
 * Permite recibir notificaciones de asistencia en tiempo real.
 *
 * Uso:
 * ```typescript
 * // En un componente
 * readonly signalR = inject(SignalRService);
 *
 * ngOnInit() {
 *   this.signalR.connect();
 *
 *   this.signalR.notificacionAsistencia$
 *     .pipe(takeUntilDestroyed(this.destroyRef))
 *     .subscribe(notif => {
 *       // Mostrar notificación al usuario
 *     });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  private storage = inject(StorageService);
  private destroyRef = inject(DestroyRef);

  private connection: signalR.HubConnection | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectIntervals = [0, 2000, 5000, 10000, 30000];

  // Estado reactivo
  private readonly _connectionState = signal<SignalRConnectionState>('disconnected');
  readonly connectionState = this._connectionState.asReadonly();
  readonly isConnected = computed(() => this._connectionState() === 'connected');

  // Subjects para notificaciones
  private readonly _notificacionAsistencia = new Subject<NotificacionAsistencia>();
  readonly notificacionAsistencia$ = this._notificacionAsistencia.asObservable();

  // Subject para errores
  private readonly _connectionError = new Subject<Error>();
  readonly connectionError$ = this._connectionError.asObservable();

  constructor() {
    // Reconectar cuando la app vuelve a estar online
    fromEvent(window, 'online')
      .pipe(
        filter(() => this._connectionState() === 'disconnected'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        logger.log('[SignalR] Conexión de red restaurada, reconectando...');
        this.connect();
      });

    // Desconectar cuando la app se cierra
    fromEvent(window, 'beforeunload')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.disconnect();
      });
  }

  /**
   * Establece la conexión con el hub de SignalR.
   * Solo se conecta si hay un token válido.
   */
  async connect(): Promise<void> {
    const token = this.storage.getToken();

    if (!token) {
      logger.warn('[SignalR] No hay token, no se puede conectar');
      return;
    }

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      logger.log('[SignalR] Ya conectado');
      return;
    }

    if (this._connectionState() === 'connecting') {
      logger.log('[SignalR] Conexión en progreso...');
      return;
    }

    this._connectionState.set('connecting');

    try {
      // Construir URL del hub
      const hubUrl = `${environment.apiUrl}/hubs/asistencia`;

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => token,
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect(this.reconnectIntervals)
        .configureLogging(environment.production ? signalR.LogLevel.Warning : signalR.LogLevel.Information)
        .build();

      // Registrar handlers
      this.registerHandlers();

      // Conectar
      await this.connection.start();

      this._connectionState.set('connected');
      this.reconnectAttempts = 0;
      logger.log('[SignalR] Conectado exitosamente');
    } catch (error) {
      logger.error('[SignalR] Error al conectar:', error);
      this._connectionState.set('disconnected');
      this._connectionError.next(error as Error);

      // Intentar reconectar
      this.scheduleReconnect();
    }
  }

  /**
   * Cierra la conexión con el hub
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
        logger.log('[SignalR] Desconectado');
      } catch (error) {
        logger.error('[SignalR] Error al desconectar:', error);
      } finally {
        this.connection = null;
        this._connectionState.set('disconnected');
      }
    }
  }

  /**
   * Confirma la recepción de una notificación al servidor
   */
  async confirmarRecepcion(notificacionId: string): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('ConfirmarRecepcion', notificacionId);
      } catch (error) {
        logger.error('[SignalR] Error al confirmar recepción:', error);
      }
    }
  }

  /**
   * Registra los handlers para los eventos del hub
   */
  private registerHandlers(): void {
    if (!this.connection) return;

    // Handler para notificaciones de asistencia
    this.connection.on('NotificacionAsistencia', (data: NotificacionAsistencia) => {
      logger.log('[SignalR] Notificación recibida:', data);
      this._notificacionAsistencia.next(data);
    });

    // Eventos de conexión
    this.connection.onreconnecting((error) => {
      logger.warn('[SignalR] Reconectando...', error);
      this._connectionState.set('reconnecting');
    });

    this.connection.onreconnected((connectionId) => {
      logger.log('[SignalR] Reconectado:', connectionId);
      this._connectionState.set('connected');
      this.reconnectAttempts = 0;
    });

    this.connection.onclose((error) => {
      logger.warn('[SignalR] Conexión cerrada:', error);
      this._connectionState.set('disconnected');

      // Intentar reconectar si fue un cierre inesperado
      if (error) {
        this.scheduleReconnect();
      }
    });
  }

  /**
   * Programa un intento de reconexión con backoff exponencial
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[SignalR] Máximo de intentos de reconexión alcanzado');
      return;
    }

    const delay = this.reconnectIntervals[
      Math.min(this.reconnectAttempts, this.reconnectIntervals.length - 1)
    ];

    this.reconnectAttempts++;
    logger.log(`[SignalR] Reintentando en ${delay}ms (intento ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this._connectionState() === 'disconnected') {
        this.connect();
      }
    }, delay);
  }
}
