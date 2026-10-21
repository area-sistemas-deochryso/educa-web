// #region Imports
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from '@core/services/auth';
import { UserPermissionsService } from '@core/services/permissions';
import { VIEW_AS_CAPABILITY, ViewAsContextService, ViewAsRol } from '@core/services/view-as';
// #endregion

// #region Implementation
/**
 * Gate for `estudiante/*`/`profesor/*` routes (P92 F2, decision #3; P115 F3): a user who can "ver
 * como" (capability `USUARIOS_API_IMPERSONATE`, assigned per role from Permisos → Por Rol) cannot
 * enter the module without first choosing a user of the matching role via `/intranet/ver-como/:rol`.
 *
 * No-op for everyone else — a real profesor/estudiante navigating their own module, or a user
 * without the capability (the route permission guard and the backend decide for them). Mirrors the
 * backend's "no headers → no work" fast path in `BaseApiController.ResolveViewAsIdentity`. The
 * decision is the capability, never the role name, so granting or revoking it needs no deploy.
 *
 * Routes using this guard must set `data: { viewAsRol: 'Profesor' | 'Estudiante' }`.
 *
 * @example
 * { path: 'profesor/cursos', canActivate: [viewAsGateGuard], data: { viewAsRol: 'Profesor' }, ... }
 */
export const viewAsGateGuard: CanActivateFn = async (route, state) => {
	const authService = inject(AuthService);
	const userPermissions = inject(UserPermissionsService);
	const viewAsContext = inject(ViewAsContextService);
	const router = inject(Router);

	const expectedRol = route.data['viewAsRol'] as ViewAsRol | undefined;
	if (!expectedRol) {
		return true;
	}

	// A real profesor/estudiante is inside their own module.
	if (authService.currentUser?.rol === expectedRol) {
		return true;
	}

	await userPermissions.ensurePermisosLoaded();
	if (!userPermissions.hasOwnCapability(VIEW_AS_CAPABILITY)) {
		return true;
	}

	if (viewAsContext.hasContextForRol(expectedRol)) {
		return true;
	}

	return router.createUrlTree(['/intranet/ver-como', expectedRol.toLowerCase()], {
		queryParams: { returnUrl: state.url },
	});
};
// #endregion
