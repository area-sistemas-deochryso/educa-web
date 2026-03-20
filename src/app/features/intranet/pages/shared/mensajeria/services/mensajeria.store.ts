import { Injectable, computed, signal } from '@angular/core';
import { ConversacionListDto, ConversacionDetalleDto, MensajeDto, DestinatarioDto } from '@data/models';

interface SalonMensajeriaState {
	conversaciones: ConversacionListDto[];
	conversacionesLoading: boolean;
	conversacionDetalle: ConversacionDetalleDto | null;
	detalleLoading: boolean;
	foroConversacionId: number | null;
	foroLoading: boolean;
	sending: boolean;
	vistaDetalle: boolean;
	destinatarios: DestinatarioDto[];
	currentHorarioId: number | null;
}

const initialState: SalonMensajeriaState = {
	conversaciones: [],
	conversacionesLoading: false,
	conversacionDetalle: null,
	detalleLoading: false,
	foroConversacionId: null,
	foroLoading: false,
	sending: false,
	vistaDetalle: false,
	destinatarios: [],
	currentHorarioId: null,
};

@Injectable({ providedIn: 'root' })
export class SalonMensajeriaStore {
	// #region Estado privado
	private readonly _state = signal<SalonMensajeriaState>(initialState);
	// #endregion

	// #region Lecturas públicas
	readonly conversaciones = computed(() => this._state().conversaciones);
	readonly conversacionesLoading = computed(() => this._state().conversacionesLoading);
	readonly conversacionDetalle = computed(() => this._state().conversacionDetalle);
	readonly detalleLoading = computed(() => this._state().detalleLoading);
	readonly foroConversacionId = computed(() => this._state().foroConversacionId);
	readonly foroLoading = computed(() => this._state().foroLoading);
	readonly sending = computed(() => this._state().sending);
	readonly vistaDetalle = computed(() => this._state().vistaDetalle);
	readonly destinatarios = computed(() => this._state().destinatarios);
	readonly currentHorarioId = computed(() => this._state().currentHorarioId);
	// #endregion

	// #region Computed
	readonly mensajes = computed(() => this._state().conversacionDetalle?.mensajes ?? []);

	/** Conversations excluding the foro */
	readonly conversacionesSinForo = computed(() => {
		const foroId = this._state().foroConversacionId;
		return this._state().conversaciones.filter((c) => c.id !== foroId);
	});

	readonly foroVm = computed(() => ({
		mensajes: this.mensajes(),
		loading: this.foroLoading() || this.detalleLoading(),
		sending: this.sending(),
		foroConversacionId: this.foroConversacionId(),
	}));

	readonly mensajeriaVm = computed(() => ({
		conversaciones: this.conversacionesSinForo(),
		loading: this.conversacionesLoading(),
		detalle: this.conversacionDetalle(),
		detalleLoading: this.detalleLoading(),
		sending: this.sending(),
		vistaDetalle: this.vistaDetalle(),
		destinatarios: this.destinatarios(),
	}));
	// #endregion

	// #region Comandos de mutación
	setConversaciones(conversaciones: ConversacionListDto[]): void {
		this._state.update((s) => ({ ...s, conversaciones }));
	}

	setConversacionesLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, conversacionesLoading: loading }));
	}

	setConversacionDetalle(detalle: ConversacionDetalleDto | null): void {
		this._state.update((s) => ({ ...s, conversacionDetalle: detalle }));
	}

	setDetalleLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, detalleLoading: loading }));
	}

	setForoConversacionId(id: number | null): void {
		this._state.update((s) => ({ ...s, foroConversacionId: id }));
	}

	setForoLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, foroLoading: loading }));
	}

	setSending(sending: boolean): void {
		this._state.update((s) => ({ ...s, sending }));
	}

	setVistaDetalle(vistaDetalle: boolean): void {
		this._state.update((s) => ({ ...s, vistaDetalle }));
	}

	setDestinatarios(destinatarios: DestinatarioDto[]): void {
		this._state.update((s) => ({ ...s, destinatarios }));
	}

	setCurrentHorarioId(id: number | null): void {
		this._state.update((s) => ({ ...s, currentHorarioId: id }));
	}

	/**
	 * Add message with dedup by ID.
	 * If a duplicate exists with esMio=false but the new one has esMio=true,
	 * the flag is corrected (handles SignalR arriving before optimistic update).
	 */
	addMensaje(mensaje: MensajeDto): void {
		this._state.update((s) => {
			if (!s.conversacionDetalle) return s;

			const existing = s.conversacionDetalle.mensajes.find((m) => m.id === mensaje.id);
			if (existing) {
				// Optimistic update arrived after SignalR — correct esMio
				if (!existing.esMio && mensaje.esMio) {
					return {
						...s,
						conversacionDetalle: {
							...s.conversacionDetalle,
							mensajes: s.conversacionDetalle.mensajes.map((m) =>
								m.id === mensaje.id ? { ...m, esMio: true } : m,
							),
						},
					};
				}
				return s;
			}

			return {
				...s,
				conversacionDetalle: {
					...s.conversacionDetalle,
					mensajes: [...s.conversacionDetalle.mensajes, mensaje],
				},
			};
		});
	}

	/** Replace a temporary message ID with the server-confirmed ID. */
	replaceTempMensaje(tempId: number, serverId: number): void {
		this._state.update((s) => {
			if (!s.conversacionDetalle) return s;
			return {
				...s,
				conversacionDetalle: {
					...s.conversacionDetalle,
					mensajes: s.conversacionDetalle.mensajes.map((m) =>
						m.id === tempId ? { ...m, id: serverId } : m,
					),
				},
			};
		});
	}

	/** Remove a message by ID (used for optimistic rollback). */
	removeMensaje(mensajeId: number): void {
		this._state.update((s) => {
			if (!s.conversacionDetalle) return s;
			return {
				...s,
				conversacionDetalle: {
					...s.conversacionDetalle,
					mensajes: s.conversacionDetalle.mensajes.filter((m) => m.id !== mensajeId),
				},
			};
		});
	}

	reset(): void {
		this._state.set(initialState);
	}
	// #endregion
}
