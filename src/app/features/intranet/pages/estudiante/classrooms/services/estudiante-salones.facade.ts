import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { StudentClassroomsStore } from './estudiante-salones.store';
import { EstudianteApiService } from '../../services/estudiante-api.service';
import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';

@Injectable({ providedIn: 'root' })
export class StudentClassroomsFacade {
	// #region Dependencias
	private readonly store = inject(StudentClassroomsStore);
	private readonly api = inject(EstudianteApiService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly errorHandler = inject(ErrorHandlerService);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Carga de datos
	loadData(): void {
		this.store.setLoading(true);
		this.store.setError(null);

		forkJoin({
			horarios: this.api.getMisHorarios(),
			notas: this.api.getMisNotas(),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ horarios, notas }) => {
					this.store.setHorarios(horarios);
					this.store.setNotasData(notas);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar datos de salones', err);
					this.store.setError('No se pudieron cargar los salones');
					this.store.setLoading(false);
				},
			});
	}
	/** Refresh notas data (bypasses any cache). */
	refreshNotas(): void {
		this.store.setNotasLoading(true);

		this.api
			.getMisNotas()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (notas) => {
					this.store.setNotasData(notas);
					this.store.setNotasLoading(false);
				},
				error: (err) => {
					logger.error('Error al refrescar notas', err);
					this.store.setNotasLoading(false);
				},
			});
	}
	// #endregion

	// #region Comandos de UI
	openDialog(salonId: number): void {
		this.store.openDialog(salonId);
	}

	closeDialog(): void {
		this.store.closeDialog();
	}
	// #endregion

	// #region Asistencia
	loadAsistencia(horarioId: number): void {
		if (this.store.asistenciaLoading()) return;
		this.store.setAsistenciaCursoId(horarioId);
		this.store.setAsistenciaLoading(true);

		this.api
			.getMiAsistencia(horarioId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setAsistenciaData(data);
					this.store.setAsistenciaLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar asistencia', err);
					this.store.setAsistenciaLoading(false);
				},
			});
	}
	// #endregion

	// #region Grupos
	loadGrupos(horarioId: number): void {
		if (this.store.gruposLoading()) return;
		this.store.setGruposCursoId(horarioId);
		this.store.setGruposLoading(true);

		this.api
			.getGruposHorario(horarioId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setGruposData(data);
					this.store.setGruposLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar grupos', err);
					this.store.setGruposLoading(false);
				},
			});
	}
	// #endregion
}
