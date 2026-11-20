// #region Imports
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { environment } from '@config/environment';
import { AccessDeniedService, UserPermissionsService } from '@core/services/permissions';

import { MONITOREO_PANEL_PATH } from '@intranet-shared/config/intranet-menu-access';

import { DomainId } from './models/monitoreo-hub-badges.models';
import { DOMAINS, DomainTile } from './monitoreo-hub.catalog';
// #endregion

// #region Reglas de acceso
// El valor vive en la config del menú (mismo candado que aplica el menú lateral).
export { MONITOREO_PANEL_PATH };

type PermissionReader = Pick<UserPermissionsService, 'hasCapability' | 'tienePermiso'>;

export function tileSlug(tile: DomainTile): string {
	return tile.route.split('/').pop() ?? '';
}

/** Misma ruta que `monitoreo.routes.ts` declara como `permissionPath` de la hoja. */
export function tilePermissionPath(domainId: DomainId, tile: DomainTile): string {
	return `${MONITOREO_PANEL_PATH}/${domainId}/${tileSlug(tile)}`;
}

/**
 * Espeja lo que el guard terminaría decidiendo: capability del ítem + ruta de la hoja + candado del
 * panel (salvo hojas con permiso propio). Así una pestaña solo se ofrece si abrirla no va a rebotar.
 */
export function canOpenTile(perms: PermissionReader, domainId: DomainId, tile: DomainTile): boolean {
	if (tile.featureFlag && !environment.features[tile.featureFlag]) return false;
	if (!perms.hasCapability(tile.capability)) return false;
	if (!perms.tienePermiso(tilePermissionPath(domainId, tile))) return false;
	return tile.standalonePermission === true || perms.tienePermiso(MONITOREO_PANEL_PATH);
}

export function openableTiles(perms: PermissionReader, domainId: DomainId): DomainTile[] {
	const domain = DOMAINS.find((d) => d.id === domainId);
	return (domain?.tiles ?? []).filter((tile) => canOpenTile(perms, domainId, tile));
}
// #endregion

// #region Redirección inicial del dominio
/**
 * Reemplaza el `redirectTo` fijo a la primera pestaña: va a la primera que el usuario sí puede abrir.
 * Si no puede abrir ninguna, muestra «acceso denegado» en vez de intentar una pestaña que rebota.
 */
export function defaultTabGuard(domainId: DomainId): CanActivateFn {
	return async () => {
		const perms = inject(UserPermissionsService);
		const router = inject(Router);
		const accessDenied = inject(AccessDeniedService);

		await perms.ensurePermisosLoaded();

		const first = openableTiles(perms, domainId)[0];
		if (first) {
			return router.createUrlTree(['/intranet/admin/monitoreo', domainId, tileSlug(first)]);
		}

		accessDenied.show(MONITOREO_PANEL_PATH);
		return router.createUrlTree(['/intranet']);
	};
}
// #endregion
