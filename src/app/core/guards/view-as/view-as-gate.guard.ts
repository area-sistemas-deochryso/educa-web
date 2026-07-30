// #region Imports
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from '@core/services/auth';
import { ViewAsContextService, ViewAsRol } from '@core/services/view-as';
// #endregion

// #region Implementation
/**
 * Gate for `estudiante/*`/`profesor/*` routes (P92 F2, decision #3): an
 * Administrador cannot enter the module without first choosing a user of
 * the matching role via `/intranet/ver-como/:rol`.
 *
 * No-op for non-admin users (real profesores/estudiantes navigating their
 * own module) — mirrors the backend's "no headers → no work" fast path in
 * `BaseApiController.ResolveViewAsIdentity`. Only `Administrador` (rol 8)
 * holds `ADMIN_VER_COMO`; no other admin-like role (Director, Coordinador,
 * etc.) does, so the check is a strict string match, not the broader
 * `ADMIN_ROLES` list used elsewhere in the menu config.
 *
 * Routes using this guard must set `data: { viewAsRol: 'Profesor' | 'Estudiante' }`.
 *
 * @example
 * { path: 'profesor/cursos', canActivate: [viewAsGateGuard], data: { viewAsRol: 'Profesor' }, ... }
 */
export const viewAsGateGuard: CanActivateFn = (route, state) => {
	const authService = inject(AuthService);
	const viewAsContext = inject(ViewAsContextService);
	const router = inject(Router);

	if (authService.currentUser?.rol !== 'Administrador') {
		return true;
	}

	const expectedRol = route.data['viewAsRol'] as ViewAsRol | undefined;
	if (!expectedRol || viewAsContext.hasContextForRol(expectedRol)) {
		return true;
	}

	return router.createUrlTree(['/intranet/ver-como', expectedRol.toLowerCase()], {
		queryParams: { returnUrl: state.url },
	});
};
// #endregion
