import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, concat, forkJoin, map, of, switchMap, type Observable } from 'rxjs';

import { logger } from '@core/helpers';
import { UserProfileService } from '@core/services';
import { SedesApiService } from '../../users/services/sedes-api.service';

import {
	emptyPanelDto,
	type AttendancePanelFilters,
	type AttendancePanelHoraBucket,
	type AttendancePanelKpisPrevio,
	type AttendancePanelSerie,
} from '../models';
import { AttendancePanelService } from './attendance-panel.service';
import { AttendancePanelStore } from './attendance-panel.store';

/** Rama "no aplica para este rango" de un `forkJoin` combinado — evita 2 subscribes separados. */
function forkJoinEmpty<T>(): Observable<T[]> {
	return of([]);
}

@Injectable({ providedIn: 'root' })
export class AttendancePanelFacade {
	// #region Dependencias
	private readonly api = inject(AttendancePanelService);
	private readonly store = inject(AttendancePanelStore);
	private readonly userProfile = inject(UserProfileService);
	private readonly sedesApi = inject(SedesApiService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Inicialización
	/** Setea la sede propia del usuario como default si aún no hay una sede seleccionada. */
	initSedePropia(): void {
		if (this.store.filters().sedeId !== null) return;
		const propia = this.userProfile.sedeId();
		if (propia !== null) this.store.updateFilters({ sedeId: propia });
	}

	loadSedes(): void {
		this.sedesApi
			.listar()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((sedes) => this.store.setSedes(sedes));
	}
	// #endregion

	// #region Carga de datos
	private readonly load$ = new Subject<void>();

	constructor() {
		this.load$
			.pipe(
				switchMap(() => {
					const filters = this.store.filters();
					const esDia = filters.rango === 'dia';
					const principal$ = forkJoin({
						kpis: this.api.getKpis(filters),
						breakdown: this.api.getBreakdown(filters),
						horaBuckets: esDia
							? this.api.getHoraBuckets(filters)
							: forkJoinEmpty<AttendancePanelHoraBucket>(),
						series: esDia ? forkJoinEmpty<AttendancePanelSerie>() : this.api.getSeries(filters),
					});

					// Primero lo que el usuario ve (periodo actual); la comparación con el periodo
					// anterior llega después y solo completa las flechas de los KPIs. El `switchMap`
					// externo cancela ambas fases si cambian los filtros.
					return principal$.pipe(
						switchMap((result) =>
							concat(
								of({ fase: 'principal' as const, result }),
								this.api.getKpisPrevio(filters).pipe(
									map((previo) => ({ fase: 'previo' as const, previo })),
								),
							),
						),
						catchError((err) => {
							logger.error('[AttendancePanel] Error al cargar el panel', err);
							return of(null);
						}),
					);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((emision) => {
				if (!emision) {
					this.store.setError('No se pudo cargar el panel de asistencias.');
					this.store.setLoading(false);
					return;
				}
				if (emision.fase === 'previo') {
					this.store.patchKpis(emision.previo satisfies AttendancePanelKpisPrevio);
					return;
				}
				const dto = emptyPanelDto();
				dto.kpis = emision.result.kpis;
				dto.breakdown = emision.result.breakdown;
				dto.horaBuckets = emision.result.horaBuckets;
				dto.series = emision.result.series;
				this.store.setDto(dto);
				this.store.setLoading(false);
			});
	}

	loadData(): void {
		this.store.setLoading(true);
		this.store.setError(null);
		this.load$.next();
	}

	refresh(): void {
		this.loadData();
	}
	// #endregion

	// #region Filtros
	setSede(sedeId: number | null): void {
		this.store.updateFilters({ sedeId });
		this.loadData();
	}

	setRango(rango: AttendancePanelFilters['rango']): void {
		this.store.updateFilters({ rango });
		this.loadData();
	}

	setFecha(fecha: Date): void {
		this.store.updateFilters({ fecha });
		this.loadData();
	}
	// #endregion
}
