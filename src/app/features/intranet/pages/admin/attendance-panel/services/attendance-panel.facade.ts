import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, type Observable } from 'rxjs';

import { logger } from '@core/helpers';
import { UserProfileService } from '@core/services';
import { SedesApiService } from '../../users/services/sedes-api.service';

import {
	emptyPanelDto,
	type AttendancePanelFilters,
	type AttendancePanelHoraBucket,
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
	loadData(): void {
		const filters = this.store.filters();
		this.store.setLoading(true);
		this.store.setError(null);

		const esDia = filters.rango === 'dia';

		forkJoin({
			kpis: this.api.getKpis(filters),
			breakdown: this.api.getBreakdown(filters),
			horaBuckets: esDia ? this.api.getHoraBuckets(filters) : forkJoinEmpty<AttendancePanelHoraBucket>(),
			series: esDia ? forkJoinEmpty<AttendancePanelSerie>() : this.api.getSeries(filters),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ kpis, breakdown, horaBuckets, series }) => {
					const dto = emptyPanelDto();
					dto.kpis = kpis;
					dto.breakdown = breakdown;
					dto.horaBuckets = horaBuckets;
					dto.series = series;
					this.store.setDto(dto);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('[AttendancePanel] Error al cargar el panel', err);
					this.store.setError('No se pudo cargar el panel de asistencias.');
					this.store.setLoading(false);
				},
			});
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
