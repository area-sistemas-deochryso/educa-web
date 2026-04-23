import { computed, Injectable, signal } from '@angular/core';

import { EmailOutboxLista } from '@data/models/email-outbox.models';

import { EmailDashboardDiaDto } from '../models/email-dashboard-dia.models';

@Injectable({ providedIn: 'root' })
export class EmailOutboxDashboardDiaStore {
	// #region Estado privado
	private readonly _dto = signal<EmailDashboardDiaDto | null>(null);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	// * fechaConsulta es la fecha actualmente pedida al BE (ISO yyyy-MM-dd).
	// * null = "hoy Lima" implícito del BE.
	private readonly _fechaConsulta = signal<string | null>(null);
	// * Registros crudos FAILED del día (reusa endpoint /listar).
	private readonly _fallosDia = signal<EmailOutboxLista[]>([]);
	// #endregion

	// #region Lecturas públicas
	readonly dto = this._dto.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly fechaConsulta = this._fechaConsulta.asReadonly();
	readonly fallosDia = this._fallosDia.asReadonly();
	// #endregion

	// #region Computed
	readonly resumen = computed(() => this._dto()?.resumen ?? null);
	readonly porHora = computed(() => this._dto()?.porHora ?? []);
	readonly porTipo = computed(() => this._dto()?.porTipo ?? []);
	readonly bouncesAcumulados = computed(() => this._dto()?.bouncesAcumulados ?? []);
	readonly generatedAt = computed(() => this._dto()?.generatedAt ?? null);
	readonly fecha = computed(() => this._dto()?.fecha ?? null);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		dto: this._dto(),
		loading: this._loading(),
		error: this._error(),
		fechaConsulta: this._fechaConsulta(),
		resumen: this.resumen(),
		porHora: this.porHora(),
		porTipo: this.porTipo(),
		bouncesAcumulados: this.bouncesAcumulados(),
		generatedAt: this.generatedAt(),
		fecha: this.fecha(),
		fallosDia: this._fallosDia(),
	}));
	// #endregion

	// #region Comandos de mutación
	setDto(dto: EmailDashboardDiaDto | null): void {
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

	setFallosDia(items: EmailOutboxLista[]): void {
		this._fallosDia.set(items);
	}
	// #endregion
}
