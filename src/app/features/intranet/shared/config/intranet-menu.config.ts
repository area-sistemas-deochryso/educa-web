// #region Imports
import { NavMenuItem } from '@intranet-shared/components/layout/intranet-layout/components';
import { environment } from '@config/environment';
import { ModuloId, MODULOS } from '@shared/constants';
import { CapabilityCode } from '@shared/types';
import { UserRole } from '@core/services/auth';

// #endregion

// #region Tipos
type FeatureFlag = keyof typeof environment.features;

export type PreviewLayout =
	| 'admin-table'
	| 'admin-schedule'
	| 'admin-notif'
	| 'week-schedule'
	| 'attendance'
	| 'grades'
	| 'forum'
	| 'messaging'
	| 'course-cards'
	| 'salon-tabs';

export interface MenuItemDef {
	route: string;
	label: string;
	icon: string;
	capability: CapabilityCode;
	modulo: ModuloId;
	exact?: boolean;
	featureFlag?: FeatureFlag;
	queryParams?: Record<string, string>;
	group?: { label: string; icon: string };
	/**
	 * Cadena de sub-agrupaciones dentro de `group` (niveles 2+ de anidamiento) — cada elemento
	 * es un nivel de submenú. Ej. `[{label:'Admin'}, {label:'Asistencias'}]` anida el item dos
	 * niveles: `group` → "Admin" → "Asistencias" → item. Usado tanto para juntar páginas
	 * relacionadas bajo un wrapper (Admin: Asistencias + Permisos Salud) como para colapsar tabs
	 * de una misma página en un único submenú (Asistencias: Gestión + Reportes), en vez de que
	 * todo aparezca como entradas sueltas al mismo nivel que páginas hermanas reales.
	 */
	subgroup?: { label: string; icon: string }[];
	preview?: PreviewLayout;
	description?: string;
	/**
	 * Restringe este ítem a roles específicos, aunque la capability sea más amplia.
	 * Necesario para duplicados de módulos por rol (brief 444): dos MenuItemDef pueden
	 * compartir `capability` (ej. `ASISTENCIA` en `administrador` y `apoderado`) — sin esta
	 * restricción, un usuario con esa capability vería el módulo de CADA duplicado, aunque
	 * su rol real solo corresponda a uno.
	 */
	soloParaRol?: UserRole[];
}

/** Roles del cluster administrativo (comparten el módulo `administrador`). */
const ADMIN_ROLES: UserRole[] = ['Director', 'Asistente Administrativo', 'Promotor', 'Coordinador Académico', 'Administrador'];

/** Módulo con sus items filtrados por permisos y feature flags. */
export interface ModuloMenu {
	id: ModuloId;
	label: string;
	icon: string;
	items: NavMenuItem[];
}
// #endregion

