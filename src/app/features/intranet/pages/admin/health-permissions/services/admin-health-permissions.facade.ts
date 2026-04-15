import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Subject, EMPTY } from 'rxjs';
import { switchMap, debounceTime, distinctUntilChanged, catchError, tap } from 'rxjs/operators';

import { logger } from '@core/helpers';
import { WalFacadeHelper } from '@core/services';
import { environment } from '@config';
// eslint-disable-next-line layer-enforcement/imports-error -- Razón: API service de health-permissions es cross-role (admin supervisa lo mismo que profesor gestiona); migración física a @intranet-shared diferida (ver maestro F3.5.C).
import { HealthPermissionsApiService } from '@features/intranet/pages/profesor/classrooms/services/health-permissions-api.service';
import { AdminHealthPermissionsStore } from './admin-health-permissions.store';
// eslint-disable-next-line layer-enforcement/imports-error -- Razón: DTOs del dominio health-permissions; ubicación física bajo profesor/ es histórica.
import { CreateHealthExitRequest, SymptomDto, ValidateDatesRequest } from '@features/intranet/pages/profesor/models';

@Injectable({ providedIn: 'root' })
export class AdminHealthPermissionsFacade {
	// #region Dependencias
	private api = inject(HealthPermissionsApiService);
	private store = inject(AdminHealthPermissionsStore);
	private destroyRef = inject(DestroyRef);
	private wal = inject(WalFacadeHelper);
	private readonly apiUrl = `${environment.apiUrl}/api/permisos-salud`;
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
	loadSalones(): void {
		if (this.store.salonesLoading()) return;
		this.store.setSalonesLoading(true);

		this.api.getSalones().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: (salones) => {
				this.store.setSalones(salones);
				this.store.setSalonesLoading(false);
			},
			error: (err) => {
				logger.error('Error cargando salones', err);
				this.store.setSalonesLoading(false);
			},
		});
	}

	onSalonChange(salonId: number): void {
		this.store.setSelectedSalonId(salonId);
		this.store.clearSalonData();
		this.loadResumen(salonId);
	}

	loadResumen(salonId: number): void {
		if (this.store.loading()) return;
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
				if ('sintomas' in result) this.store.setSintomas((result as { sintomas: SymptomDto[] }).sintomas);
				this.store.setLoading(false);
			},
			error: (err) => {
				logger.error('Error cargando resumen', err);
				this.store.setLoading(false);
			},
		});
	}
	// #endregion

	// #region Permiso de salida
	crearPermisoSalida(dto: CreateHealthExitRequest): void {
		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'permisos-salud-salida',
			endpoint: `${this.apiUrl}/salida`,
			method: 'POST',
			payload: dto,
			http$: () => this.api.crearPermisoSalida(dto),
			optimistic: {
				apply: () => this.store.closeExitDialog(),
				rollback: () => {},
			},
			onCommit: (permiso) => this.store.addPermisoSalida(permiso),
			onError: (err) => logger.error('Error creando permiso de salida', err),
		});
	}

	anularPermisoSalida(id: number): void {
		this.api.anularPermisoSalida(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => this.store.removePermisoSalida(id),
			error: (err) => logger.error('Error anulando permiso', err),
		});
	}
	// #endregion

	// #region Justificacion
	crearJustificacion(formData: FormData): void {
		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'permisos-salud-justificacion',
			endpoint: `${this.apiUrl}/justificacion`,
			method: 'POST',
			payload: formData,
			http$: () => this.api.crearJustificacion(formData),
			optimistic: {
				apply: () => this.store.closeJustificationDialog(),
				rollback: () => {},
			},
			onCommit: (j) => this.store.addJustificacion(j),
			onError: (err) => logger.error('Error creando justificación', err),
		});
	}

	anularJustificacion(id: number): void {
		this.api.anularJustificacion(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => this.store.removeJustificacion(id),
			error: (err) => logger.error('Error anulando justificación', err),
		});
	}

	validarFechas(estudianteId: number, fechas: Date[]): void {
		if (!fechas.length) { this.store.clearFechasValidacion(); return; }
		this.validateTrigger$.next({
			estudianteId,
			fechas: fechas.map((f) => f.toISOString().split('T')[0]),
		});
	}
	// #endregion

	// #region UI
	openExitDialog(): void { this.store.openExitDialog(); }
	closeExitDialog(): void { this.store.closeExitDialog(); }
	openJustificationDialog(): void { this.store.openJustificationDialog(); }
	closeJustificationDialog(): void { this.store.closeJustificationDialog(); }
	// #endregion
}
