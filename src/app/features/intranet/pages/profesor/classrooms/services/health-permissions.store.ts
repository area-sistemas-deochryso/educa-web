import { Injectable, signal, computed } from '@angular/core';

import {
	HealthExitPermissionDto,
	HealthJustificationDto,
	StudentForHealthDto,
	SymptomDto,
	DateValidationResult,
} from '@features/intranet/pages/profesor/models';

@Injectable({ providedIn: 'root' })
export class HealthPermissionsStore {
	// #region Estado privado
	private readonly _permisosSalida = signal<HealthExitPermissionDto[]>([]);
	private readonly _justificaciones = signal<HealthJustificationDto[]>([]);
	private readonly _estudiantes = signal<StudentForHealthDto[]>([]);
	private readonly _sintomas = signal<SymptomDto[]>([]);
	private readonly _fechasValidacion = signal<DateValidationResult[]>([]);
	private readonly _loading = signal(false);
	private readonly _saving = signal(false);
	private readonly _exitDialogVisible = signal(false);
	private readonly _justificationDialogVisible = signal(false);
	// #endregion

	// #region Lecturas publicas
	readonly permisosSalida = this._permisosSalida.asReadonly();
	readonly justificaciones = this._justificaciones.asReadonly();
	readonly estudiantes = this._estudiantes.asReadonly();
	readonly sintomas = this._sintomas.asReadonly();
	readonly fechasValidacion = this._fechasValidacion.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly saving = this._saving.asReadonly();
	readonly exitDialogVisible = this._exitDialogVisible.asReadonly();
	readonly justificationDialogVisible = this._justificationDialogVisible.asReadonly();
	// #endregion

	// #region Computed
	readonly estudiantesConEntrada = computed(() =>
		this._estudiantes().filter((e) => e.tieneEntradaHoy),
	);

	readonly vm = computed(() => ({
		permisosSalida: this._permisosSalida(),
		justificaciones: this._justificaciones(),
		estudiantes: this._estudiantes(),
		estudiantesConEntrada: this.estudiantesConEntrada(),
		sintomas: this._sintomas(),
		fechasValidacion: this._fechasValidacion(),
		loading: this._loading(),
		saving: this._saving(),
		exitDialogVisible: this._exitDialogVisible(),
		justificationDialogVisible: this._justificationDialogVisible(),
	}));
	// #endregion

	// #region Comandos de mutacion
	setPermisosSalida(permisos: HealthExitPermissionDto[]): void {
		this._permisosSalida.set(permisos);
	}

	addPermisoSalida(permiso: HealthExitPermissionDto): void {
		this._permisosSalida.update((list) => [permiso, ...list]);
	}

	removePermisoSalida(id: number): void {
		this._permisosSalida.update((list) => list.filter((p) => p.id !== id));
	}

	setJustificaciones(justificaciones: HealthJustificationDto[]): void {
		this._justificaciones.set(justificaciones);
	}

	addJustificacion(justificacion: HealthJustificationDto): void {
		this._justificaciones.update((list) => [justificacion, ...list]);
	}

	removeJustificacion(id: number): void {
		this._justificaciones.update((list) => list.filter((j) => j.id !== id));
	}

	setEstudiantes(estudiantes: StudentForHealthDto[]): void {
		this._estudiantes.set(estudiantes);
	}

	setSintomas(sintomas: SymptomDto[]): void {
		this._sintomas.set(sintomas);
	}

	setFechasValidacion(fechas: DateValidationResult[]): void {
		this._fechasValidacion.set(fechas);
	}

	clearFechasValidacion(): void {
		this._fechasValidacion.set([]);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setSaving(saving: boolean): void {
		this._saving.set(saving);
	}
	// #endregion

	// #region Comandos de UI
	openExitDialog(): void {
		this._exitDialogVisible.set(true);
	}

	closeExitDialog(): void {
		this._exitDialogVisible.set(false);
	}

	openJustificationDialog(): void {
		this._justificationDialogVisible.set(true);
	}

	closeJustificationDialog(): void {
		this._justificationDialogVisible.set(false);
		this.clearFechasValidacion();
	}
	// #endregion
}