// #region Items del menú (flat, declarativo)
export const MENU_ITEMS: MenuItemDef[] = [
	// --- Inicio ---
	{ route: '/intranet', label: 'Inicio', icon: 'pi pi-home', capability: 'INTRANET', modulo: 'inicio', exact: true, preview: 'admin-table', description: 'Página principal de la intranet' },

	// --- Estudiante ---
	{ route: '/intranet/estudiante/cursos', label: 'Mis Cursos', icon: 'pi pi-book', capability: 'ESTUDIANTE_CURSOS', modulo: 'estudiante', featureFlag: 'estudiante', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'course-cards', description: 'Contenido y materiales de tus cursos' },
	{ route: '/intranet/estudiante/salones', label: 'Mis Salones', icon: 'pi pi-building', capability: 'ESTUDIANTE_SALONES', modulo: 'estudiante', featureFlag: 'estudiante', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'salon-tabs', description: 'Ver tus salones asignados' },
	{ route: '/intranet/estudiante/horarios', label: 'Mi Horario', icon: 'pi pi-clock', capability: 'ESTUDIANTE_HORARIOS', modulo: 'estudiante', featureFlag: 'estudiante', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'week-schedule', description: 'Ver tu horario semanal de clases' },
	{ route: '/intranet/estudiante/notas', label: 'Mis Calificaciones', icon: 'pi pi-chart-bar', capability: 'ESTUDIANTE_NOTAS', modulo: 'estudiante', featureFlag: 'estudiante', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'grades', description: 'Consultar tus calificaciones' },
	{ route: '/intranet/estudiante/asistencia', label: 'Mi Asistencia', icon: 'pi pi-check-square', capability: 'ESTUDIANTE_ASISTENCIA', modulo: 'estudiante', featureFlag: 'estudiante', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'attendance', description: 'Revisar tu registro de asistencia' },
	{ route: '/intranet/asistencia', label: 'Historial de Asistencia', icon: 'pi pi-chart-line', capability: 'ASISTENCIA', modulo: 'estudiante', soloParaRol: ['Estudiante'], featureFlag: 'estudiante', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'attendance', description: 'Historial mensual con resumen de asistencia' },
	{ route: '/intranet/estudiante/foro', label: 'Foro', icon: 'pi pi-comments', capability: 'ESTUDIANTE_FORO', modulo: 'estudiante', featureFlag: 'estudiante', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'forum', description: 'Participar en discusiones del aula' },
	{ route: '/intranet/estudiante/mensajeria', label: 'Mensajería', icon: 'pi pi-envelope', capability: 'ESTUDIANTE_MENSAJERIA', modulo: 'estudiante', featureFlag: 'estudiante', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'messaging', description: 'Enviar y recibir mensajes' },
	// Compartido (duplicado, ver §1 brief 444) — capability sin dueño de rol fijo, soloParaRol evita que otros roles con la misma capability disparen este módulo
	{ route: '/intranet/calendario', label: 'Calendario', icon: 'pi pi-calendar', capability: 'CALENDARIO', modulo: 'estudiante', featureFlag: 'calendario', soloParaRol: ['Estudiante'], preview: 'admin-table', description: 'Calendario de eventos y actividades' },
	{ route: '/intranet/videoconferencias', label: 'Videoconferencias', icon: 'pi pi-video', capability: 'VIDEOCONFERENCIAS', modulo: 'estudiante', featureFlag: 'videoconferencias', soloParaRol: ['Estudiante'], preview: 'admin-table', description: 'Salas de videoconferencia' },

	// --- Profesor ---
	{ route: '/intranet/profesor/cursos', label: 'Mis Cursos', icon: 'pi pi-book', capability: 'PROFESOR_CURSOS', modulo: 'profesor', featureFlag: 'profesor', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'course-cards', description: 'Contenido y materiales de tus cursos' },
	{ route: '/intranet/profesor/salones', label: 'Mis Salones', icon: 'pi pi-building', capability: 'PROFESOR_SALONES', modulo: 'profesor', featureFlag: 'profesor', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'salon-tabs', description: 'Ver los salones asignados' },
	{ route: '/intranet/profesor/horarios', label: 'Mi Horario', icon: 'pi pi-clock', capability: 'PROFESOR_HORARIOS', modulo: 'profesor', featureFlag: 'profesor', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'week-schedule', description: 'Ver tu horario semanal de clases' },
	{ route: '/intranet/profesor/calificaciones', label: 'Mis Calificaciones', icon: 'pi pi-chart-bar', capability: 'PROFESOR_CALIFICACIONES', modulo: 'profesor', featureFlag: 'profesor', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'grades', description: 'Registrar y consultar notas' },
	{ route: '/intranet/profesor/asistencia', label: 'Mi Asistencia', icon: 'pi pi-check-square', capability: 'PROFESOR_ASISTENCIA', modulo: 'profesor', featureFlag: 'profesor', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'attendance', description: 'Pasar lista de tus estudiantes' },
	{ route: '/intranet/asistencia', label: 'Historial de Asistencia', icon: 'pi pi-chart-line', capability: 'ASISTENCIA', modulo: 'profesor', soloParaRol: ['Profesor'], featureFlag: 'profesor', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'attendance', description: 'Historial mensual propio y de tus salones' },
	// Brief 444: movido de "Mi Aula" (académico) a "Mi Seguimiento" — es actividad de seguimiento, no de estructura
	{ route: '/intranet/profesor/final-salones', label: 'Notas y Asistencia', icon: 'pi pi-th-large', capability: 'PROFESOR_FINAL_SALONES', modulo: 'profesor', featureFlag: 'profesor', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'admin-table', description: 'Aprobación, asistencia y notas por salón' },
	{ route: '/intranet/profesor/foro', label: 'Foro', icon: 'pi pi-comments', capability: 'PROFESOR_FORO', modulo: 'profesor', featureFlag: 'profesor', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'forum', description: 'Participar en discusiones del aula' },
	{ route: '/intranet/profesor/mensajeria', label: 'Mensajería', icon: 'pi pi-envelope', capability: 'PROFESOR_MENSAJERIA', modulo: 'profesor', featureFlag: 'profesor', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'messaging', description: 'Enviar y recibir mensajes' },
	// Compartido (duplicado, ver §1 brief 444) — capability sin dueño de rol fijo, soloParaRol evita que otros roles con la misma capability disparen este módulo
	{ route: '/intranet/calendario', label: 'Calendario', icon: 'pi pi-calendar', capability: 'CALENDARIO', modulo: 'profesor', featureFlag: 'calendario', soloParaRol: ['Profesor'], preview: 'admin-table', description: 'Calendario de eventos y actividades' },
	{ route: '/intranet/videoconferencias', label: 'Videoconferencias', icon: 'pi pi-video', capability: 'VIDEOCONFERENCIAS', modulo: 'profesor', featureFlag: 'videoconferencias', soloParaRol: ['Profesor'], preview: 'admin-table', description: 'Salas de videoconferencia' },

	// --- Administrador (cluster: Director, Asistente Administrativo, Promotor, Coordinador Académico, Administrador) ---
	// soloParaRol en TODOS los items de este módulo: varias capabilities ADMIN_* también las tiene Apoderado
	// (ver quick-access.config.ts) — sin esta restricción, Apoderado dispararía este módulo con esos items sueltos.
	{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi pi-book', capability: 'ADMIN_CURSOS', modulo: 'administrador', soloParaRol: ADMIN_ROLES, group: { label: 'Académico', icon: 'pi pi-graduation-cap' }, preview: 'admin-table', description: 'Administrar cursos y materias' },
	{ route: '/intranet/admin/salones', label: 'Salones', icon: 'pi pi-building', capability: 'ADMIN_SALONES', modulo: 'administrador', soloParaRol: ADMIN_ROLES, group: { label: 'Académico', icon: 'pi pi-graduation-cap' }, preview: 'salon-tabs', description: 'Gestionar aulas y secciones' },
	{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi pi-calendar', capability: 'ADMIN_HORARIOS', modulo: 'administrador', soloParaRol: ADMIN_ROLES, group: { label: 'Académico', icon: 'pi pi-graduation-cap' }, preview: 'admin-schedule', description: 'Configurar horarios escolares' },
	{ route: '/intranet/admin/asistencias', label: 'Gestión', icon: 'pi pi-cog', capability: 'ADMIN_ASISTENCIAS', modulo: 'administrador', soloParaRol: ADMIN_ROLES, queryParams: { tab: 'gestion' }, group: { label: 'Asistencia', icon: 'pi pi-clock' }, subgroup: [{ label: 'Admin', icon: 'pi pi-cog' }, { label: 'Asistencias', icon: 'pi pi-clock' }], preview: 'attendance', description: 'Editar y corregir registros de asistencia' },
	{ route: '/intranet/admin/asistencias', label: 'Reportes', icon: 'pi pi-chart-bar', capability: 'ADMIN_ASISTENCIAS', modulo: 'administrador', soloParaRol: ADMIN_ROLES, queryParams: { tab: 'reportes' }, group: { label: 'Asistencia', icon: 'pi pi-clock' }, subgroup: [{ label: 'Admin', icon: 'pi pi-cog' }, { label: 'Asistencias', icon: 'pi pi-clock' }], preview: 'admin-table', description: 'Estadísticas y exportación de asistencia' },
	{ route: '/intranet/admin/permisos-salud', label: 'Permisos Salud', icon: 'pi pi-heart', capability: 'ADMIN_PERMISOS_SALUD', modulo: 'administrador', soloParaRol: ADMIN_ROLES, group: { label: 'Asistencia', icon: 'pi pi-clock' }, subgroup: [{ label: 'Admin', icon: 'pi pi-cog' }], preview: 'admin-table', description: 'Permisos de salida y justificaciones médicas' },
	{ route: '/intranet/admin/eventos-calendario', label: 'Eventos', icon: 'pi pi-calendar-plus', capability: 'ADMIN_EVENTOS_CALENDARIO', modulo: 'administrador', soloParaRol: ADMIN_ROLES, group: { label: 'Calendario', icon: 'pi pi-calendar' }, preview: 'admin-table', description: 'Gestionar eventos del calendario' },
	{ route: '/intranet/admin/notificaciones', label: 'Notificaciones', icon: 'pi pi-bell', capability: 'ADMIN_NOTIFICACIONES', modulo: 'administrador', soloParaRol: ADMIN_ROLES, group: { label: 'Calendario', icon: 'pi pi-calendar' }, preview: 'admin-notif', description: 'Enviar avisos a la comunidad' },
	{ route: '/intranet/admin/usuarios', label: 'Usuarios', icon: 'pi pi-user-edit', capability: 'ADMIN_USUARIOS', modulo: 'administrador', soloParaRol: ADMIN_ROLES, group: { label: 'Gestión', icon: 'pi pi-cog' }, preview: 'admin-table', description: 'Gestionar cuentas de usuarios' },
	{ route: '/intranet/admin/permisos/roles', label: 'Por Rol', icon: 'pi pi-id-card', capability: 'ADMIN_PERMISOS_ROLES', modulo: 'administrador', soloParaRol: ADMIN_ROLES, group: { label: 'Permisos', icon: 'pi pi-lock' }, preview: 'admin-table', description: 'Gestionar permisos por rol' },
	{ route: '/intranet/admin/permisos/usuarios', label: 'Por Usuario', icon: 'pi pi-users', capability: 'ADMIN_PERMISOS_USUARIOS', modulo: 'administrador', soloParaRol: ADMIN_ROLES, group: { label: 'Permisos', icon: 'pi pi-lock' }, preview: 'admin-table', description: 'Gestionar permisos por usuario' },
	// Monitoreo — Plan 35: 7 entradas planas colapsadas en 1 hub.
	{ route: '/intranet/admin/monitoreo', label: 'Monitoreo', icon: 'pi pi-chart-bar', capability: 'ADMIN_MONITOREO', modulo: 'administrador', soloParaRol: ADMIN_ROLES, preview: 'admin-table', description: 'Hub de monitoreo: correos, incidencias y seguridad' },
	// Brief 444: grupo renombrado de "Monitoreo" a "Diagnóstico" — colisionaba de nombre con el ítem suelto "Monitoreo" de arriba.
	{ route: '/intranet/admin/sistema/runtime-health', label: 'Salud del runtime', icon: 'pi pi-server', capability: 'ADMIN_SISTEMA_RUNTIME_HEALTH', modulo: 'administrador', soloParaRol: ADMIN_ROLES, featureFlag: 'runtimeHealth', group: { label: 'Diagnóstico', icon: 'pi pi-chart-bar' }, preview: 'admin-table', description: 'Snapshot del runtime ASP.NET (ThreadPool, Requests, BD, GC)' },
	{ route: '/intranet/admin/sistema/db-diagnostics', label: 'Diagnóstico de BD', icon: 'pi pi-database', capability: 'ADMIN_SISTEMA_DB_DIAGNOSTICS', modulo: 'administrador', soloParaRol: ADMIN_ROLES, featureFlag: 'dbDiagnostics', group: { label: 'Diagnóstico', icon: 'pi pi-chart-bar' }, preview: 'admin-table', description: 'Uso de recursos, consultas costosas, bloqueos activos y almacenamiento del motor SQL' },
	{ route: '/intranet/admin/campus', label: 'Campus', icon: 'pi pi-map', capability: 'ADMIN_CAMPUS', modulo: 'administrador', soloParaRol: ADMIN_ROLES, featureFlag: 'campusNavigation', group: { label: 'Herramientas', icon: 'pi pi-wrench' }, preview: 'admin-table', description: 'Navegar el campus virtual' },
	{ route: '/intranet/ctest-k6', label: 'Test k6', icon: 'pi pi-bolt', capability: 'CTEST_K6', modulo: 'administrador', soloParaRol: ADMIN_ROLES, featureFlag: 'ctestK6', group: { label: 'Herramientas', icon: 'pi pi-wrench' }, preview: 'admin-table', description: 'Herramienta de testing de carga' },
	// Compartido (duplicado, ver §1 brief 444) — capability sin dueño de rol fijo
	{ route: '/intranet/asistencia', label: 'Asistencia diaria', icon: 'pi pi-check-square', capability: 'ASISTENCIA', modulo: 'administrador', soloParaRol: ADMIN_ROLES, group: { label: 'Asistencia', icon: 'pi pi-clock' }, preview: 'attendance', description: 'Control de asistencia diaria' },
	{ route: '/intranet/calendario', label: 'Calendario', icon: 'pi pi-calendar', capability: 'CALENDARIO', modulo: 'administrador', soloParaRol: ADMIN_ROLES, featureFlag: 'calendario', group: { label: 'Calendario', icon: 'pi pi-calendar' }, preview: 'admin-table', description: 'Calendario de eventos y actividades' },
	{ route: '/intranet/videoconferencias', label: 'Videoconferencias', icon: 'pi pi-video', capability: 'VIDEOCONFERENCIAS', modulo: 'administrador', soloParaRol: ADMIN_ROLES, featureFlag: 'videoconferencias', preview: 'admin-table', description: 'Salas de videoconferencia' },

	// --- Apoderado (nuevo, brief 444 — derivado de quick-access.config.ts) ---
	// soloParaRol: ['Apoderado'] en todos — estos items reutilizan capabilities ADMIN_*/ASISTENCIA/CALENDARIO
	// que también tiene el cluster administrador; sin la restricción, Apoderado dispararía 'administrador' también.
	{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi pi-book', capability: 'ADMIN_CURSOS', modulo: 'apoderado', soloParaRol: ['Apoderado'], preview: 'admin-table', description: 'Ver los cursos disponibles' },
	{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi pi-calendar', capability: 'ADMIN_HORARIOS', modulo: 'apoderado', soloParaRol: ['Apoderado'], preview: 'admin-schedule', description: 'Consultar horario de clases' },
	{ route: '/intranet/admin/notificaciones', label: 'Notificaciones', icon: 'pi pi-bell', capability: 'ADMIN_NOTIFICACIONES', modulo: 'apoderado', soloParaRol: ['Apoderado'], preview: 'admin-notif', description: 'Avisos del colegio' },
	{ route: '/intranet/asistencia', label: 'Asistencia diaria', icon: 'pi pi-check-square', capability: 'ASISTENCIA', modulo: 'apoderado', soloParaRol: ['Apoderado'], preview: 'attendance', description: 'Revisar asistencia de tu hijo(a)' },
	{ route: '/intranet/calendario', label: 'Calendario', icon: 'pi pi-calendar', capability: 'CALENDARIO', modulo: 'apoderado', soloParaRol: ['Apoderado'], featureFlag: 'calendario', preview: 'admin-table', description: 'Calendario de eventos y actividades' },
];
// #endregion

/**
 * Override de label por rol para ítems compartidos entre roles con responsabilidades distintas
 * (ej. "Gestión" de asistencia significa cosas distintas para Asistente/Coordinador/Promotor).
 * Keyed por label base (no por capability): varios MenuItemDef pueden compartir `capability`
 * (ej. "Gestión" y "Reportes" comparten `ADMIN_ASISTENCIAS`) y necesitan overrides
 * independientes — keyear por capability les pisaría el mismo texto a ambos (brief 466).
 * Solo cubre los casos detectados en las auditorías 417-F6 y 466; roles/ítems no listados usan el label base.
 */
const LABEL_OVERRIDE_POR_ROL: Partial<Record<string, Partial<Record<UserRole, string>>>> = {
	Gestión: {
		'Asistente Administrativo': 'Gestión (secretaría)',
		'Coordinador Académico': 'Gestión (académica)',
		Promotor: 'Gestión (dirección)',
		Director: 'Gestión (dirección)',
	},
	Reportes: {
		'Asistente Administrativo': 'Reportes (secretaría)',
		'Coordinador Académico': 'Reportes (académica)',
		Promotor: 'Reportes (dirección)',
		Director: 'Reportes (dirección)',
	},
	'Permisos Salud': {
		Director: 'Permisos Salud (dirección)',
	},
};

/**
 * Resuelve el label a mostrar para un `MenuItemDef` según el rol activo, aplicando
 * `LABEL_OVERRIDE_POR_ROL` si corresponde. Fuente única para el menú (`buildModuloMenus`)
 * y el breadcrumb (`findMenuItemDefByUrl` + este helper) — evita que el breadcrumb muestre
 * el label crudo mientras el menú ya muestra el override (brief 466).
 */
export function resolveMenuItemLabel(item: Pick<MenuItemDef, 'label'>, rol?: UserRole): string {
	const override = rol && LABEL_OVERRIDE_POR_ROL[item.label]?.[rol];
	return override ?? item.label;
}

// #region Builder
export function buildModuloMenus(userCapabilities: Set<string>, rol?: UserRole): ModuloMenu[] {
	const hasPermisos = userCapabilities.size > 0;

	const enabledItems = MENU_ITEMS.filter(
		(item) => !item.featureFlag || environment.features[item.featureFlag],
	);

	const permittedItems = (
		hasPermisos
			? enabledItems.filter(
					(item) =>
						userCapabilities.has(item.capability) && (!item.soloParaRol || (rol && item.soloParaRol.includes(rol))),
				)
			: enabledItems
	).map((item) => ({ ...item, label: resolveMenuItemLabel(item, rol) }));

	const itemsByModulo = new Map<ModuloId, MenuItemDef[]>();
	for (const item of permittedItems) {
		const list = itemsByModulo.get(item.modulo) ?? [];
		list.push(item);
		itemsByModulo.set(item.modulo, list);
	}

	const result: ModuloMenu[] = [];
	const sortedModulos = Object.values(MODULOS).sort((a, b) => a.orden - b.orden);

	for (const modulo of sortedModulos) {
		const items = itemsByModulo.get(modulo.id);
		if (!items || items.length === 0) continue;

		result.push({
			id: modulo.id,
			label: modulo.label,
			icon: modulo.icon,
			items: groupItems(items),
		});
	}

	return result;
}

/**
 * Dado un URL, encuentra el `MenuItemDef` cuyo `route` matchea (el más específico/largo).
 * Fuente única para el breadcrumb de "sección activa" (brief 428, P84 F6) — evita que cada
 * pantalla arme su propio indicador de ubicación.
 *
 * `moduloId`, si se pasa, prioriza el duplicado que vive en ese módulo (brief 444: items
 * compartidos como Calendario/Asistencia diaria tienen un `MenuItemDef` por módulo con el
 * mismo `route` — sin esto, siempre se resolvería el primero declarado en `MENU_ITEMS`,
 * independientemente del módulo activo del usuario).
 */
export function findMenuItemDefByUrl(url: string, moduloId?: ModuloId): MenuItemDef | undefined {
	let best: MenuItemDef | undefined;
	let bestSameModulo: MenuItemDef | undefined;
	for (const item of MENU_ITEMS) {
		if (item.route && url.startsWith(item.route)) {
			if (!best || item.route.length > best.route.length) best = item;
			if (moduloId && item.modulo === moduloId && (!bestSameModulo || item.route.length > bestSameModulo.route.length)) {
				bestSameModulo = item;
			}
		}
	}
	return bestSameModulo ?? best;
}

/** Busca recursivamente (a cualquier profundidad de `children`) un item cuya route matchee la URL. */
function treeHasMatch(items: NavMenuItem[], url: string): boolean {
	return items.some(
		(item) => (item.route && url.startsWith(item.route)) || (item.children && treeHasMatch(item.children, url)),
	);
}

/** Dado un URL, detecta a qué módulo pertenece. Retorna 'inicio' si no hay match. */
export function detectModuloFromUrl(url: string, modulos: ModuloMenu[]): ModuloId {
	for (const modulo of modulos) {
		if (modulo.id === 'inicio') continue;
		if (treeHasMatch(modulo.items, url)) return modulo.id;
	}
	return 'inicio';
}

/** Convierte ModuloMenu[] a NavMenuItem[] con children agrupados (para mobile menu). */
export function modulosToNavItems(modulos: ModuloMenu[]): NavMenuItem[] {
	const result: NavMenuItem[] = [];
	for (const modulo of modulos) {
		if (modulo.id === 'inicio') {
			for (const item of modulo.items) {
				result.push(item);
			}
		} else {
			result.push({
				label: modulo.label,
				icon: modulo.icon,
				children: modulo.items,
			});
		}
	}
	return result;
}

/** Nodo hoja: item navegable sin hijos. */
function toLeaf(item: MenuItemDef): NavMenuItem {
	return {
		route: item.route,
		label: item.label,
		icon: item.icon,
		exact: item.exact,
		queryParams: item.queryParams,
	};
}

/**
 * Arma los hijos de un grupo, anidando tantos niveles como indique `subgroup` (una cadena de
 * `{label, icon}` por item — `depth` recorre esa cadena). Items sin más niveles a ese `depth`
 * quedan como hoja; los que comparten el label del nivel actual se agrupan en un submenú y
 * siguen recursando para el próximo nivel.
 */
function groupChildren(groupedItems: MenuItemDef[], depth = 0): NavMenuItem[] {
	const flat: MenuItemDef[] = [];
	const subgroups = new Map<string, { icon: string; items: MenuItemDef[] }>();

	for (const item of groupedItems) {
		const level = item.subgroup?.[depth];
		if (level) {
			const existing = subgroups.get(level.label);
			if (existing) {
				existing.items.push(item);
			} else {
				subgroups.set(level.label, { icon: level.icon, items: [item] });
			}
		} else {
			flat.push(item);
		}
	}

	const children: NavMenuItem[] = flat.map(toLeaf);
	for (const [label, { icon, items: subItems }] of subgroups) {
		children.push({ label, icon, children: groupChildren(subItems, depth + 1) });
	}

	return children.sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

/** Agrupa items por `group.label` en NavMenuItem con children. Items sin group quedan flat. */
function groupItems(items: MenuItemDef[]): NavMenuItem[] {
	const result: NavMenuItem[] = [];
	const groups = new Map<string, { icon: string; items: MenuItemDef[] }>();

	for (const item of items) {
		if (item.group) {
			const existing = groups.get(item.group.label);
			if (existing) {
				existing.items.push(item);
			} else {
				groups.set(item.group.label, { icon: item.group.icon, items: [item] });
			}
		} else {
			result.push(toLeaf(item));
		}
	}

	for (const [label, { icon, items: groupedItems }] of groups) {
		result.push({
			label,
			icon,
			children: groupChildren(groupedItems),
		});
	}

	return result.sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
// #endregion
