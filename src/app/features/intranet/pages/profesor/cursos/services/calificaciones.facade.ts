import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { withRetry, facadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { environment } from '@config';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoStore } from './curso-contenido.store';
import { CalificacionesStore } from './calificaciones.store';
import {
	CrearCalificacionDto,
	CalificarLoteDto,
	ActualizarNotaDto,
	CrearPeriodoDto,
	CalificacionConNotasDto,
	CalificacionDto,
	CalificarGruposLoteDto,
	CambiarTipoCalificacionDto,
} from '../../models';

@Injectable({ providedIn: 'root' })
export class CalificacionesFacade {
	// #region Dependencias
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(CalificacionesStore);
	private readonly contenidoStore = inject(CursoContenidoStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly wal = inject(WalFacadeHelper);
	private readonly destroyRef = inject(DestroyRef);
	private readonly calificacionUrl = `${environment.apiUrl}/api/Calificacion`;
	private readonly errHandler = facadeErrorHandler({
		tag: 'CalificacionesFacade',
		errorHandler: this.errorHandler,
	});
	private readonly grupoUrl = `${environment.apiUrl}/api/GrupoContenido`;
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos de carga

	loadCalificaciones(contenidoId: number): void {
		this.store.setLoading(true);

		// salonId resuelto por el caller y almacenado en contenidoStore
		const salonId = this.contenidoStore.salonId();

		forkJoin({
			calificaciones: this.api.getCalificaciones(contenidoId).pipe(
				withRetry({ tag: 'CalificacionesFacade:loadCalificaciones' }),
			),
			periodos: this.api.getPeriodos(contenidoId).pipe(
				withRetry({ tag: 'CalificacionesFacade:loadPeriodos' }),
			),
			...(salonId
				? { salon: this.api.getEstudiantesSalon(salonId) }
				: {}),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.store.setCalificaciones(result.calificaciones);
					this.store.setPeriodos(result.periodos);
					if ('salon' in result && result.salon) {
						this.store.setSalonEstudiantes(result.salon.estudiantes);
					}
					this.store.setLoading(false);
				},
				error: (err) => this.errHandler.handle(err, 'cargar calificaciones', () => {
					this.store.setLoading(false);
				}),
			});
	}

	// #endregion

	// #region CRUD Calificaciones

	/** Create evaluation with WAL → quirurgical add on commit. */
	crearCalificacion(dto: CrearCalificacionDto): void {
		this.store.setSaving(true);

		this.wal.execute<CalificacionConNotasDto>({
			operation: 'CREATE',
			resourceType: 'Calificacion',
			endpoint: this.calificacionUrl,
			method: 'POST',
			payload: dto,
			http$: () => this.api.crearCalificacion(dto),
			onCommit: (cal) => {
				this.store.addCalificacion(cal);
				this.store.setSaving(false);
				this.store.closeCalificacionDialog();
			},
			onError: (err) => {
				this.errHandler.handle(err,'crear evaluación');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => {
					// Close dialog immediately for better UX
					this.store.closeCalificacionDialog();
				},
				rollback: () => {
					// Re-open dialog on failure
					this.store.openCalificacionDialog(null);
				},
			},
		});
	}

