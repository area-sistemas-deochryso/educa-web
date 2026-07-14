import { Injectable, signal } from '@angular/core';

import { SalonEstudianteListDto, EstudianteDisponibleDto } from '../../models';

export interface PendingConfirmAccion {
	accion: 'transferir' | 'retirar';
	estudianteId: number;
	advertencias: string[];
	salonDestinoId?: number;
	motivo?: string;
}

/**
 * Store propio de la tab "Estudiantes" del detalle de salón (brief 436).
 * Deliberadamente separado de ClassroomsAdminStore (~1650 líneas) — ver
 * decisión de diseño #1 del plan xrepo-85.
 */
@Injectable({ providedIn: 'root' })
export class ClassroomStudentsStore {
	// #region Estado privado
	private readonly _estudiantes = signal<SalonEstudianteListDto[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);

	private readonly _disponibles = signal<EstudianteDisponibleDto[]>([]);
	private readonly _searchLoading = signal(false);

	private readonly _actionLoading = signal(false);
	private readonly _pendingConfirm = signal<PendingConfirmAccion | null>(null);
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly estudiantes = this._estudiantes.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();

	readonly disponibles = this._disponibles.asReadonly();
	readonly searchLoading = this._searchLoading.asReadonly();

	readonly actionLoading = this._actionLoading.asReadonly();
	readonly pendingConfirm = this._pendingConfirm.asReadonly();
	// #endregion

	// #region ViewModel consolidado
	readonly vm = () => ({
		estudiantes: this._estudiantes(),
		loading: this._loading(),
		error: this._error(),
		disponibles: this._disponibles(),
		searchLoading: this._searchLoading(),
		actionLoading: this._actionLoading(),
		pendingConfirm: this._pendingConfirm(),
	});
	// #endregion

	// #region Comandos
	setEstudiantes(estudiantes: SalonEstudianteListDto[]): void {
		this._estudiantes.set(estudiantes);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	setDisponibles(disponibles: EstudianteDisponibleDto[]): void {
		this._disponibles.set(disponibles);
	}

	clearDisponibles(): void {
		this._disponibles.set([]);
	}

	setSearchLoading(loading: boolean): void {
		this._searchLoading.set(loading);
	}

	setActionLoading(loading: boolean): void {
		this._actionLoading.set(loading);
	}

	setPendingConfirm(pending: PendingConfirmAccion | null): void {
		this._pendingConfirm.set(pending);
	}

	/** Mutación quirúrgica: sacar un estudiante de la lista tras transferir/retirar exitoso. */
	removeEstudiante(estudianteId: number): void {
		this._estudiantes.update((list) => list.filter((e) => e.estudianteId !== estudianteId));
	}

	reset(): void {
		this._estudiantes.set([]);
		this._loading.set(false);
		this._error.set(null);
		this._disponibles.set([]);
		this._searchLoading.set(false);
		this._actionLoading.set(false);
		this._pendingConfirm.set(null);
	}
	// #endregion
}
