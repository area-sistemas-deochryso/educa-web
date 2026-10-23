import { Injectable, computed, inject } from '@angular/core';
import type { CalificacionConNotasDto } from '@features/intranet/pages/profesor/models';
import { CalificacionesFacade } from '../services/calificaciones.facade';
import { CursoContenidoUiFacade } from '../services/curso-contenido-ui.facade';

/**
 * Une el diálogo de calificar con el de entregas de la tarea enlazada (INV-C16) dentro de la pestaña
 * Calificaciones: ambos conviven apilados para no perder notas sin guardar al ir de uno a otro.
 */
@Injectable({ providedIn: 'root' })
export class CursoHubEntregasService {
	private readonly uiFacade = inject(CursoContenidoUiFacade);
	private readonly calFacade = inject(CalificacionesFacade);

	private readonly evaluaciones = computed(() => [...this.calFacade.vm().calificacionesPorSemana.values()].flat());

	/** Evaluación enlazada a la tarea cuyas entregas se ven; `null` si no tiene. */
	readonly evaluacionDeEntregas = computed<CalificacionConNotasDto | null>(() => {
		const tarea = this.uiFacade.vm().taskSubmissionsTarea;
		return tarea ? (this.evaluaciones().find((c) => c.tareaId === tarea.id) ?? null) : null;
	});

	evaluacionPorId(id: number): CalificacionConNotasDto | null {
		return this.evaluaciones().find((c) => c.id === id) ?? null;
	}

	/** Abre las entregas de la tarea de la evaluación que se está calificando, sin cerrar ese diálogo. */
	verEntregasDeLaSeleccionada(): void {
		const tareaId = this.calFacade.vm().selectedCalificacion?.tareaId;
		if (tareaId == null) return;
		const semanas = this.uiFacade.vm().contenido?.semanas ?? [];
		const tarea = semanas.flatMap((s) => s.tareas ?? []).find((t) => t.id === tareaId);
		if (tarea) this.uiFacade.openTaskSubmissionsDialog(tarea);
	}

	/** Cierra las entregas y deja abierto (o abre) el diálogo de calificar de esa evaluación. */
	calificarDesdeEntregas(evaluacionId: number): void {
		this.uiFacade.closeTaskSubmissionsDialog();
		if (this.calFacade.vm().selectedCalificacion?.id === evaluacionId) return;
		const cal = this.evaluacionPorId(evaluacionId);
		if (cal) this.calFacade.openCalificarDialog(cal);
	}
}
