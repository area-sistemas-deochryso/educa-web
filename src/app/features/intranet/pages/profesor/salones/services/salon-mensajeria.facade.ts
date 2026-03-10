import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, tap } from 'rxjs/operators';
import { logger } from '@core/helpers';
import { AuthService, ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { SignalRService } from '@core/services/signalr';
import { environment } from '@config';
import {
	CrearConversacionDto,
	EnviarMensajeDto,
	EnviarMensajeResponseDto,
	MensajeDto,
} from '../../models';
import { SalonMensajeriaApiService } from './salon-mensajeria-api.service';
import { SalonMensajeriaStore } from './salon-mensajeria.store';

const FORO_PREFIX = 'Foro:';

@Injectable({ providedIn: 'root' })
export class SalonMensajeriaFacade {
	// #region Dependencias
	private readonly api = inject(SalonMensajeriaApiService);
	private readonly store = inject(SalonMensajeriaStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly wal = inject(WalFacadeHelper);
	private readonly destroyRef = inject(DestroyRef);
	private readonly signalR = inject(SignalRService);
	private readonly auth = inject(AuthService);
	private readonly conversacionUrl = `${environment.apiUrl}/api/conversaciones`;
	// #endregion

	// #region Estado privado
	private currentConversacionId: number | null = null;
	private signalRInitialized = false;
	/** Timestamp of last successful conversaciones fetch (prevents rapid refetch). */
	private lastConversacionesFetchMs = 0;
	private static readonly REFETCH_THROTTLE_MS = 5_000;
	// #endregion

	// #region Estado expuesto
	readonly foroVm = this.store.foroVm;
	readonly mensajeriaVm = this.store.mensajeriaVm;
	// #endregion

	// #region SignalR setup
	private initSignalR(): void {
		if (this.signalRInitialized) return;
		this.signalRInitialized = true;

		this.signalR.nuevoMensaje$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((mensaje) => {
				const localMensaje: MensajeDto = {
					id: mensaje.id,
					remitenteDni: mensaje.remitenteDni,
					remitenteNombre: mensaje.remitenteNombre,
					contenido: mensaje.contenido,
					fechaEnvio: mensaje.fechaEnvio,
					esMio: false,
				};
				this.store.addMensaje(localMensaje);
			});
	}

	/** Best-effort SignalR join — chat works via HTTP even if SignalR fails */
	private async joinConversacion(id: number): Promise<void> {
		try {
			this.initSignalR();

			if (this.currentConversacionId && this.currentConversacionId !== id) {
				await this.signalR.leaveConversacion(this.currentConversacionId);
			}
			this.currentConversacionId = id;
			await this.signalR.joinConversacion(id);
		} catch {
			logger.warn('SalonMensajeriaFacade: SignalR join falló, mensajería funciona sin real-time');
		}
	}

	private async leaveCurrentConversacion(): Promise<void> {
		try {
			if (this.currentConversacionId) {
				await this.signalR.leaveConversacion(this.currentConversacionId);
				this.currentConversacionId = null;
			}
		} catch {
			this.currentConversacionId = null;
		}
	}
	// #endregion

	// #region Foro commands
	/**
	 * Find or create the foro conversation for a salon.
	 * Searches existing conversations for one with "Foro: [description]".
	 * If not found, creates it with all students as participants.
	 */
	initForo(salonDescripcion: string, estudiantesDni: string[], horarioId: number): void {
		if (this.store.foroLoading()) return;
		this.store.setForoLoading(true);
		this.store.setConversacionDetalle(null);
		this.store.setCurrentHorarioId(horarioId);

		this.api
			.listarConversaciones(horarioId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (conversaciones) => {
					this.store.setConversaciones(conversaciones);

					const foroAsunto = `${FORO_PREFIX} ${salonDescripcion}`;
					const foro = conversaciones.find((c) => c.asunto === foroAsunto);

					if (foro) {
						this.store.setForoConversacionId(foro.id);
						this.loadConversacionDetalle(foro.id);
					} else if (estudiantesDni.length > 0) {
						this.crearForoConversacion(foroAsunto, estudiantesDni, salonDescripcion, horarioId);
					} else {
						this.store.setForoLoading(false);
					}
				},
				error: (err) => {
					this.handleError(err, 'cargar conversaciones');
					this.store.setForoLoading(false);
				},
			});
	}

	refreshForo(): void {
		const foroId = this.store.foroConversacionId();
		if (foroId) {
			this.loadConversacionDetalle(foroId);
		}
	}
	// #endregion

	// #region Mensajería commands
	loadConversaciones(horarioId?: number, force = false): void {
		if (this.store.conversacionesLoading()) return;

		// Skip refetch if data was loaded recently (prevents rapid back→open→back floods)
		const now = Date.now();
		if (!force && now - this.lastConversacionesFetchMs < SalonMensajeriaFacade.REFETCH_THROTTLE_MS) {
			return;
		}

		this.store.setConversacionesLoading(true);
		this.store.setCurrentHorarioId(horarioId ?? null);

		this.api
			.listarConversaciones(horarioId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (conversaciones) => {
					this.store.setConversaciones(conversaciones);
					this.store.setConversacionesLoading(false);
					this.lastConversacionesFetchMs = Date.now();
				},
				error: (err) => {
					this.handleError(err, 'cargar conversaciones');
					this.store.setConversacionesLoading(false);
				},
			});

		this.loadDestinatarios();
	}

	loadDestinatarios(): void {
		if (this.store.destinatarios().length > 0) return;

		this.api
			.getDestinatarios()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					const all = [...data.profesores, ...data.estudiantes, ...data.companeros];
					this.store.setDestinatarios(all);
				},
				error: (err) => {
					logger.error('SalonMensajeriaFacade: Error al cargar destinatarios', err);
				},
			});
	}

	openConversacion(id: number): void {
		this.store.setVistaDetalle(true);
		this.loadConversacionDetalle(id);
		this.api
			.marcarLeido(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe();
	}

	backToList(): void {
		this.leaveCurrentConversacion();
		this.store.setVistaDetalle(false);
		this.store.setConversacionDetalle(null);
		const horarioId = this.store.currentHorarioId();
		this.loadConversaciones(horarioId ?? undefined);
	}

	/** Create conversation with WAL → multi-step: create then load detail. */
	crearConversacion(dto: CrearConversacionDto): void {
		this.store.setSending(true);

		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'Conversacion',
			endpoint: `${this.conversacionUrl}/crear`,
			method: 'POST',
			payload: dto,
			http$: () =>
				this.api.crearConversacion(dto).pipe(
					switchMap((response) => {
						this.store.setVistaDetalle(true);
						return this.api.obtenerConversacion(response.conversacionId);
					}),
					tap((detalle) => {
						this.joinConversacion(detalle.id);
					}),
				),
			onCommit: (detalle) => {
				this.store.setConversacionDetalle(detalle);
				this.store.setSending(false);
			},
			onError: (err) => {
				this.handleError(err, 'crear conversación');
				this.store.setSending(false);
			},
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
		});
	}
	// #endregion

	// #region Shared commands

	/** Send message with WAL → optimistic add + rollback on failure. */
	enviarMensaje(conversacionId: number, contenido: string): void {
		this.store.setSending(true);
		const dto: EnviarMensajeDto = { conversacionId, contenido };
		const userDni = this.auth.currentUser?.dni ?? '';
		const userName = this.auth.currentUser?.nombreCompleto ?? '';

		// Temporary ID for optimistic add (replaced by server ID on commit or SignalR dedup)
		const tempId = -Date.now();
		const optimisticMensaje: MensajeDto = {
			id: tempId,
			remitenteDni: userDni,
			remitenteNombre: userName,
			contenido,
			fechaEnvio: new Date().toISOString(),
			esMio: true,
		};

		this.wal.execute<EnviarMensajeResponseDto>({
			operation: 'CREATE',
			resourceType: 'Conversacion',
			resourceId: conversacionId,
			endpoint: `${this.conversacionUrl}/mensaje`,
			method: 'POST',
			payload: dto,
			http$: () => this.api.enviarMensaje(dto),
			onCommit: (response) => {
				// Replace temp message with server-confirmed ID
				this.store.replaceTempMensaje(tempId, response.mensajeId);
				this.store.setSending(false);
			},
			onError: (err) => {
				this.handleError(err, 'enviar mensaje');
				this.store.setSending(false);
			},
			optimistic: {
				apply: () => {
					this.store.addMensaje(optimisticMensaje);
				},
				rollback: () => {
					this.store.removeMensaje(tempId);
				},
			},
		});
	}

	reset(): void {
		this.leaveCurrentConversacion();
		this.store.reset();
		this.lastConversacionesFetchMs = 0;
	}
	// #endregion

	// #region Helpers privados
	private crearForoConversacion(
		asunto: string,
		estudiantesDni: string[],
		salonDescripcion: string,
		horarioId?: number,
	): void {
		const dto: CrearConversacionDto = {
			asunto,
			destinatariosDni: estudiantesDni,
			mensajeInicial: `Bienvenidos al foro del salón ${salonDescripcion}.`,
			horarioId,
		};

		this.api
			.crearConversacion(dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.store.setForoConversacionId(response.conversacionId);
					this.loadConversacionDetalle(response.conversacionId);
				},
				error: (err) => {
					this.handleError(err, 'crear foro');
					this.store.setForoLoading(false);
				},
			});
	}

	private loadConversacionDetalle(id: number): void {
		if (this.store.detalleLoading()) return;
		this.store.setDetalleLoading(true);

		this.api
			.obtenerConversacion(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (detalle) => {
					this.store.setConversacionDetalle(detalle);
					this.store.setDetalleLoading(false);
					this.store.setForoLoading(false);
					this.joinConversacion(id);
				},
				error: (err) => {
					this.handleError(err, 'cargar conversación');
					this.store.setDetalleLoading(false);
					this.store.setForoLoading(false);
				},
			});
	}

	private handleError(err: unknown, accion: string): void {
		logger.error(`SalonMensajeriaFacade: Error al ${accion}`, err);
		this.errorHandler.showError('Error', `No se pudo ${accion}`);
	}
	// #endregion
}
