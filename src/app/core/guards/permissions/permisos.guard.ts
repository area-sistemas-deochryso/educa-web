// #region Imports
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService, AccessDeniedService, UserPermissionsService } from '@core/services';

import { inject } from '@angular/core';
import { logger } from '@core/helpers';

/**
 * Route guard that verifies user access based on permissions.
 *
 * Behavior:
 * - If not authenticated, allow and let the auth guard handle it.
 * - If permissions fail to load, logout and redirect to login.
 * - If permission is missing, show a warning and redirect to /intranet.
 *
 * @example
 * canActivate: [permissionsGuard]
 */
// #endregion
// #region Implementation
export const permissionsGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
	const authService = inject(AuthService);
	const userPermissionsService = inject(UserPermissionsService);
	const router = inject(Router);
	const accessDenied = inject(AccessDeniedService);

	// If not authenticated, do not verify permissions here.
	if (!authService.isAuthenticated) {
		logger.tagged(
			'PermisosGuard',
			'log',
			'No autenticado, permitiendo paso (authGuard se encarga)',
		);
		return true;
	}

	// Build the full path from the root.
	const fullPath = getFullPath(route);
	// Note: excludes query params.
	logger.tagged('PermisosGuard', 'log', 'Verificando permisos para:', fullPath);

	// Wait for permissions to be loaded.
	const permisosLoaded = await userPermissionsService.ensurePermisosLoaded();

	// If permissions failed to load, redirect to login.
	if (!permisosLoaded) {
		logger.tagged('PermisosGuard', 'log', 'Fallo al cargar permisos, redirigiendo a login');
		authService.logout();
		return router.createUrlTree(['/intranet/login']);
	}

	// Check permission for this route.
	const tienePermiso = userPermissionsService.tienePermiso(fullPath);

	if (!tienePermiso) {
		logger.tagged(
			'PermisosGuard',
			'log',
			'Sin permiso para:',
			fullPath,
			'- Mostrando modal de acceso denegado',
		);
		accessDenied.show(fullPath);
		return router.createUrlTree(['/intranet']);
	}

	logger.tagged('PermisosGuard', 'log', 'Acceso permitido a:', fullPath);
	return true;
};

/**
 * Build the full route path from an ActivatedRouteSnapshot.
 *
 * Honors `data.permissionPath` as an explicit override — used by routes with
 * dynamic params (e.g. `correlation/:id`) where the resolved URL never
 * matches an entry in `vistasPermitidas`. The route declares its canonical
 * permission path and the guard checks against that instead.
 *
 * @param route Current route snapshot.
 * @returns Full path without query params.
 * @example
 * const path = getFullPath(route);
 */
function getFullPath(route: ActivatedRouteSnapshot): string {
	// Explicit override (deep-link routes with :id placeholders).
	let current: ActivatedRouteSnapshot | null = route;
	while (current) {
		const override = current.data?.['permissionPath'];
		if (typeof override === 'string' && override.length > 0) {
			return override;
		}
		current = current.parent;
	}

	const segments: string[] = [];
	current = route;

	while (current) {
		// Walk parent hierarchy to build the root path.
		if (current.url.length > 0) {
			segments.unshift(...current.url.map((s) => s.path));
		}
		current = current.parent;
	}

	return segments.join('/');
}
// #endregion
