// #region Imports
import { Injectable, signal, computed } from '@angular/core';
import { VideoconferenciaItem } from './videoconferencias.models';

// #endregion

// #region Implementation
@Injectable({ providedIn: 'root' })
export class VideoconferenciasStore {
	// #region Estado privado
	private readonly _items = signal<VideoconferenciaItem[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _activeSala = signal<VideoconferenciaItem | null>(null);
	/** Token obtenido vía excepción del moderador (bypass de ventana/habilitación) — evita que la sala vuelva a pedir el token normal, que fallaría por la misma razón que disparó la excepción. */
	private readonly _exceptionToken = signal<{ jwt: string; appId: string } | null>(null);
	// #endregion

	// #region Lecturas públicas
	readonly items = this._items.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly activeSala = this._activeSala.asReadonly();
	readonly exceptionToken = this._exceptionToken.asReadonly();
	readonly inSala = computed(() => this._activeSala() !== null);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this.items(),
		loading: this.loading(),
		error: this.error(),
		isEmpty: !this.loading() && this.items().length === 0,
		activeSala: this.activeSala(),
		exceptionToken: this.exceptionToken(),
		inSala: this.inSala(),
	}));
	// #endregion

	// #region Comandos de mutación
	setItems(items: VideoconferenciaItem[]): void {
		this._items.set(items);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	updateHabilitacion(horarioId: number, habilitada: boolean): void {
		this._items.update((items) =>
			items.map((item) => (item.horarioId === horarioId ? { ...item, habilitada } : item)),
		);
	}

	enterSala(item: VideoconferenciaItem): void {
		this._exceptionToken.set(null);
		this._activeSala.set(item);
	}

	enterSalaConExcepcion(item: VideoconferenciaItem, token: { jwt: string; appId: string }): void {
		this._exceptionToken.set(token);
		this._activeSala.set(item);
	}

	leaveSala(): void {
		this._activeSala.set(null);
		this._exceptionToken.set(null);
	}
	// #endregion
}
// #endregion
