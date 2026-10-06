import { Injectable, Signal, computed, signal } from '@angular/core';
import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';
import {
	buildCursoHubTabLink,
	type CursoHubRol,
	type CursoHubTabPath,
	type CursoHubTarget,
} from '../../helpers/curso-hub-link.helpers';

/**
 * Contrato entre el shell del hub de curso y sus pestañas hijas (rutas hijas).
 *
 * El shell resuelve el par y la franja (query, única con contenido, en curso,
 * siguiente); las pestañas solo la leen. Es un servicio y no un input de ruta
 * porque la franja preseleccionada no vive en la URL: el shell no la escribe
 * para no alterar el deep link del usuario (salvo cuando hay ediciones sin
 * guardar: entonces la fija para que no flote bajo ellas).
 */
@Injectable({ providedIn: 'root' })
export class CursoHubContextService {
	private readonly source = signal<Signal<HorarioProfesorDto | null> | null>(null);

	/** Franja resuelta por el shell; `null` mientras el shell no la resolvió o fuera del hub. */
	readonly slot = computed(() => this.source()?.() ?? null);

	/** Destino de una pestaña del hub para la franja resuelta (conserva `horarioId`); `null` si aún no hay franja. */
	tabTarget(rol: CursoHubRol, tab: CursoHubTabPath): CursoHubTarget | null {
		const slot = this.slot();
		return slot ? buildCursoHubTabLink(rol, slot, tab) : null;
	}

	/** Lo llama el shell al crearse: las hijas leen la franja de forma síncrona. */
	bind(slot: Signal<HorarioProfesorDto | null>): void {
		this.source.set(slot);
	}

	/** Lo llama el shell al destruirse, para no dejar la franja de un hub anterior. */
	unbind(slot: Signal<HorarioProfesorDto | null>): void {
		if (this.source() === slot) this.source.set(null);
	}
}
