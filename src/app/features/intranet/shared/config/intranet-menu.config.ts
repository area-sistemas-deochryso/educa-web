// #region Imports
import { NavMenuItem } from '@intranet-shared/components/layout/intranet-layout/components';
import { environment } from '@config/environment';
import { PERMISOS, PermisoPath } from '@shared/constants';
import { ModuloId, MODULOS } from '@shared/constants/module-registry';

// #endregion

// #region Tipos
type FeatureFlag = keyof typeof environment.features;

/**
 * Wireframe layouts matching actual page structures for quick-access cards.
 */
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
	permiso: PermisoPath;
	modulo: ModuloId;
	exact?: boolean;
	featureFlag?: FeatureFlag;
	queryParams?: Record<string, string>;
	/** Items con el mismo group.label dentro de un módulo se agrupan en un dropdown. */
	group?: { label: string; icon: string };
	/** Preview layout for quick-access card visualization. */
	preview?: PreviewLayout;
	/** Short description shown on quick-access card hover. */
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
/**
 * Catálogo flat de TODOS los items del menú.
 * Cada item declara a qué módulo pertenece y qué feature flag lo controla.
 * La agrupación jerárquica se genera en runtime via `buildMenuFromModulos()`.
 *
 * Módulos:
 * - inicio:       Punto de entrada
 * - academico:    Cursos, Salones, Horarios (estructura)
 * - seguimiento:  Asistencia, Calificaciones, Reportes (operación)
 * - comunicacion: Calendario, Eventos, Foro, Mensajería (comunicación)
 * - sistema:      Usuarios, Permisos, Vistas (configuración)
 */
