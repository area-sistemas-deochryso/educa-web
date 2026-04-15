import { Injectable, signal, computed } from '@angular/core';

/* eslint-disable layer-enforcement/imports-error -- Razón: DTOs del dominio health-permissions cross-role; ubicación física bajo profesor/ es histórica. Migración a @intranet-shared diferida (ver maestro F3.5.C). */
import {
	HealthExitPermissionDto,
	HealthJustificationDto,
	StudentForHealthDto,
	SymptomDto,
	DateValidationResult,
} from '@features/intranet/pages/profesor/models';
/* eslint-enable layer-enforcement/imports-error */
import { SalonForHealthDto } from '../models/admin-health-permissions.models';

@Injectable({ providedIn: 'root' })
export class AdminHealthPermissionsStore {
	// #region Estado privado
	private readonly _salones = signal<SalonForHealthDto[]>([]);
	private readonly _selectedSalonId = signal<number | null>(null);
	private readonly _permisosSalida = signal<HealthExitPermissionDto[]>([]);
	private readonly _justificaciones = signal<HealthJustificationDto[]>([]);
	private readonly _estudiantes = signal<StudentForHealthDto[]>([]);
	private readonly _sintomas = signal<SymptomDto[]>([]);
	private readonly _fechasValidacion = signal<DateValidationResult[]>([]);
	private readonly _salonesLoading = signal(false);
	private readonly _loading = signal(false);
	private readonly _saving = signal(false);
	private readonly _exitDialogVisible = signal(false);
	private readonly _justificationDialogVisible = signal(false);
	// #endregion

	// #region Lecturas publicas
	readonly salones = this._salones.asReadonly();
	readonly selectedSalonId = this._selectedSalonId.asReadonly();
	readonly permisosSalida = this._permisosSalida.asReadonly();
	readonly justificaciones = this._justificaciones.asReadonly();
	readonly estudiantes = this._estudiantes.asReadonly();
	readonly sintomas = this._sintomas.asReadonly();
	readonly fechasValidacion = this._fechasValidacion.asReadonly();
	readonly salonesLoading = this._salonesLoading.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly saving = this._saving.asReadonly();
	readonly exitDialogVisible = this._exitDialogVisible.asReadonly();
	readonly justificationDialogVisible = this._justificationDialogVisible.asReadonly();
	// #endregion

	// #region Computed
	readonly estudiantesConEntrada = computed(() =>
		this._estudiantes().filter((e) => e.tieneEntradaHoy),
	);

	readonly salonOptions = computed(() =>
		this._salones().map((s) => ({ label: `${s.descripcion} (${s.cantidadEstudiantes} est.)`, value: s.id })),
	);

	readonly vm = computed(() => ({
		salones: this._salones(),
		salonOptions: this.salonOptions(),
		selectedSalonId: this._selectedSalonId(),
		permisosSalida: this._permisosSalida(),
		justificaciones: this._justificaciones(),
		estudiantes: this._estudiantes(),
		estudiantesConEntrada: this.estudiantesConEntrada(),
		sintomas: this._sintomas(),
		fechasValidacion: this._fechasValidacion(),
		salonesLoading: this._salonesLoading(),
		loading: this._loading(),
		saving: this._saving(),
		exitDialogVisible: this._exitDialogVisible(),
		justificationDialogVisible: this._justificationDialogVisible(),
	}));
	// #endregion

	// #region Comandos
	setSalones(salones: SalonForHealthDto[]): void { this._salones.set(salones); }
	setSelectedSalonId(id: number | null): void { this._selectedSalonId.set(id); }
	setPermisosSalida(p: HealthExitPermissionDto[]): void { this._permisosSalida.set(p); }
	addPermisoSalida(p: HealthExitPermissionDto): void { this._permisosSalida.update((l) => [p, ...l]); }
	removePermisoSalida(id: number): void { this._permisosSalida.update((l) => l.filter((p) => p.id !== id)); }
	setJustificaciones(j: HealthJustificationDto[]): void { this._justificaciones.set(j); }
	addJustificacion(j: HealthJustificationDto): void { this._justificaciones.update((l) => [j, ...l]); }
	removeJustificacion(id: number): void { this._justificaciones.update((l) => l.filter((j) => j.id !== id)); }
	setEstudiantes(e: StudentForHealthDto[]): void { this._estudiantes.set(e); }
	setSintomas(s: SymptomDto[]): void { this._sintomas.set(s); }
	setFechasValidacion(f: DateValidationResult[]): void { this._fechasValidacion.set(f); }
	clearFechasValidacion(): void { this._fechasValidacion.set([]); }
	setSalonesLoading(v: boolean): void { this._salonesLoading.set(v); }
	setLoading(v: boolean): void { this._loading.set(v); }
	setSaving(v: boolean): void { this._saving.set(v); }
	openExitDialog(): void { this._saving.set(false); this._exitDialogVisible.set(true); }
	closeExitDialog(): void { this._exitDialogVisible.set(false); }
	openJustificationDialog(): void { this._saving.set(false); this._justificationDialogVisible.set(true); }
	closeJustificationDialog(): void { this._justificationDialogVisible.set(false); this.clearFechasValidacion(); }

	clearSalonData(): void {
		this._permisosSalida.set([]);
		this._justificaciones.set([]);
		this._estudiantes.set([]);
		this._fechasValidacion.set([]);
	}
	// #endregion
}
