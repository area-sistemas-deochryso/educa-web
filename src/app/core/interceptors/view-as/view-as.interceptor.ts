// #region Imports
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { ViewAsContextService } from '@core/services/view-as';
// #endregion

// #region Implementation
/**
 * Propagates the active "ver como" (P92 F2) selection to the backend via
 * `X-View-As-Entity-Id`/`X-View-As-Rol` — transparent to every existing API
 * service (`EstudianteApiService`, `ProfesorCursosApiService`, etc.), per
 * decision #5 of `educa-coord/plans/xrepo-92-admin-ver-como-wrapper.md`.
 *
 * Tags every HTTP method, not just GET (P92 extensión — briefs 501/502). The
 * backend remains the real authority: by default `ResolveViewAsIdentity`
 * still 403s any non-GET carrying these headers (`ADMIN_VER_COMO_SOLO_LECTURA`)
 * — only call sites that explicitly opt in via `allowMutation: true` (today:
 * every mutating action of `CalificacionController`, `CursoContenidoController`,
 * `GrupoContenidoController`, `ProfesorController`, `AsistenciaCursoController`
 * and `EstudianteCursoController`) actually honor a mutation. Sending the
 * headers on every method here is harmless for `HorarioController`'s
 * `GetMiHorarioHoy` (the remaining wrapped endpoint, GET-only).
 *
 * No URL/route matching here on purpose: only the ~9 controllers wrapped by
 * `RequireProfesorId()`/`RequireEstudianteId()`/`GetMiHorarioHoy` ever read
 * these headers (F1 spec) — every other endpoint ignores them harmlessly.
 * `ViewAsContextService` auto-clears once navigation leaves the matching
 * module, so the headers stop being sent as soon as the admin leaves
 * `estudiante/*`/`profesor/*` without needing per-request scoping here.
 */
export const viewAsInterceptor: HttpInterceptorFn = (req, next) => {
	const viewAsContext = inject(ViewAsContextService);
	const context = viewAsContext.activeContext();

	if (!context) {
		return next(req);
	}

	const tagged = req.clone({
		setHeaders: {
			'X-View-As-Entity-Id': String(context.entityId),
			'X-View-As-Rol': context.rol,
		},
	});

	return next(tagged);
};
// #endregion
