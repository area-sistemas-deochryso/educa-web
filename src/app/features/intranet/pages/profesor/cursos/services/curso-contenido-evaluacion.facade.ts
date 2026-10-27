import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { facadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService, SwService, WalFacadeHelper } from '@core/services';
import { environment } from '@config';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoStore } from './curso-contenido.store';
import { buildTareaEvaluacionError, tareaEvaluacionErrorCode } from './tarea-evaluacion-error';
import { CrearTareaRequest } from '../../models';

/**
 * Crear tarea/actividad junto con su evaluación enlazada (INV-C16, P118) y el cupo de peso (INV-C04).
 * Aparte de `CursoContenidoCrudFacade` porque aquí el servidor decide y se espera su respuesta.
 */
@Injectable({ providedIn: 'root' })
export class CursoContenidoEvaluacionFacade {
	// #region Dependencias
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(CursoContenidoStore);
	private readonly wal = inject(WalFacadeHelper);
	private readonly sw = inject(SwService);
	private readonly contenidoUrl = `${environment.apiUrl}/api/CursoContenido`;
	private readonly errHandler = facadeErrorHandler({
		tag: 'CursoContenidoEvaluacionFacade',
		errorHandler: inject(ErrorHandlerService),
	});
	// #endregion

	/**
	 * Crea la tarea y su evaluación en una sola petición (cupo de peso, periodo y ventana de edición los valida
	 * el servidor): el diálogo sigue abierto con lo escrito y el rechazo se explica adentro.
	 *
	 * @param onCreada Se invoca al confirmar el servidor (el hub refresca las evaluaciones del curso).
	 */
	crearTareaConEvaluacion(semanaId: number, request: CrearTareaRequest, onCreada?: () => void): void {
		this.store.setTareaDialogError(null);
		this.store.setSaving(true);

		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'cursoContenidoTarea',
			endpoint: `${this.contenidoUrl}/semana/${semanaId}/tarea`,
			method: 'POST',
			payload: request,
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.crearTarea(semanaId, request),
			onCommit: (tarea) => {
				this.store.addTareaToSemana(semanaId, tarea);
				this.store.setSaving(false);
				this.store.closeTareaDialog();
				// La evaluación nace en el servidor: sin esto la lista y el cupo de `/api/Calificacion` salen del cache viejo.
				void this.sw.invalidateCacheByPattern('/api/Calificacion').finally(() => onCreada?.());
			},
			onError: (err) => {
				const mensaje = buildTareaEvaluacionError(err);
				if (!mensaje) {
					this.errHandler.handle(err, 'crear tarea', () => this.store.setSaving(false));
					return;
				}
				this.store.setTareaDialogError(mensaje);
				this.store.setSaving(false);
				// El cupo pudo haber cambiado desde que se abrió el diálogo.
				if (tareaEvaluacionErrorCode(err) === 'EVALUACION_PESO_EXCEDIDO') this.cargarCupoPeso();
			},
		});
	}

	/** Cupo de peso del curso abierto; sin él el diálogo valida solo el rango 1–100 %. */
	cargarCupoPeso(): void {
		const contenidoId = this.store.vm().contenido?.id;
		if (!contenidoId) return;
		firstValueFrom(this.api.getCupoPeso(contenidoId))
			.then((cupo) => this.store.setTareaCupo(cupo))
			.catch(() => this.store.setTareaCupo(null));
	}
}
