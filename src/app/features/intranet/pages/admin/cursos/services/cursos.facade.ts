import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
	BaseCrudFacade,
	type BaseCrudFacadeConfig,
	type EstadisticaKeys,
	type PaginatedResult,
} from '@core/services';
import { environment } from '@config';

import { Curso } from './cursos.models';
import { CursosService } from './cursos.service';
import { GradosService } from './grados.service';
import { CursosStore } from './cursos.store';

interface CursosEstadisticas { totalCursos: number; cursosActivos: number; cursosInactivos: number }
interface CursoFormData { nombre: string; estado: boolean }

const STATS_KEYS: EstadisticaKeys = { total: 'totalCursos', activos: 'cursosActivos', inactivos: 'cursosInactivos' };

@Injectable({ providedIn: 'root' })
export class CursosFacade extends BaseCrudFacade<Curso, CursoFormData, CursosEstadisticas> {
	// #region Dependencias específicas
	private readonly api = inject(CursosService);
	private readonly gradosApi = inject(GradosService);
	protected readonly store = inject(CursosStore);
	protected readonly config: BaseCrudFacadeConfig = {
		tag: 'CursosFacade',
		resourceType: 'Curso',
		apiUrl: `${environment.apiUrl}/api/sistema/cursos`,
		loadErrorMessage: 'No se pudieron cargar los cursos',
	};
	// #endregion

	constructor() {
		super();
		this.initErrorHandler();
	}

	// #region API calls (abstract implementations)
	protected fetchItems(): Observable<PaginatedResult<Curso>> {
		return this.api.getCursosPaginated(
			this.store.page(),
			this.store.pageSize(),
			this.store.searchTerm() || undefined,
			this.store.filterEstado() as boolean | null,
			this.store.filterNivel() || undefined,
		);
	}

	protected fetchEstadisticas(): Observable<CursosEstadisticas> {
		return this.api.getEstadisticas();
	}

	/** Override para cargar grados junto con items + stats */
	protected override getLoadAllSources(): Record<string, Observable<unknown>> {
		return {
			...super.getLoadAllSources(),
			grados: this.gradosApi.getGrados(),
		};
	}

	protected override applyLoadAllResult(result: Record<string, unknown>): void {
		super.applyLoadAllResult(result);
		this.store.setGrados(result['grados'] as never[]);
	}
	// #endregion

	// #region CRUD commands
	saveCurso(): void {
		const formData = this.store.formData();
		const gradosIds = this.store.allGradosIds();

		if (this.store.isEditing()) {
			const curso = this.store.selectedItem();
			if (!curso) return;
			const grados = this.store.selectedGradosFull();
			const payload = { nombre: formData.nombre, estado: formData.estado, gradosIds, rowVersion: curso.rowVersion };
			this.walUpdate(curso.id, payload, { nombre: formData.nombre, estado: formData.estado, grados },
				() => this.api.actualizarCurso(curso.id, payload),
			);
		} else {
			const payload = { nombre: formData.nombre, gradosIds };
			this.walCreate(payload, () => this.api.crearCurso(payload));
		}
	}

	toggleEstado(curso: Curso): void {
		const gradosIds = curso.grados?.map((g) => g.id) || [];
		const payload = { nombre: curso.nombre, estado: !curso.estado, gradosIds, rowVersion: curso.rowVersion };
		this.walToggle(curso, payload,
			() => this.api.actualizarCurso(curso.id, payload),
			STATS_KEYS,
			(id) => this.store.toggleCursoEstado(id),
		);
	}

	delete(curso: Curso): void {
		this.walDelete(curso,
			() => this.api.eliminarCurso(curso.id),
			STATS_KEYS,
		);
	}
	// #endregion

	// #region UI commands (specific)
	openEditDialog(curso: Curso): void {
		this.store.setSelectedItem(curso);
		this.store.setFormData({ nombre: curso.nombre, estado: curso.estado ?? true });
		this.store.setIsEditing(true);

		const gradosIds = curso.grados?.map((g) => g.id) || [];
		const inicialIds = this.store.gradosInicial().map((g) => g.id);
		const primariaIds = this.store.gradosPrimaria().map((g) => g.id);
		const secundariaIds = this.store.gradosSecundaria().map((g) => g.id);

		this.store.setGradeSelections(
			gradosIds.filter((id) => inicialIds.includes(id)),
			gradosIds.filter((id) => primariaIds.includes(id)),
			gradosIds.filter((id) => secundariaIds.includes(id)),
		);

		this.store.openDialog();
	}

	showGrados(curso: Curso): void {
		this.store.openGradosDialog(curso);
	}

	closeGradosDialog(): void {
		this.store.closeGradosDialog();
	}
	// #endregion

	// #region Comandos de formulario
	updateFormField(field: 'nombre' | 'estado', value: string | boolean): void {
		this.store.updateFormField(field, value as never);
	}

	addGrado(gradoId: number): void {
		this.store.addGrado(gradoId);
	}

	removeGrado(gradoId: number): void {
		this.store.removeGrado(gradoId);
	}
	// #endregion

	// #region Filtros específicos
	setFilterNivel(nivel: string | null): void {
		this.store.setFilterNivel(nivel);
		this.store.setPage(1);
		this.refreshItemsOnly();
	}
	// #endregion

	// #region Error labels
	protected override getCreateErrorLabel(): string { return 'guardar el curso'; }
	protected override getUpdateErrorLabel(): string { return 'guardar el curso'; }
	protected override getDeleteErrorLabel(): string { return 'eliminar el curso'; }
	// #endregion
}
