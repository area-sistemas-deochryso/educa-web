import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';

import { AuthService, UserPermisosService, ErrorHandlerService } from '@core/services';

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
		console.log('[PermisosGuard] No autenticado, permitiendo paso (authGuard se encarga)');
		return true;
	}

	// Construir la ruta completa desde la raíz
	const fullPath = getFullPath(route);
	console.log('[PermisosGuard] Verificando permisos para:', fullPath);

	// Esperar a que los permisos estén cargados
	const permisosLoaded = await userPermisosService.ensurePermisosLoaded();

	// Si falló la carga de permisos, redirigir al login
	if (!permisosLoaded) {
		console.log('[PermisosGuard] Fallo al cargar permisos, redirigiendo a login');
		authService.logout();
		router.navigate(['/intranet/login']);
		return false;
	}

	// Verificar si tiene permiso
	const tienePermiso = userPermisosService.tienePermiso(fullPath);

	if (!tienePermiso) {
		console.log('[PermisosGuard] Sin permiso para:', fullPath, '- Redirigiendo a /intranet');
		errorHandler.showWarning(
			'Acceso denegado',
			'No cuenta con los permisos suficientes para acceder a esta vista.',
		);
		router.navigate(['/intranet']);
		return false;
	}

	console.log('[PermisosGuard] Acceso permitido a:', fullPath);
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
