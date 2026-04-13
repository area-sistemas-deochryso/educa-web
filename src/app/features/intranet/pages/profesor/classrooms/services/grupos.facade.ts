import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { facadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { environment } from '@config';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { GruposStore } from './grupos.store';
import {
	CrearGrupoDto,
	ActualizarGrupoDto,
	AsignarEstudiantesGrupoDto,
	ConfigurarMaxEstudiantesDto,
	GrupoContenidoDto,
} from '../../models';

@Injectable({ providedIn: 'root' })
export class GruposFacade {
	// #region Dependencias
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(GruposStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly wal = inject(WalFacadeHelper);
	private readonly destroyRef = inject(DestroyRef);
	private readonly grupoUrl = `${environment.apiUrl}/api/GrupoContenido`;
	private readonly errHandler = facadeErrorHandler({
		tag: 'GruposFacade',
		errorHandler: this.errorHandler,
	});
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos de carga

	/**
	 * Load groups for a horario.
	 * Resolves contenidoId by: horarioId → getContenido → contenidoId.
	 * El caller resuelve horarioId desde sus propios datos (sin acoplamiento cross-store).
	 */
	loadGruposForHorario(horarioId: number): void {
		this.store.setLoading(true);

		this.api
			.getContenido(horarioId)
			.pipe(
				switchMap((contenido) => {
					if (!contenido) {
						this.store.setNoContenido();
						return of(null);
					}
					this.store.setContenidoId(contenido.id);
					return this.api.getGrupos(contenido.id);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (data) => {
					if (data) {
						this.store.setGruposData(
							data.grupos,
							data.estudiantesSinGrupo,
							data.maxEstudiantesPorGrupo,
						);
					}
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar grupos');
					this.store.setLoading(false);
				},
			});
	}

	/** Reload groups using the stored contenidoId. */
	private refetchGrupos(): void {
		const contenidoId = this.store.contenidoId();
		if (!contenidoId) return;

		this.api
			.getGrupos(contenidoId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setGruposData(
						data.grupos,
						data.estudiantesSinGrupo,
						data.maxEstudiantesPorGrupo,
					);
					this.store.setSaving(false);
				},
				error: () => this.store.setSaving(false),
			});
	}

	// #endregion

	// #region CRUD Grupos

	/** Create group with WAL → quirurgical add on commit (server returns full DTO). */
	crearGrupo(nombre: string): void {
		const contenidoId = this.store.contenidoId();
		if (!contenidoId) return;

		const dto: CrearGrupoDto = { cursoContenidoId: contenidoId, nombre };
		this.store.setSaving(true);

		this.wal.execute<GrupoContenidoDto>({
			operation: 'CREATE',
			resourceType: 'GrupoContenido',
			endpoint: this.grupoUrl,
			method: 'POST',
			payload: dto,
			http$: () => this.api.crearGrupo(dto),
			onCommit: (grupo) => {
				this.store.addGrupo(grupo);
				this.store.setSaving(false);
			},
			onError: (err) => {
				this.errHandler.handle(err, 'crear grupo');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
		});
	}

	/** Rename group with WAL → quirurgical update. */
	actualizarGrupo(grupoId: number, dto: ActualizarGrupoDto): void {
		const snapshot = this.store.grupos().find((g) => g.id === grupoId);
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'GrupoContenido',
			resourceId: grupoId,
			endpoint: `${this.grupoUrl}/${grupoId}`,
			method: 'PUT',
			payload: dto,
			http$: () => this.api.actualizarGrupo(grupoId, dto),
			onCommit: () => {
				this.store.updateGrupoNombre(grupoId, dto.nombre);
				this.store.setSaving(false);
			},
			onError: (err) => {
				this.errHandler.handle(err, 'actualizar grupo');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => this.store.updateGrupoNombre(grupoId, dto.nombre),
				rollback: () => {
					if (snapshot) this.store.updateGrupoNombre(grupoId, snapshot.nombre);
				},
			},
		});
	}

	/** Delete group with WAL → optimistic removal + rollback. */
	eliminarGrupo(grupoId: number): void {
		const snapshotGrupos = this.store.grupos().map((g) => ({ ...g }));
		const snapshotSinGrupo = [...this.store.estudiantesSinGrupo()];
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'GrupoContenido',
			resourceId: grupoId,
			endpoint: `${this.grupoUrl}/${grupoId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarGrupo(grupoId),
			onCommit: () => {
				this.store.setSaving(false);
			},
			onError: (err) => {
				this.errHandler.handle(err, 'eliminar grupo');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => this.store.removeGrupo(grupoId),
				rollback: () => this.store.setGruposData(snapshotGrupos, snapshotSinGrupo, this.store.maxEstudiantesPorGrupo()),
			},
		});
	}

	/** Assign students to group with WAL → refetch on commit. */
	asignarEstudiantes(grupoId: number, dto: AsignarEstudiantesGrupoDto): void {
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'GrupoContenido',
			resourceId: grupoId,
			endpoint: `${this.grupoUrl}/${grupoId}/estudiantes`,
			method: 'POST',
			payload: dto,
			http$: () => this.api.asignarEstudiantes(grupoId, dto),
			onCommit: () => {
				this.refetchGrupos();
				this.store.closeAsignarDialog();
			},
			onError: (err) => {
				this.errHandler.handle(err, 'asignar estudiantes');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => this.store.closeAsignarDialog(),
				rollback: () => this.store.openAsignarDialog(grupoId),
			},
		});
	}

	/** Remove student from group with WAL → refetch on commit. */
	removerEstudiante(grupoId: number, estudianteId: number): void {
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'GrupoContenido',
			resourceId: grupoId,
			endpoint: `${this.grupoUrl}/${grupoId}/estudiantes/${estudianteId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.removerEstudianteDeGrupo(grupoId, estudianteId),
			onCommit: () => this.refetchGrupos(),
			onError: (err) => {
				this.errHandler.handle(err, 'remover estudiante');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => this.store.removeEstudianteOptimistic(estudianteId, grupoId),
				rollback: () => this.refetchGrupos(),
			},
		});
	}

	/** Optimistic drag-drop with WAL: update UI instantly, sync with API, rollback on error. */
	dropEstudiante(data: { estudianteId: number; fromGrupoId: number | null; toGrupoId: number | null }): void {
		const { estudianteId, fromGrupoId, toGrupoId } = data;
		const request = this.buildDropRequest(estudianteId, fromGrupoId, toGrupoId);
		if (!request) return;

		const snapshotGrupos = this.store.grupos().map((g) => ({ ...g, estudiantes: [...g.estudiantes] }));
		const snapshotSinGrupo = [...this.store.estudiantesSinGrupo()];

		this.wal.execute({
			operation: 'CUSTOM',
			resourceType: 'GrupoContenido',
			endpoint: request.endpoint,
			method: request.method,
			payload: request.payload,
			http$: request.http$,
			onCommit: () => this.refetchGrupos(),
			onError: (err) => this.errHandler.handle(err, 'mover estudiante'),
			optimistic: {
				apply: () => this.applyDropOptimistic(estudianteId, fromGrupoId, toGrupoId),
				rollback: () => this.store.setGruposData(snapshotGrupos, snapshotSinGrupo, this.store.maxEstudiantesPorGrupo()),
			},
		});
	}

	private buildDropRequest(estudianteId: number, fromGrupoId: number | null, toGrupoId: number | null) {
		if (fromGrupoId === null && toGrupoId !== null) {
			return {
				endpoint: `${this.grupoUrl}/${toGrupoId}/estudiantes`,
				method: 'POST' as const,
				payload: { estudianteIds: [estudianteId] },
				http$: () => this.api.asignarEstudiantes(toGrupoId, { estudianteIds: [estudianteId] }),
			};
		}
		if (fromGrupoId !== null && toGrupoId === null) {
			return {
				endpoint: `${this.grupoUrl}/${fromGrupoId}/estudiantes/${estudianteId}`,
				method: 'DELETE' as const,
				payload: null,
				http$: () => this.api.removerEstudianteDeGrupo(fromGrupoId, estudianteId),
			};
		}
		if (fromGrupoId !== null && toGrupoId !== null) {
			return {
				endpoint: `${this.grupoUrl}/${fromGrupoId}/estudiantes/${estudianteId}`,
				method: 'DELETE' as const,
				payload: { fromGrupoId, toGrupoId, estudianteId },
				http$: () =>
					this.api.removerEstudianteDeGrupo(fromGrupoId, estudianteId).pipe(
						switchMap(() => this.api.asignarEstudiantes(toGrupoId, { estudianteIds: [estudianteId] })),
					),
			};
		}
		return null;
	}

	private applyDropOptimistic(estudianteId: number, fromGrupoId: number | null, toGrupoId: number | null): void {
		if (fromGrupoId === null && toGrupoId !== null) {
			this.store.assignEstudianteOptimistic(estudianteId, toGrupoId);
		} else if (fromGrupoId !== null && toGrupoId === null) {
			this.store.removeEstudianteOptimistic(estudianteId, fromGrupoId);
		} else if (fromGrupoId !== null && toGrupoId !== null) {
			this.store.moveEstudianteOptimistic(estudianteId, fromGrupoId, toGrupoId);
		}
	}

	/** Configure max students per group with WAL → quirurgical update. */
	configurarMaxEstudiantes(max: number | null): void {
		const contenidoId = this.store.contenidoId();
		if (!contenidoId) return;

		const prevMax = this.store.maxEstudiantesPorGrupo();
		const dto: ConfigurarMaxEstudiantesDto = { maxEstudiantesPorGrupo: max };
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'GrupoContenido',
			resourceId: contenidoId,
			endpoint: `${this.grupoUrl}/contenido/${contenidoId}/max-estudiantes`,
			method: 'PUT',
			payload: dto,
			http$: () => this.api.configurarMaxEstudiantes(contenidoId, dto),
			onCommit: () => {
				this.store.setMaxEstudiantes(max);
				this.store.setSaving(false);
			},
			onError: (err) => {
				this.errHandler.handle(err, 'configurar máximo de estudiantes');
				this.store.setSaving(false);
			},
			optimistic: {
				apply: () => this.store.setMaxEstudiantes(max),
				rollback: () => this.store.setMaxEstudiantes(prevMax),
			},
		});
	}

	// #endregion

	// #region Comandos de UI
	openAsignarDialog(grupoId: number): void { this.store.openAsignarDialog(grupoId); }
	closeAsignarDialog(): void { this.store.closeAsignarDialog(); }
	openConfirmDialog(): void { this.store.openConfirmDialog(); }
	closeConfirmDialog(): void { this.store.closeConfirmDialog(); }
	resetGrupos(): void { this.store.reset(); }
	// #endregion
}
