import { Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ErrorHandlerService } from '@core/services';
import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

import { buildCursoHubLink, type CursoHubRol } from './curso-hub-link.helpers';

// #region Types
export interface CursoHubLegacyRedirectSource {
	rol: CursoHubRol;
	horarios: Signal<readonly HorarioProfesorDto[]>;
	loading: Signal<boolean>;
	loadError: Signal<string | null>;
}

export interface CursoHubLegacyRedirect {
	/** `true` mientras hay un `?horarioId=` legacy sin resolver (la página muestra el spinner, no la lista). */
	pending: Signal<boolean>;
}
// #endregion

// #region Wiring
/**
 * Redirige los enlaces viejos `…/cursos?horarioId=N` (antes abrían el modal) al
 * hub del par de ese horario, reemplazando la entrada del historial (el «atrás»
 * vuelve al origen). Parámetros viejos como `tab` y `returnTo` se ignoran.
 *
 * - `horarioId` presente en la lista → redirige de inmediato (puede ser la lista cacheada).
 * - Ausente: solo se declara inválido tras observar una carga; los stores arrancan
 *   con `horarios: []` y `loading: false`, así que "vacío" no significa "no existe".
 *   Se avisa y se limpia el query sin salir de la lista (si la carga falló, solo se limpia).
 *
 * Hay que llamarla en un contexto de inyección (constructor de la página).
 */
export function setupCursoHubLegacyRedirect(source: CursoHubLegacyRedirectSource): CursoHubLegacyRedirect {
	const route = inject(ActivatedRoute);
	const router = inject(Router);
	const errorHandler = inject(ErrorHandlerService);

	const query = toSignal(route.queryParamMap, { requireSync: true });
	const requested = computed(() => query().get('horarioId'));

	const settled = signal(false);
	let sawLoading = false;
	let handled: string | null = null;

	effect(() => {
		if (source.loading()) {
			sawLoading = true;
		} else if (sawLoading) {
			settled.set(true);
		}
	});

	effect(() => {
		const raw = requested();
		if (raw === null) {
			handled = null;
			return;
		}
		const id = Number(raw);
		const horario = Number.isInteger(id) && id > 0 ? source.horarios().find((h) => h.id === id) : undefined;

		if (!horario && !settled()) return;
		if (handled === raw) return;
		handled = raw;

		untracked(() => {
			if (horario) {
				const { commands, queryParams } = buildCursoHubLink(source.rol, horario);
				void router.navigate(commands, { queryParams, replaceUrl: true });
				return;
			}
			if (!source.loadError()) {
				errorHandler.showWarning('Franja no disponible', 'No se encontró esa franja entre tus cursos.');
			}
			void router.navigate([], {
				queryParams: { horarioId: null, tab: null, returnTo: null },
				queryParamsHandling: 'merge',
				replaceUrl: true,
			});
		});
	});

	return { pending: computed(() => requested() !== null) };
}
// #endregion
