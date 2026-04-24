import { computed, Injectable, signal } from '@angular/core';

import { DiagnosticoCorreosDiaDto } from '../models/correos-dia.models';

@Injectable({ providedIn: 'root' })
export class CorreosDiaStore {
	// #region Estado privado
	private readonly _dto = signal<DiagnosticoCorreosDiaDto | null>(null);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	// * fechaConsulta null = "hoy Lima" implícito del BE.
	private readonly _fechaConsulta = signal<string | null>(null);
	private readonly _sedeId = signal<number | null>(null);
	// #endregion

	// #region Lecturas públicas
	readonly dto = this._dto.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly fechaConsulta = this._fechaConsulta.asReadonly();
	readonly sedeId = this._sedeId.asReadonly();
	// #endregion

	// #region Computed
	readonly resumen = computed(() => this._dto()?.resumen ?? null);
	readonly estudiantesSinCorreo = computed(
		() => this._dto()?.estudiantesSinCorreo ?? [],
	);
	readonly apoderadosBlacklisteados = computed(
		() => this._dto()?.apoderadosBlacklisteados ?? [],
	);
	readonly entradasSinCorreoEnviado = computed(
		() => this._dto()?.entradasSinCorreoEnviado ?? [],
	);
	readonly fecha = computed(() => this._dto()?.fecha ?? null);
	readonly generatedAt = computed(() => this._dto()?.generatedAt ?? null);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		dto: this._dto(),
		loading: this._loading(),
		error: this._error(),
		fechaConsulta: this._fechaConsulta(),
		sedeId: this._sedeId(),
		resumen: this.resumen(),
		estudiantesSinCorreo: this.estudiantesSinCorreo(),
		apoderadosBlacklisteados: this.apoderadosBlacklisteados(),
		entradasSinCorreoEnviado: this.entradasSinCorreoEnviado(),
		fecha: this.fecha(),
		generatedAt: this.generatedAt(),
	}));
	// #endregion

	// #region Comandos de mutación
	setDto(dto: DiagnosticoCorreosDiaDto | null): void {
		this._dto.set(dto);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	setFechaConsulta(fecha: string | null): void {
		this._fechaConsulta.set(fecha);
	}

	setSedeId(sedeId: number | null): void {
		this._sedeId.set(sedeId);
	}
	// #endregion
}
