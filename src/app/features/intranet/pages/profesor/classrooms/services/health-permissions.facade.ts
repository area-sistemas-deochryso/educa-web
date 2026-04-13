import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subject, EMPTY } from 'rxjs';
import { switchMap, debounceTime, distinctUntilChanged, catchError, tap } from 'rxjs/operators';

import { logger } from '@core/helpers';
import { HealthPermissionsApiService } from './health-permissions-api.service';
import { HealthPermissionsStore } from './health-permissions.store';
import { CreateHealthExitRequest, SymptomDto, ValidateDatesRequest } from '@features/intranet/pages/profesor/models';

@Injectable({ providedIn: 'root' })
export class HealthPermissionsFacade {
	// #region Dependencias
	private api = inject(HealthPermissionsApiService);
	private store = inject(HealthPermissionsStore);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Validacion de fechas (debounced)
	private validateTrigger$ = new Subject<ValidateDatesRequest>();

	constructor() {
		this.validateTrigger$
			.pipe(
				debounceTime(500),
				distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
				tap(() => this.store.clearFechasValidacion()),
				switchMap((dto) =>
					this.api.validarFechas(dto).pipe(
						catchError((err) => {
							logger.error('Error validando fechas', err);
							return EMPTY;
						}),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => this.store.setFechasValidacion(result));
	}
	// #endregion

	// #region Carga de datos
	private _salonId: number | null = null;

	loadResumen(salonId: number): void {
		if (this.store.loading()) return;
		this._salonId = salonId;
		this.store.setLoading(true);

		const requests$ = this.store.sintomas().length > 0
			? forkJoin({
					resumen: this.api.getResumen(salonId),
					estudiantes: this.api.getEstudiantes(salonId),
				})
			: forkJoin({
					resumen: this.api.getResumen(salonId),
					estudiantes: this.api.getEstudiantes(salonId),
					sintomas: this.api.getSintomas(),
				});

		requests$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: (result) => {
				this.store.setPermisosSalida(result.resumen.permisosSalida);
				this.store.setJustificaciones(result.resumen.justificaciones);
				this.store.setEstudiantes(result.estudiantes);
				if ('sintomas' in result) {
					this.store.setSintomas((result as { sintomas: SymptomDto[] }).sintomas);
				}
				this.store.setLoading(false);
			},
			error: (err) => {
				logger.error('Error cargando resumen de permisos salud', err);
				this.store.setLoading(false);
			},
		});
	}
	// #endregion

	// #region Permiso de salida
	crearPermisoSalida(dto: CreateHealthExitRequest): void {
		this.store.setSaving(true);

		this.api
			.crearPermisoSalida(dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (permiso) => {
					this.store.addPermisoSalida(permiso);
					this.store.closeExitDialog();
					this.store.setSaving(false);
					logger.log('Permiso de salida creado');
				},
				error: (err) => {
					logger.error('Error creando permiso de salida', err);
					this.store.setSaving(false);
				},
			});
	}

	anularPermisoSalida(id: number): void {
		this.api
			.anularPermisoSalida(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.removePermisoSalida(id);
					logger.log('Permiso de salida anulado');
				},
				error: (err) => logger.error('Error anulando permiso', err),
			});
	}
	// #endregion

	// #region Justificacion medica
	crearJustificacion(formData: FormData): void {
		this.store.setSaving(true);

		this.api
			.crearJustificacion(formData)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (justificacion) => {
					this.store.addJustificacion(justificacion);
					this.store.closeJustificationDialog();
					this.store.setSaving(false);
					logger.log('Justificación médica creada');
				},
				error: (err) => {
					logger.error('Error creando justificación', err);
					this.store.setSaving(false);
				},
			});
	}

	anularJustificacion(id: number): void {
		this.api
			.anularJustificacion(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.removeJustificacion(id);
					logger.log('Justificación médica anulada');
				},
				error: (err) => logger.error('Error anulando justificación', err),
			});
	}

	validarFechas(estudianteId: number, fechas: Date[]): void {
		if (!fechas.length) {
			this.store.clearFechasValidacion();
			return;
		}

		this.validateTrigger$.next({
			estudianteId,
			fechas: fechas.map((f) => f.toISOString().split('T')[0]),
		});
	}
	// #endregion

	// #region UI
	openExitDialog(): void {
		this.store.openExitDialog();
	}

	closeExitDialog(): void {
		this.store.closeExitDialog();
	}

	openJustificationDialog(): void {
		this.store.openJustificationDialog();
	}

	closeJustificationDialog(): void {
		this.store.closeJustificationDialog();
	}
	// #endregion
}
