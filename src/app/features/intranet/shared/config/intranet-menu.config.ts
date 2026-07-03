// #region Imports
import { NavMenuItem } from '@intranet-shared/components/layout/intranet-layout/components';
import { environment } from '@config/environment';
import { ModuloId, MODULOS } from '@shared/constants';
import { CapabilityCode } from '@shared/types';

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
	preview?: PreviewLayout;
	description?: string;
}

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

	// --- Académico: "Qué se enseña, dónde y cuándo?" ---
	// Admin — agrupados bajo "Administración"
	{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi pi-book', capability: 'ADMIN_CURSOS', modulo: 'academico', group: { label: 'Administración', icon: 'pi pi-cog' }, preview: 'admin-table', description: 'Administrar cursos y materias' },
	{ route: '/intranet/admin/salones', label: 'Salones', icon: 'pi pi-building', capability: 'ADMIN_SALONES', modulo: 'academico', group: { label: 'Administración', icon: 'pi pi-cog' }, preview: 'salon-tabs', description: 'Gestionar aulas y secciones' },
	{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi pi-calendar', capability: 'ADMIN_HORARIOS', modulo: 'academico', group: { label: 'Administración', icon: 'pi pi-cog' }, preview: 'admin-schedule', description: 'Configurar horarios escolares' },
	// Profesor — agrupados bajo "Mi Aula"
	{ route: '/intranet/profesor/cursos', label: 'Mis Cursos', icon: 'pi pi-book', capability: 'PROFESOR_CURSOS', modulo: 'academico', featureFlag: 'profesor', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'course-cards', description: 'Contenido y materiales de tus cursos' },
	{ route: '/intranet/profesor/salones', label: 'Mis Salones', icon: 'pi pi-building', capability: 'PROFESOR_SALONES', modulo: 'academico', featureFlag: 'profesor', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'salon-tabs', description: 'Ver los salones asignados' },
	{ route: '/intranet/profesor/horarios', label: 'Mi Horario', icon: 'pi pi-clock', capability: 'PROFESOR_HORARIOS', modulo: 'academico', featureFlag: 'profesor', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'week-schedule', description: 'Ver tu horario semanal de clases' },
	{ route: '/intranet/profesor/final-salones', label: 'Administrar Salones', icon: 'pi pi-th-large', capability: 'PROFESOR_FINAL_SALONES', modulo: 'academico', featureFlag: 'profesor', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'admin-table', description: 'Administrar salones del profesor' },
	// Estudiante — agrupados bajo "Mi Aula"
	{ route: '/intranet/estudiante/cursos', label: 'Mis Cursos', icon: 'pi pi-book', capability: 'ESTUDIANTE_CURSOS', modulo: 'academico', featureFlag: 'estudiante', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'course-cards', description: 'Contenido y materiales de tus cursos' },
	{ route: '/intranet/estudiante/salones', label: 'Mis Salones', icon: 'pi pi-building', capability: 'ESTUDIANTE_SALONES', modulo: 'academico', featureFlag: 'estudiante', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'salon-tabs', description: 'Ver tus salones asignados' },
	{ route: '/intranet/estudiante/horarios', label: 'Mi Horario', icon: 'pi pi-clock', capability: 'ESTUDIANTE_HORARIOS', modulo: 'academico', featureFlag: 'estudiante', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'week-schedule', description: 'Ver tu horario semanal de clases' },

	// --- Seguimiento: "Cómo van los estudiantes?" ---
	// Asistencia — cross-role + admin agrupados
	{ route: '/intranet/asistencia', label: 'Asistencia diaria', icon: 'pi pi-check-square', capability: 'ASISTENCIA', modulo: 'seguimiento', group: { label: 'Asistencia', icon: 'pi pi-clock' }, preview: 'attendance', description: 'Control de asistencia diaria' },
	{ route: '/intranet/admin/asistencias', label: 'Gestión (admin)', icon: 'pi pi-cog', capability: 'ADMIN_ASISTENCIAS', modulo: 'seguimiento', queryParams: { tab: 'gestion' }, group: { label: 'Asistencia', icon: 'pi pi-clock' }, preview: 'attendance', description: 'Editar y corregir registros de asistencia' },
	{ route: '/intranet/admin/asistencias', label: 'Reportes (admin)', icon: 'pi pi-chart-bar', capability: 'ADMIN_ASISTENCIAS', modulo: 'seguimiento', queryParams: { tab: 'reportes' }, group: { label: 'Asistencia', icon: 'pi pi-clock' }, preview: 'admin-table', description: 'Estadísticas y exportación de asistencia' },
	{ route: '/intranet/admin/permisos-salud', label: 'Permisos Salud (admin)', icon: 'pi pi-heart', capability: 'ADMIN_PERMISOS_SALUD', modulo: 'seguimiento', group: { label: 'Asistencia', icon: 'pi pi-clock' }, preview: 'admin-table', description: 'Permisos de salida y justificaciones médicas' },
	// Profesor — agrupados bajo "Mi Seguimiento"
	{ route: '/intranet/profesor/calificaciones', label: 'Mis Calificaciones', icon: 'pi pi-chart-bar', capability: 'PROFESOR_CALIFICACIONES', modulo: 'seguimiento', featureFlag: 'profesor', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'grades', description: 'Registrar y consultar notas' },
	{ route: '/intranet/profesor/asistencia', label: 'Mi Asistencia', icon: 'pi pi-check-square', capability: 'PROFESOR_ASISTENCIA', modulo: 'seguimiento', featureFlag: 'profesor', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'attendance', description: 'Pasar lista de tus estudiantes' },
	// Estudiante — agrupados bajo "Mi Seguimiento"
	{ route: '/intranet/estudiante/notas', label: 'Mis Calificaciones', icon: 'pi pi-chart-bar', capability: 'ESTUDIANTE_NOTAS', modulo: 'seguimiento', featureFlag: 'estudiante', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'grades', description: 'Consultar tus calificaciones' },
	{ route: '/intranet/estudiante/asistencia', label: 'Mi Asistencia', icon: 'pi pi-check-square', capability: 'ESTUDIANTE_ASISTENCIA', modulo: 'seguimiento', featureFlag: 'estudiante', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'attendance', description: 'Revisar tu registro de asistencia' },

	// --- Comunicación: "Qué necesito saber o decir?" ---
	// Compartido + Admin — agrupados bajo "Calendario"
	{ route: '/intranet/calendario', label: 'Calendario', icon: 'pi pi-calendar', capability: 'CALENDARIO', modulo: 'comunicacion', featureFlag: 'calendario', group: { label: 'Calendario', icon: 'pi pi-calendar' }, preview: 'admin-table', description: 'Calendario de eventos y actividades' },
	{ route: '/intranet/admin/eventos-calendario', label: 'Eventos', icon: 'pi pi-calendar-plus', capability: 'ADMIN_EVENTOS_CALENDARIO', modulo: 'comunicacion', group: { label: 'Calendario', icon: 'pi pi-calendar' }, preview: 'admin-table', description: 'Gestionar eventos del calendario' },
	{ route: '/intranet/admin/notificaciones', label: 'Notificaciones', icon: 'pi pi-bell', capability: 'ADMIN_NOTIFICACIONES', modulo: 'comunicacion', group: { label: 'Calendario', icon: 'pi pi-calendar' }, preview: 'admin-notif', description: 'Enviar avisos a la comunidad' },
	// Compartido — Videoconferencias (comunicación en vivo, no es calendario)
	{ route: '/intranet/videoconferencias', label: 'Videoconferencias', icon: 'pi pi-video', capability: 'VIDEOCONFERENCIAS', modulo: 'comunicacion', featureFlag: 'videoconferencias', preview: 'admin-table', description: 'Salas de videoconferencia' },
	// Profesor — agrupados bajo "Mensajes"
	{ route: '/intranet/profesor/foro', label: 'Foro', icon: 'pi pi-comments', capability: 'PROFESOR_FORO', modulo: 'comunicacion', featureFlag: 'profesor', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'forum', description: 'Participar en discusiones del aula' },
	{ route: '/intranet/profesor/mensajeria', label: 'Mensajería', icon: 'pi pi-envelope', capability: 'PROFESOR_MENSAJERIA', modulo: 'comunicacion', featureFlag: 'profesor', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'messaging', description: 'Enviar y recibir mensajes' },
	// Estudiante — agrupados bajo "Mensajes"
	{ route: '/intranet/estudiante/foro', label: 'Foro', icon: 'pi pi-comments', capability: 'ESTUDIANTE_FORO', modulo: 'comunicacion', featureFlag: 'estudiante', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'forum', description: 'Participar en discusiones del aula' },
	{ route: '/intranet/estudiante/mensajeria', label: 'Mensajería', icon: 'pi pi-envelope', capability: 'ESTUDIANTE_MENSAJERIA', modulo: 'comunicacion', featureFlag: 'estudiante', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'messaging', description: 'Enviar y recibir mensajes' },

	// --- Sistema: "Cómo se configura la plataforma?" ---
	// Gestión — usuarios
	{ route: '/intranet/admin/usuarios', label: 'Usuarios', icon: 'pi pi-user-edit', capability: 'ADMIN_USUARIOS', modulo: 'sistema', group: { label: 'Gestión', icon: 'pi pi-cog' }, preview: 'admin-table', description: 'Gestionar cuentas de usuarios' },
	// Permisos — control de acceso (par conceptual separado de gestión de entidades)
	{ route: '/intranet/admin/permisos/roles', label: 'Por Rol', icon: 'pi pi-id-card', capability: 'ADMIN_PERMISOS_ROLES', modulo: 'sistema', group: { label: 'Permisos', icon: 'pi pi-lock' }, preview: 'admin-table', description: 'Gestionar permisos por rol' },
	{ route: '/intranet/admin/permisos/usuarios', label: 'Por Usuario', icon: 'pi pi-users', capability: 'ADMIN_PERMISOS_USUARIOS', modulo: 'sistema', group: { label: 'Permisos', icon: 'pi pi-lock' }, preview: 'admin-table', description: 'Gestionar permisos por usuario' },
	// Monitoreo — Plan 35: 7 entradas planas colapsadas en 1 hub.
	{ route: '/intranet/admin/monitoreo', label: 'Monitoreo', icon: 'pi pi-chart-bar', capability: 'ADMIN_MONITOREO', modulo: 'sistema', preview: 'admin-table', description: 'Hub de monitoreo: correos, incidencias y seguridad' },
	// Brief 102 — runtime health (entrada propia bajo Monitoreo)
	{ route: '/intranet/admin/sistema/runtime-health', label: 'Salud del runtime', icon: 'pi pi-server', capability: 'ADMIN_SISTEMA_RUNTIME_HEALTH', modulo: 'sistema', featureFlag: 'runtimeHealth', group: { label: 'Monitoreo', icon: 'pi pi-chart-bar' }, preview: 'admin-table', description: 'Snapshot del runtime ASP.NET (ThreadPool, Requests, BD, GC)' },
	// Brief 399 — diagnóstico de BD (entrada propia bajo Monitoreo, mismo patrón que runtime-health)
	{ route: '/intranet/admin/sistema/db-diagnostics', label: 'Diagnóstico de BD', icon: 'pi pi-database', capability: 'ADMIN_SISTEMA_DB_DIAGNOSTICS', modulo: 'sistema', featureFlag: 'dbDiagnostics', group: { label: 'Monitoreo', icon: 'pi pi-chart-bar' }, preview: 'admin-table', description: 'Uso de recursos, consultas costosas, bloqueos activos y almacenamiento del motor SQL' },
	// Herramientas — utilidades dev/admin (no son observabilidad)
	{ route: '/intranet/admin/campus', label: 'Campus', icon: 'pi pi-map', capability: 'ADMIN_CAMPUS', modulo: 'sistema', featureFlag: 'campusNavigation', group: { label: 'Herramientas', icon: 'pi pi-wrench' }, preview: 'admin-table', description: 'Navegar el campus virtual' },
	{ route: '/intranet/ctest-k6', label: 'Test k6', icon: 'pi pi-bolt', capability: 'CTEST_K6', modulo: 'sistema', featureFlag: 'ctestK6', group: { label: 'Herramientas', icon: 'pi pi-wrench' }, preview: 'admin-table', description: 'Herramienta de testing de carga' },
];
// #endregion

// #region Builder
export function buildModuloMenus(userCapabilities: Set<string>): ModuloMenu[] {
	const hasPermisos = userCapabilities.size > 0;

	const enabledItems = MENU_ITEMS.filter(
		(item) => !item.featureFlag || environment.features[item.featureFlag],
	);

	const permittedItems = hasPermisos
		? enabledItems.filter((item) => userCapabilities.has(item.capability))
		: enabledItems;

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

/** Dado un URL, detecta a qué módulo pertenece. Retorna 'inicio' si no hay match. */
export function detectModuloFromUrl(url: string, modulos: ModuloMenu[]): ModuloId {
	for (const modulo of modulos) {
		if (modulo.id === 'inicio') continue;
		for (const item of modulo.items) {
			if (item.route && url.startsWith(item.route)) return modulo.id;
			if (item.children) {
				for (const child of item.children) {
					if (child.route && url.startsWith(child.route)) return modulo.id;
				}
			}
		}
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
			result.push({
				route: item.route,
				label: item.label,
				icon: item.icon,
				exact: item.exact,
				queryParams: item.queryParams,
			});
		}
	}

	for (const [label, { icon, items: groupedItems }] of groups) {
		result.push({
			label,
			icon,
			children: groupedItems
				.sort((a, b) => a.label.localeCompare(b.label, 'es'))
				.map((item) => ({
					route: item.route,
					label: item.label,
					icon: item.icon,
					exact: item.exact,
					queryParams: item.queryParams,
				})),
		});
	}

	return result.sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
// #endregion
