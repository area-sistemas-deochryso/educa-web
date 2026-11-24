// #region Imports
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, map, of, switchMap, tap } from 'rxjs';

import { logger } from '@core/helpers';
import type { SalonEstudianteListDto } from '@features/intranet/pages/admin/classrooms/models';
import { ClassroomsAdminApiService } from '@features/intranet/pages/admin/classrooms/services';
import { SalonEstudiantesApiService } from '@features/intranet/pages/admin/classrooms/services/salon-estudiantes-api.service';
import { type OpcionSalon, TODOS_LOS_SALONES, opcionesSalon } from './alumnos-salon.logic';
// #endregion

/**
 * Datos del filtro por salón del paso «Generar cargos» (P123 F8): los salones del año y los alumnos del salón elegido.
 * Solo lee; lo que se marca como «nuevo» lo guarda el componente. Se provee a nivel de componente.
 * Un facade no importa a otro: lee a través de los servicios de API de `classrooms`.
 * `switchMap` descarta la respuesta de un salón viejo si ya se eligió otro.
 */
@Injectable()
export class AlumnosSalonFacade {
	private readonly salonesApi = inject(ClassroomsAdminApiService);
	private readonly alumnosApi = inject(SalonEstudiantesApiService);
	private readonly destroyRef = inject(DestroyRef);

	readonly opciones = signal<OpcionSalon[]>([TODOS_LOS_SALONES]);
	readonly alumnos = signal<SalonEstudianteListDto[]>([]);
	readonly cargandoAlumnos = signal(false);
	readonly error = signal<string | null>(null);

	private readonly anio$ = new Subject<number>();
	private readonly salon$ = new Subject<number | null>();

	constructor() {
		this.anio$
			.pipe(
				tap(() => this.error.set(null)),
				// Los salones de verano son otro calendario: la matrícula del año es la regular.
				switchMap((anio) =>
					this.salonesApi.getSalonesAdmin(anio, false).pipe(
						map((lista) => opcionesSalon(lista)),
						catchError((err: unknown) => {
							logger.error('[AlumnosSalonFacade] Error al cargar los salones', err);
							this.error.set('No se pudieron cargar los salones. Se generará para todo el año.');
							return of([TODOS_LOS_SALONES]);
						}),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((opciones) => this.opciones.set(opciones));

		this.salon$
			.pipe(
				tap((salonId) => {
					this.alumnos.set([]);
					this.error.set(null);
					this.cargandoAlumnos.set(salonId !== null);
				}),
				switchMap((salonId) => {
					if (salonId === null) return EMPTY;
					return this.alumnosApi.listarPorSalon(salonId).pipe(
						catchError((err: unknown) => {
							logger.error('[AlumnosSalonFacade] Error al cargar los alumnos del salón', err);
							this.error.set('No se pudieron cargar los alumnos del salón.');
							return of<SalonEstudianteListDto[]>([]);
						}),
					);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((alumnos) => {
				this.alumnos.set(alumnos);
				this.cargandoAlumnos.set(false);
			});
	}

	cargarSalones(anio: number): void {
		this.opciones.set([TODOS_LOS_SALONES]);
		this.anio$.next(anio);
	}

	elegirSalon(salonId: number | null): void {
		this.salon$.next(salonId);
	}
}
