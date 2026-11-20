/** `CAP_Ruta` del panel de Monitoreo: candado de shells y contenedor para las hojas sin permiso propio. */
export const MONITOREO_PANEL_PATH = 'intranet/admin/monitoreo';
const MONITOREO_MENU_PREFIX = '/intranet/admin/monitoreo/';

/** Lo mínimo que el menú necesita para saber si una ruta realmente se puede abrir. */
export interface MenuRouteAccess {
	tienePermiso(ruta: string): boolean;
}

interface RoutedMenuItem {
	route: string;
	standalonePermission?: boolean;
}

/**
 * Un ítem de Monitoreo solo se ofrece si abrirlo no va a rebotar en el guard: exige la `CAP_Ruta` de la
 * hoja y, salvo hojas con permiso propio, la del panel. Sin `routeAccess` no filtra (comportamiento previo).
 */
export function isMonitoreoItemReachable(item: RoutedMenuItem, routeAccess?: MenuRouteAccess): boolean {
	if (!routeAccess || !item.route.startsWith(MONITOREO_MENU_PREFIX)) return true;
	if (!routeAccess.tienePermiso(item.route.slice(1))) return false;
	return item.standalonePermission === true || routeAccess.tienePermiso(MONITOREO_PANEL_PATH);
}
