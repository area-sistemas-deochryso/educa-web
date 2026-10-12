// #region Imports
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@config/environment';
import { logger } from '@core/helpers';
import { ViewAsContextService } from '@core/services/view-as';
import type { TareaPendienteDto } from '@data/models';
// #endregion

/**
 * Tareas pendientes del estudiante (P110-F14): fuente única para la tarjeta del Inicio,
 * el badge de tareas nuevas del menú y la marca "Nueva" dentro del contenido del curso.
 * Vive en `shared/` porque el layout no puede depender de un feature de página
 * (mismo criterio que `ForoUnreadService`).
 */
@Injectable({ providedIn: 'root' })
export class TareasPendientesService {
	private readonly http = inject(HttpClient);
	private readonly viewAs = inject(ViewAsContextService);
	private readonly baseUrl = `${environment.apiUrl}/api/estudiantecurso`;

	private readonly _tareas = signal<TareaPendienteDto[]>([]);
	private readonly _loaded = signal(false);

	readonly tareas = this._tareas.asReadonly();
	readonly loaded = this._loaded.asReadonly();
	readonly nuevasCount = computed(() => this._tareas().filter((t) => t.esNueva).length);
	readonly nuevasIds = computed(() => new Set(this._tareas().filter((t) => t.esNueva).map((t) => t.tareaId)));

	refresh(): void {
		this.http.get<TareaPendienteDto[]>(`${this.baseUrl}/mis-tareas-pendientes`).subscribe({
			next: (tareas) => {
				this._tareas.set(tareas);
				this._loaded.set(true);
			},
			error: (err: { status?: number }) => {
				// Best-effort: un aviso que no carga no debe romper la navegación ni el Inicio.
				logger.warn('[TareasPendientes] refresh failed — fallback empty', err?.status);
				this._tareas.set([]);
				this._loaded.set(true);
			},
		});
	}

	/**
	 * Registra que el estudiante abrió la tarea (apaga `esNueva`). No-op si la tarea no es
	 * nueva, y en "ver como" no se llama: el BE lo rechaza (`ADMIN_VER_COMO_SOLO_LECTURA`)
	 * y un admin no debe apagar el aviso del estudiante.
	 */
	marcarVista(tareaId: number): void {
		if (this.viewAs.activeContext()) return;
		if (!this.nuevasIds().has(tareaId)) return;

		const previous = this._tareas();
		this._tareas.set(previous.map((t) => (t.tareaId === tareaId ? { ...t, esNueva: false } : t)));
		this.http.post<void>(`${this.baseUrl}/tarea/${tareaId}/vista`, {}).subscribe({
			error: (err: { status?: number }) => {
				logger.warn('[TareasPendientes] marcarVista failed — rollback', err?.status);
				this._tareas.set(previous);
			},
		});
	}
}