export const MENU_ITEMS: MenuItemDef[] = [
	// --- Inicio ---
	{ route: '/intranet', label: 'Inicio', icon: 'pi pi-home', permiso: PERMISOS.INTRANET, modulo: 'inicio', exact: true, preview: 'admin-table', description: 'Página principal de la intranet' },

	// --- Académico: "Qué se enseña, dónde y cuándo?" ---
	// Admin
	{ route: '/intranet/admin/cursos', label: 'Cursos', icon: 'pi pi-book', permiso: PERMISOS.ADMIN_CURSOS, modulo: 'academico', preview: 'admin-table', description: 'Administrar cursos y materias' },
	{ route: '/intranet/admin/salones', label: 'Salones', icon: 'pi pi-building', permiso: PERMISOS.ADMIN_SALONES, modulo: 'academico', preview: 'salon-tabs', description: 'Gestionar aulas y secciones' },
	{ route: '/intranet/admin/horarios', label: 'Horarios', icon: 'pi pi-calendar', permiso: PERMISOS.ADMIN_HORARIOS, modulo: 'academico', preview: 'admin-schedule', description: 'Configurar horarios escolares' },
	// Profesor — agrupados bajo "Mi Aula"
	{ route: '/intranet/profesor/cursos', label: 'Mis Cursos', icon: 'pi pi-book', permiso: PERMISOS.PROFESOR_CURSOS, modulo: 'academico', featureFlag: 'profesor', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'course-cards', description: 'Contenido y materiales de tus cursos' },
	{ route: '/intranet/profesor/salones', label: 'Mis Salones', icon: 'pi pi-building', permiso: PERMISOS.PROFESOR_SALONES, modulo: 'academico', featureFlag: 'profesor', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'salon-tabs', description: 'Ver los salones asignados' },
	{ route: '/intranet/profesor/horarios', label: 'Mi Horario', icon: 'pi pi-clock', permiso: PERMISOS.PROFESOR_HORARIOS, modulo: 'academico', featureFlag: 'profesor', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'week-schedule', description: 'Ver tu horario semanal de clases' },
	{ route: '/intranet/profesor/final-salones', label: 'Administrar Salones', icon: 'pi pi-th-large', permiso: PERMISOS.PROFESOR_FINAL_SALONES, modulo: 'academico', featureFlag: 'profesor', preview: 'admin-table', description: 'Administrar salones del profesor' },
	// Estudiante — agrupados bajo "Mi Aula"
	{ route: '/intranet/estudiante/cursos', label: 'Mis Cursos', icon: 'pi pi-book', permiso: PERMISOS.ESTUDIANTE_CURSOS, modulo: 'academico', featureFlag: 'estudiante', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'course-cards', description: 'Contenido y materiales de tus cursos' },
	{ route: '/intranet/estudiante/salones', label: 'Mis Salones', icon: 'pi pi-building', permiso: PERMISOS.ESTUDIANTE_SALONES, modulo: 'academico', featureFlag: 'estudiante', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'salon-tabs', description: 'Ver tus salones asignados' },
	{ route: '/intranet/estudiante/horarios', label: 'Mi Horario', icon: 'pi pi-clock', permiso: PERMISOS.ESTUDIANTE_HORARIOS, modulo: 'academico', featureFlag: 'estudiante', group: { label: 'Mi Aula', icon: 'pi pi-graduation-cap' }, preview: 'week-schedule', description: 'Ver tu horario semanal de clases' },

	// --- Seguimiento: "Cómo van los estudiantes?" ---
	// Cross-role
	{ route: '/intranet/asistencia', label: 'Asistencia', icon: 'pi pi-check-square', permiso: PERMISOS.ASISTENCIA, modulo: 'seguimiento', preview: 'attendance', description: 'Control de asistencia diaria' },
	// Admin — agrupados bajo "Asistencias (admin)"
	{ route: '/intranet/admin/asistencias', label: 'Gestión', icon: 'pi pi-cog', permiso: PERMISOS.ADMIN_ASISTENCIAS, modulo: 'seguimiento', queryParams: { tab: 'gestion' }, group: { label: 'Asistencias (admin)', icon: 'pi pi-clock' }, preview: 'attendance', description: 'Editar y corregir registros de asistencia' },
	{ route: '/intranet/admin/asistencias', label: 'Reportes', icon: 'pi pi-chart-bar', permiso: PERMISOS.ADMIN_ASISTENCIAS, modulo: 'seguimiento', queryParams: { tab: 'reportes' }, group: { label: 'Asistencias (admin)', icon: 'pi pi-clock' }, preview: 'admin-table', description: 'Estadísticas y exportación de asistencia' },
	// Profesor — agrupados bajo "Mi Seguimiento"
	{ route: '/intranet/profesor/calificaciones', label: 'Mis Calificaciones', icon: 'pi pi-chart-bar', permiso: PERMISOS.PROFESOR_CALIFICACIONES, modulo: 'seguimiento', featureFlag: 'profesor', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'grades', description: 'Registrar y consultar notas' },
	{ route: '/intranet/profesor/asistencia', label: 'Mi Asistencia', icon: 'pi pi-check-square', permiso: PERMISOS.PROFESOR_ASISTENCIA, modulo: 'seguimiento', featureFlag: 'profesor', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'attendance', description: 'Pasar lista de tus estudiantes' },
	// Estudiante — agrupados bajo "Mi Seguimiento"
	{ route: '/intranet/estudiante/notas', label: 'Mis Calificaciones', icon: 'pi pi-chart-bar', permiso: PERMISOS.ESTUDIANTE_NOTAS, modulo: 'seguimiento', featureFlag: 'estudiante', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'grades', description: 'Consultar tus calificaciones' },
	{ route: '/intranet/estudiante/asistencia', label: 'Mi Asistencia', icon: 'pi pi-check-square', permiso: PERMISOS.ESTUDIANTE_ASISTENCIA, modulo: 'seguimiento', featureFlag: 'estudiante', group: { label: 'Mi Seguimiento', icon: 'pi pi-user' }, preview: 'attendance', description: 'Revisar tu registro de asistencia' },

	// --- Comunicación: "Qué necesito saber o decir?" ---
	// Compartido
	{ route: '/intranet/calendario', label: 'Calendario', icon: 'pi pi-calendar', permiso: PERMISOS.CALENDARIO, modulo: 'comunicacion', featureFlag: 'calendario', group: { label: 'Calendario', icon: 'pi pi-calendar' }, preview: 'admin-table', description: 'Calendario de eventos y actividades' },
	{ route: '/intranet/videoconferencias', label: 'Videoconferencias', icon: 'pi pi-video', permiso: PERMISOS.VIDEOCONFERENCIAS, modulo: 'comunicacion', featureFlag: 'videoconferencias', preview: 'admin-table', description: 'Salas de videoconferencia' },
	// Admin — Calendario + Eventos + Notificaciones agrupados
	{ route: '/intranet/admin/eventos-calendario', label: 'Eventos', icon: 'pi pi-calendar-plus', permiso: PERMISOS.ADMIN_EVENTOS_CALENDARIO, modulo: 'comunicacion', group: { label: 'Calendario', icon: 'pi pi-calendar' }, preview: 'admin-table', description: 'Gestionar eventos del calendario' },
	{ route: '/intranet/admin/notificaciones', label: 'Notificaciones', icon: 'pi pi-bell', permiso: PERMISOS.ADMIN_NOTIFICACIONES, modulo: 'comunicacion', group: { label: 'Calendario', icon: 'pi pi-calendar' }, preview: 'admin-notif', description: 'Enviar avisos a la comunidad' },
	// Profesor — agrupados bajo "Mensajes"
	{ route: '/intranet/profesor/foro', label: 'Foro', icon: 'pi pi-comments', permiso: PERMISOS.PROFESOR_FORO, modulo: 'comunicacion', featureFlag: 'profesor', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'forum', description: 'Participar en discusiones del aula' },
	{ route: '/intranet/profesor/mensajeria', label: 'Mensajería', icon: 'pi pi-envelope', permiso: PERMISOS.PROFESOR_MENSAJERIA, modulo: 'comunicacion', featureFlag: 'profesor', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'messaging', description: 'Enviar y recibir mensajes' },
	// Estudiante — agrupados bajo "Mensajes"
	{ route: '/intranet/estudiante/foro', label: 'Foro', icon: 'pi pi-comments', permiso: PERMISOS.ESTUDIANTE_FORO, modulo: 'comunicacion', featureFlag: 'estudiante', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'forum', description: 'Participar en discusiones del aula' },
	{ route: '/intranet/estudiante/mensajeria', label: 'Mensajería', icon: 'pi pi-envelope', permiso: PERMISOS.ESTUDIANTE_MENSAJERIA, modulo: 'comunicacion', featureFlag: 'estudiante', group: { label: 'Mensajes', icon: 'pi pi-inbox' }, preview: 'messaging', description: 'Enviar y recibir mensajes' },

	// --- Sistema: "Cómo se configura la plataforma?" ---
	{ route: '/intranet/admin/usuarios', label: 'Usuarios', icon: 'pi pi-user-edit', permiso: PERMISOS.ADMIN_USUARIOS, modulo: 'sistema', preview: 'admin-table', description: 'Gestionar cuentas de usuarios' },
	{ route: '/intranet/admin/vistas', label: 'Vistas', icon: 'pi pi-eye', permiso: PERMISOS.ADMIN_VISTAS, modulo: 'sistema', preview: 'admin-table', description: 'Configurar vistas del sistema' },
	{ route: '/intranet/admin/permisos/roles', label: 'Por Rol', icon: 'pi pi-id-card', permiso: PERMISOS.ADMIN_PERMISOS_ROLES, modulo: 'sistema', group: { label: 'Permisos', icon: 'pi pi-shield' }, preview: 'admin-table', description: 'Gestionar permisos por rol' },
	{ route: '/intranet/admin/permisos/usuarios', label: 'Por Usuario', icon: 'pi pi-users', permiso: PERMISOS.ADMIN_PERMISOS_USUARIOS, modulo: 'sistema', group: { label: 'Permisos', icon: 'pi pi-shield' }, preview: 'admin-table', description: 'Gestionar permisos por usuario' },
	{ route: '/intranet/admin/email-outbox', label: 'Bandeja de Correos', icon: 'pi pi-envelope', permiso: PERMISOS.ADMIN_EMAIL_OUTBOX, modulo: 'sistema', preview: 'admin-table', description: 'Revisar bandeja de correos' },
	{ route: '/intranet/admin/campus', label: 'Campus', icon: 'pi pi-map', permiso: PERMISOS.ADMIN_CAMPUS, modulo: 'sistema', featureFlag: 'campusNavigation', preview: 'admin-table', description: 'Navegar el campus virtual' },
	{ route: '/intranet/ctest-k6', label: 'Test k6', icon: 'pi pi-bolt', permiso: PERMISOS.CTEST_K6, modulo: 'sistema', featureFlag: 'ctestK6', preview: 'admin-table', description: 'Herramienta de testing de carga' },
];
// #endregion

// #region Builder
/**
 * Filtra items por feature flags y permisos, agrupa por módulo.
 * Retorna ModuloMenu[] para el selector de módulo del layout.
 */
export function buildModuloMenus(vistasPermitidas: string[]): ModuloMenu[] {
	const hasPermisos = vistasPermitidas.length > 0;

	const enabledItems = MENU_ITEMS.filter(
		(item) => !item.featureFlag || environment.features[item.featureFlag],
	);

	const permittedItems = hasPermisos
		? enabledItems.filter((item) => matchPermiso(item.permiso, vistasPermitidas))
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

function matchPermiso(permiso: string, vistasPermitidas: string[]): boolean {
	const permisoNorm = (permiso.startsWith('/') ? permiso.substring(1) : permiso).toLowerCase();
	return vistasPermitidas.some((vista) => {
		const vistaNorm = (vista.startsWith('/') ? vista.substring(1) : vista).toLowerCase();
		return permisoNorm === vistaNorm;
	});
}
// #endregion
