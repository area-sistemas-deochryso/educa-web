// #region Imports
import { Injectable, signal, computed } from '@angular/core';

// #endregion

export interface VideoconferenciaItem {
	horarioId: number;
	cursoId: number;
	cursoNombre: string;
	salonDescripcion: string;
	diaSemanaDescripcion: string;
	horaInicio: string;
	horaFin: string;
	profesorNombreCompleto: string | null;
	cantidadEstudiantes: number;
}

// #region Implementation
@Injectable({ providedIn: 'root' })
export class VideoconferenciasStore {
	// #region Estado privado
	private readonly _items = signal<VideoconferenciaItem[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _activeSala = signal<VideoconferenciaItem | null>(null);
	// #endregion

	// #region Lecturas públicas
	readonly items = this._items.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly activeSala = this._activeSala.asReadonly();
	readonly inSala = computed(() => this._activeSala() !== null);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this.items(),
		loading: this.loading(),
		error: this.error(),
		isEmpty: !this.loading() && this.items().length === 0,
		activeSala: this.activeSala(),
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

	enterSala(item: VideoconferenciaItem): void {
		this._activeSala.set(item);
	}

	leaveSala(): void {
		this._activeSala.set(null);
	}
	// #endregion
}
// #endregion
