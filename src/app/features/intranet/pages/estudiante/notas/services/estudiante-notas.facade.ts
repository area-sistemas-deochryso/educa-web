import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';
import { VistaPromedio } from '../../models';
import { EstudianteApiService } from '../../services/estudiante-api.service';
import { EstudianteNotasStore } from './estudiante-notas.store';

@Injectable({ providedIn: 'root' })
export class EstudianteNotasFacade {
	private readonly api = inject(EstudianteApiService);
	private readonly store = inject(EstudianteNotasStore);
	private readonly destroyRef = inject(DestroyRef);

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos
	loadNotas(): void {
		this.store.setLoading(true);
		this.store.setError(null);

		this.api
			.getMisNotas()
			.pipe(
				withRetry({ tag: 'EstudianteNotasFacade:loadNotas' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (cursos) => {
					this.store.setCursos(cursos);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('EstudianteNotasFacade: Error al cargar notas', err);
					this.store.setError('No se pudieron cargar las notas');
					this.store.setLoading(false);
				},
			});
	}

	selectCurso(index: number): void {
		this.store.setSelectedCursoIndex(index);
	}

	setVista(vista: VistaPromedio): void {
		this.store.setVistaActual(vista);
	}
	// #endregion

	// #region Simulador commands
	openSimulador(): void {
		this.store.openSimulador();
	}

	closeSimulador(): void {
		this.store.closeSimulador();
	}

	updateSimulacion(calificacionId: number, nota: number | null): void {
		const curso = this.store.selectedCurso();
		if (!curso) return;
		this.store.updateSimulacion(curso.cursoNombre, calificacionId, nota);
	}

	resetSimulacion(): void {
		const curso = this.store.selectedCurso();
		if (!curso) return;
		this.store.resetSimulacion(curso.cursoNombre);
	}
	// #endregion
}
