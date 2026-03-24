import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { withRetry, facadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoStore } from './curso-contenido.store';
import { AsistenciaCursoStore } from './asistencia-curso.store';
import { EstadoAsistenciaCurso, RegistrarAsistenciaCursoDto } from '../../models';

@Injectable({ providedIn: 'root' })
export class AsistenciaCursoFacade {
	// #region Dependencias
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(AsistenciaCursoStore);
	private readonly contenidoStore = inject(CursoContenidoStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly errHandler = facadeErrorHandler({
		tag: 'AsistenciaCursoFacade',
		errorHandler: this.errorHandler,
	});
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

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

	/**
	 * Registrar asistencia con protección WAL.
	 * Si está offline, el batch se guarda en IndexedDB y se envía al reconectar.
	 */
	registrar(overrideHorarioId?: number): void {
		const horarioId = overrideHorarioId ?? this.getHorarioId();
		const data = this.store.registroData();
		if (!horarioId || !data) return;

		this.store.setRegistroSaving(true);

		const dto: RegistrarAsistenciaCursoDto = {
			fecha: data.fecha,
			asistencias: data.estudiantes.map((e) => ({
				estudianteId: e.estudianteId,
				estado: e.estado,
				justificacion: e.estado !== 'P' ? e.justificacion : null,
			})),
		};

		this.api.registrarAsistenciaCurso(horarioId, dto).subscribe({
			next: () => {
				this.store.setRegistroSaving(false);
				this.errorHandler.showSuccess('Éxito', 'Asistencia registrada exitosamente');
			},
			error: (err) => {
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
