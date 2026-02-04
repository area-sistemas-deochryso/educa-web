import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService, ErrorHandlerService, UserPermisosService } from '@core/services';

import { inject } from '@angular/core';
import { logger } from '@core/helpers';
import { UI_ACCESS_DENIED_MESSAGE, UI_SUMMARIES } from '@app/shared/constants';

/**
 * Guard que verifica si el usuario tiene permiso para acceder a una ruta
 * El acceso se controla dinámicamente por los permisos configurados en la BD
 * Si no tiene permiso, redirige a /intranet
 * Si falla la carga de permisos, redirige al login (credenciales inválidas)
 */
export const permisosGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
	const authService = inject(AuthService);
	const userPermisosService = inject(UserPermisosService);
	const router = inject(Router);
	const errorHandler = inject(ErrorHandlerService);

	// Si no está autenticado, no verificar permisos (el authGuard se encarga)
	if (!authService.isAuthenticated) {
		logger.tagged(
			'PermisosGuard',
			'log',
			'No autenticado, permitiendo paso (authGuard se encarga)',
		);
		return true;
	}

	// Construir la ruta completa desde la raíz
	const fullPath = getFullPath(route);
	logger.tagged('PermisosGuard', 'log', 'Verificando permisos para:', fullPath);

	// Esperar a que los permisos estén cargados
	const permisosLoaded = await userPermisosService.ensurePermisosLoaded();

	// Si falló la carga de permisos, redirigir al login
	if (!permisosLoaded) {
		logger.tagged('PermisosGuard', 'log', 'Fallo al cargar permisos, redirigiendo a login');
		authService.logout();
		return router.createUrlTree(['/intranet/login']);
	}

	// Verificar si tiene permiso
	const tienePermiso = userPermisosService.tienePermiso(fullPath);

	if (!tienePermiso) {
		logger.tagged(
			'PermisosGuard',
			'log',
			'Sin permiso para:',
			fullPath,
			'- Redirigiendo a /intranet',
		);
		errorHandler.showWarning(
			UI_SUMMARIES.accessDenied,
			UI_ACCESS_DENIED_MESSAGE,
		);
		return router.createUrlTree(['/intranet']);
	}

	logger.tagged('PermisosGuard', 'log', 'Acceso permitido a:', fullPath);
	return true;
};

/**
 * Construye la ruta completa desde el snapshot
 */
function getFullPath(route: ActivatedRouteSnapshot): string {
	const segments: string[] = [];
	let current: ActivatedRouteSnapshot | null = route;

	while (current) {
		if (current.url.length > 0) {
			segments.unshift(...current.url.map((s) => s.path));
		}
		current = current.parent;
	}

	return segments.join('/');
}
