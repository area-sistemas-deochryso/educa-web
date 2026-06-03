import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { withRetry, facadeErrorHandler } from '@core/helpers';
import { ActivityTrackerService } from '@core/services/error';
import { ErrorHandlerService, WalFacadeHelper, WalCrossTabRefetchService } from '@core/services';
import { environment } from '@config';
import { UI_SUMMARIES, UI_ASISTENCIA_SUCCESS_MESSAGES } from '@shared/constants';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoStore } from './curso-contenido.store';
import { AttendanceCourseStore } from './attendance-course.store';
import { EstadoAsistenciaCurso, RegistrarAsistenciaCursoDto } from '../../models';

@Injectable({ providedIn: 'root' })
export class AttendanceCourseFacade {
	// #region Dependencias
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(AttendanceCourseStore);
	private readonly contenidoStore = inject(CursoContenidoStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly wal = inject(WalFacadeHelper);
	private readonly crossTabRefetch = inject(WalCrossTabRefetchService);
	private readonly activityTracker = inject(ActivityTrackerService);
	private readonly errHandler = facadeErrorHandler({
		tag: 'AttendanceCourseFacade',
		errorHandler: this.errorHandler,
	});
	private readonly apiUrl = `${environment.apiUrl}/api/AsistenciaCurso`;
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	constructor() {
		this.crossTabRefetch.subscribe({
			resourceType: 'asistenciaCurso',
			refetchItems: () => {
				const horarioId = this.getHorarioId();
				const data = this.store.registroData();
				if (horarioId && data) this.loadRegistro(data.fecha, horarioId);
			},
			destroyRef: this.destroyRef,
		});
	}

	// #region Helpers privados
	private getHorarioId(): number | null {
		return this.contenidoStore.contenido()?.horarioId ?? null;
	}
	// #endregion

	// #region Comandos de carga
	loadRegistro(fecha: string, overrideHorarioId?: number): void {
		const horarioId = overrideHorarioId ?? this.getHorarioId();
		if (!horarioId) return;

		this.store.setRegistroLoading(true);

		this.api
			.getAsistenciaCursoFecha(horarioId, fecha)
			.pipe(
				withRetry({ tag: 'AsistenciaCursoFacade:loadRegistro' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (data) => {
					this.store.setRegistroData(data);
					this.store.setRegistroLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar asistencia');
					this.store.setRegistroLoading(false);
				},
			});
	}

	loadResumen(fechaInicio: string, fechaFin: string, overrideHorarioId?: number): void {
		const horarioId = overrideHorarioId ?? this.getHorarioId();
		if (!horarioId) return;

		this.store.setResumenLoading(true);

		this.api
			.getAsistenciaCursoResumen(horarioId, fechaInicio, fechaFin)
			.pipe(
				withRetry({ tag: 'AsistenciaCursoFacade:loadResumen' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (data) => {
					this.store.setResumen(data);
					this.store.setResumenLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar resumen de asistencia');
					this.store.setResumenLoading(false);
				},
			});
	}
	// #endregion

	// #region Comandos de registro

	registrar(overrideHorarioId?: number): void {
		const horarioId = overrideHorarioId ?? this.getHorarioId();
		const data = this.store.registroData();
		if (!horarioId || !data) return;

		this.activityTracker.track('USER_ACTION', `Registrar asistencia: ${data.estudiantes.length} estudiantes`, { action: 'form_submit' });

		const dto: RegistrarAsistenciaCursoDto = {
			fecha: data.fecha,
			asistencias: data.estudiantes.map((e) => ({
				estudianteId: e.estudianteId,
				estado: e.estado,
				justificacion: e.estado !== 'P' ? e.justificacion : null,
			})),
		};

		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'asistenciaCurso',
			endpoint: `${this.apiUrl}/horario/${horarioId}/registrar`,
			method: 'POST',
			payload: dto,
			http$: () => this.api.registrarAsistenciaCurso(horarioId, dto),
			optimistic: {
				apply: () => this.store.setRegistroSaving(true),
				rollback: () => this.store.setRegistroSaving(false),
			},
			onCommit: () => {
				this.store.setRegistroSaving(false);
				this.errorHandler.showSuccess(UI_SUMMARIES.success, UI_ASISTENCIA_SUCCESS_MESSAGES.registered);
			},
			onError: (err) => {
				this.errHandler.handle(err, 'registrar asistencia');
				this.store.setRegistroSaving(false);
			},
		});
	}
	// #endregion

	// #region Comandos de estado
	setEstudianteEstado(estudianteId: number, estado: EstadoAsistenciaCurso): void {
		this.store.updateEstudianteEstado(estudianteId, estado);
	}

	setEstudianteJustificacion(estudianteId: number, justificacion: string | null): void {
		this.store.updateEstudianteJustificacion(estudianteId, justificacion);
	}

	resetAsistencia(): void {
		this.store.reset();
	}
	// #endregion

	// #endregion
}