	/**
	 * Batch-grade students → server-confirmed (INV-C04: promedios recalculados server-side,
	 * optimistic local imposible sin duplicar lógica de ponderación).
	 */
	calificarLote(calificacionId: number, dto: CalificarLoteDto, contenidoId: number): void {
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'Calificacion',
			resourceId: calificacionId,
			endpoint: `${this.calificacionUrl}/${calificacionId}/calificar`,
			method: 'POST',
			payload: dto,
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.calificarLote(calificacionId, dto),
			onCommit: () => {
				this.refreshCalificaciones(contenidoId);
				this.store.closeCalificarDialog();
			},
			onError: (err) => {
				this.errHandler.handle(err, 'calificar estudiantes');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
		});
	}

	/**
	 * Batch-grade by groups → server-confirmed (INV-C04: promedios recalculados server-side,
	 * estructura de notas grupales no replicable localmente).
	 */
	calificarGruposLote(calificacionId: number, dto: CalificarGruposLoteDto, contenidoId: number): void {
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'Calificacion',
			resourceId: calificacionId,
			endpoint: `${this.grupoUrl}/${calificacionId}/calificar-grupos`,
			method: 'POST',
			payload: dto,
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.calificarGruposLote(calificacionId, dto),
			onCommit: () => {
				this.refreshCalificaciones(contenidoId);
				this.store.closeCalificarDialog();
			},
			onError: (err) => {
				this.errHandler.handle(err, 'calificar grupos');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
		});
	}

	/**
	 * Update individual grade → server-confirmed (INV-C04: promedios por semana/periodo
	 * se recalculan server-side; INV-T04: ventana de 2 meses validada por backend).
	 */
	actualizarNota(notaId: number, dto: ActualizarNotaDto, contenidoId: number): void {
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'Calificacion',
			resourceId: notaId,
			endpoint: `${this.calificacionUrl}/nota/${notaId}`,
			method: 'PUT',
			payload: dto,
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.actualizarNota(notaId, dto),
			onCommit: () => {
				this.refreshCalificaciones(contenidoId);
			},
			onError: (err) => {
				this.errHandler.handle(err, 'actualizar nota');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
		});
	}

	/** Delete evaluation with WAL → quirurgical removal. */
	eliminarCalificacion(calificacionId: number): void {
		const snapshot = this.store.calificaciones().find((c) => c.id === calificacionId);
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'Calificacion',
			resourceId: calificacionId,
			endpoint: `${this.calificacionUrl}/${calificacionId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarCalificacion(calificacionId),
			onCommit: () => {
				this.store.setSaving(false);
			},
			onError: (err) => {
				this.errHandler.handle(err,'eliminar evaluación');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => {
					this.store.removeCalificacion(calificacionId);
				},
				rollback: () => {
					if (snapshot) this.store.addCalificacion(snapshot);
				},
			},
		});
	}

	/**
	 * Change evaluation type (individual ↔ grupal) → server-confirmed.
	 * Reestructura notas internas (individuales ↔ grupos); el shape del resultado
	 * no es predecible localmente sin duplicar la lógica del backend.
	 */
	cambiarTipo(calificacionId: number, dto: CambiarTipoCalificacionDto): void {
		this.store.setSaving(true);

		this.wal.execute<CalificacionConNotasDto>({
			operation: 'UPDATE',
			resourceType: 'Calificacion',
			resourceId: calificacionId,
			endpoint: `${this.calificacionUrl}/${calificacionId}/tipo`,
			method: 'PUT',
			payload: dto,
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.cambiarTipoCalificacion(calificacionId, dto),
			onCommit: (cal) => {
				this.store.replaceCalificacion(cal);
				this.store.setSaving(false);
			},
			onError: (err) => {
				this.errHandler.handle(err, 'cambiar tipo de evaluación');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
		});
	}

	// #endregion

	// #region Periodos

	crearPeriodo(dto: CrearPeriodoDto): void {
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'Calificacion',
			endpoint: `${this.calificacionUrl}/periodo`,
			method: 'POST',
			payload: dto,
			http$: () => this.api.crearPeriodo(dto),
			onCommit: (periodo) => {
				this.store.addPeriodo(periodo);
				this.store.setSaving(false);
			},
			onError: (err) => {
				this.errHandler.handle(err, 'crear periodo');
				this.store.setSaving(false);
			},
		});
	}

	eliminarPeriodo(periodoId: number): void {
		const snapshot = this.store.periodos().find((p) => p.id === periodoId);
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'Calificacion',
			resourceId: periodoId,
			endpoint: `${this.calificacionUrl}/periodo/${periodoId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarPeriodo(periodoId),
			onCommit: () => {
				this.store.setSaving(false);
			},
			onError: (err) => {
				this.errHandler.handle(err,'eliminar periodo');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => {
					this.store.removePeriodo(periodoId);
				},
				rollback: () => {
					if (snapshot) this.store.addPeriodo(snapshot);
				},
			},
		});
	}

	// #endregion

	// #region Comandos de UI
	openCalificacionDialog(editing: CalificacionDto | null = null): void { this.store.openCalificacionDialog(editing); }
	closeCalificacionDialog(): void { this.store.closeCalificacionDialog(); }
	closeCalificarDialog(): void { this.store.closeCalificarDialog(); }
	openPeriodosDialog(): void { this.store.openPeriodosDialog(); }
	closePeriodosDialog(): void { this.store.closePeriodosDialog(); }
	resetCalificaciones(): void { this.store.reset(); }

	openCalificarDialog(cal: CalificacionConNotasDto): void {
		this.store.openCalificarDialog(cal);
		if (!cal.esGrupal) return;
		const contenido = this.contenidoStore.contenido();
		if (!contenido) return;
		this.api
			.getGrupos(contenido.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (resumen) => this.store.setGruposForCalificar(resumen.grupos),
				error: (err) => this.errHandler.handle(err, 'cargar grupos'),
			});
	}
	// #endregion

	// #region Helpers privados

	/** Refetch calificaciones after mutation (needed for nested notas). */
	private refreshCalificaciones(contenidoId: number): void {
		this.api
			.getCalificaciones(contenidoId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (cals) => {
					this.store.setCalificaciones(cals);
					this.store.setSaving(false);
				},
				error: () => this.store.setSaving(false),
			});
	}

	// #endregion
}
