import { computed, Injectable, signal } from '@angular/core';

import {
	EmailDiagnosticoDto,
	PersonaConCorreoDto,
} from '../models/correo-individual.models';

@Injectable({ providedIn: 'root' })
export class CorreoIndividualStore {
	// #region Estado privado
	private readonly _dto = signal<EmailDiagnosticoDto | null>(null);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	// * Input actual del admin (antes de enviar al BE). Se vacía al limpiar.
	private readonly _correoInput = signal<string>('');
	// * Typeahead — Plan 36 Chat 4b. Personas matchadas por nombre/apellido/correo/DNI.
	private readonly _sugerencias = signal<PersonaConCorreoDto[]>([]);
	private readonly _loadingSugerencias = signal(false);
	private readonly _sugerenciasTotal = signal(0);
	// #endregion

	// #region Lecturas públicas
	readonly dto = this._dto.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly correoInput = this._correoInput.asReadonly();
	readonly sugerencias = this._sugerencias.asReadonly();
	readonly loadingSugerencias = this._loadingSugerencias.asReadonly();
	readonly sugerenciasTotal = this._sugerenciasTotal.asReadonly();
	// #endregion

	// #region Computed
	readonly correoConsultado = computed(() => this._dto()?.correoConsultado ?? null);
	readonly resumen = computed(() => this._dto()?.resumen ?? null);
	readonly historia = computed(() => this._dto()?.historia ?? []);
	readonly blacklist = computed(() => this._dto()?.blacklist ?? null);
	readonly personasAsociadas = computed(() => this._dto()?.personasAsociadas ?? []);
	readonly generatedAt = computed(() => this._dto()?.generatedAt ?? null);
	readonly hasResult = computed(() => this._dto() !== null);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		dto: this._dto(),
		loading: this._loading(),
		error: this._error(),
		correoInput: this._correoInput(),
		correoConsultado: this.correoConsultado(),
		resumen: this.resumen(),
		historia: this.historia(),
		blacklist: this.blacklist(),
		personasAsociadas: this.personasAsociadas(),
		generatedAt: this.generatedAt(),
		hasResult: this.hasResult(),
		sugerencias: this._sugerencias(),
		loadingSugerencias: this._loadingSugerencias(),
		sugerenciasTotal: this._sugerenciasTotal(),
	}));
	// #endregion

	// #region Comandos de mutación
	setDto(dto: EmailDiagnosticoDto | null): void {
		this._dto.set(dto);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	setCorreoInput(value: string): void {
		this._correoInput.set(value);
	}

	setSugerencias(personas: PersonaConCorreoDto[], total: number): void {
		this._sugerencias.set(personas);
		this._sugerenciasTotal.set(total);
	}

	setLoadingSugerencias(loading: boolean): void {
		this._loadingSugerencias.set(loading);
	}

	clearSugerencias(): void {
		this._sugerencias.set([]);
		this._sugerenciasTotal.set(0);
	}

	clear(): void {
		this._dto.set(null);
		this._error.set(null);
		this._correoInput.set('');
		this._sugerencias.set([]);
		this._sugerenciasTotal.set(0);
	}
	// #endregion
}
