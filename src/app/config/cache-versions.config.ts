// #region Implementation
/**
 * Versiones de cache por módulo. Al iniciar la app, el sistema compara cada
 * versión con la guardada en localStorage y, si cambió, invalida el cache del
 * módulo correspondiente.
 *
 * Cuándo incrementar:
 * - Cambios estructurales de DTOs del módulo (agregar/quitar/renombrar campos).
 * - Cambios de tipos (string → number, null → object).
 * - Cambios de enums o códigos de estado.
 *
 * No incrementar para cambios que no afectan el JSON saliente del backend.
 *
 * Formato recomendado: `YYYY-MM-DD-vN`. Cualquier string único sirve.
 */
export const CACHE_VERSIONS = {
	/** ConsultaAsistencia, reportes. Bumpeado por Plan 21 (polimórfico),
	 * Plan 27 (umbral grado), Plan 28 (TipoPersona='A'). */
	asistencias: '2026-05-04-v3',

	/** CRUD usuarios. Bumpeado por Plan 6 (ProfesorCurso) y normalización de DTOs. */
	usuarios: '2026-05-04-v2',

	/** CRUD salones. Bumpeado por Plan 6 (modelo asignación profesor-salón). */
	salones: '2026-05-04-v2',

	/** CRUD cursos. */
	cursos: '2024-01-15-v1',

	/** Reportes (PDF/Excel). */
	reportes: '2024-01-15-v1',

	/** Sistema (permisos, vistas, configuración). */
	sistema: '2024-01-15-v1',

	/** CRUD horarios. Bumpeado por Plan 6 (validación tutor-pleno / por-curso). */
	horarios: '2026-05-04-v1',

	/** Contenido de curso (semanas, tareas, archivos). */
	cursoContenido: '2026-05-04-v1',

	/** Asistencia por curso (P/T/F en clase). */
	asistenciaCurso: '2026-05-04-v1',

	/** Calificaciones (notas, evaluaciones, promedios). */
	calificacion: '2026-05-04-v1',

	/** Grupos de contenido. */
	grupoContenido: '2026-05-04-v1',

	/** Mensajería / conversaciones (chat). */
	conversaciones: '2026-05-04-v1',
} as const;

export type CacheModule = keyof typeof CACHE_VERSIONS;

/**
 * Mapeo de módulos a patrones de URL para invalidación basada en versión.
 *
 * Consumido por `CacheVersionManager` cuando detecta que `CACHE_VERSIONS[mod]`
 * cambió respecto a la versión guardada en localStorage: invalida el SW cache
 * matcheando este patrón.
 *
 * Relación con `WAL_CACHE_MAP` (ver `core/services/wal/models/wal.models.ts`):
 *   - `MODULE_URL_PATTERNS`: keys = módulos de versionado (incluye lecturas
 *     puras como `asistencias`, `reportes`, `sistema`). Disparado por bumps
 *     manuales de `CACHE_VERSIONS`.
 *   - `WAL_CACHE_MAP`: keys = `resourceType` de entities con mutaciones WAL
 *     (incluye `Vista`, `permisos-rol`, `CursoContenidoArchivo`, etc.).
 *     Disparado automáticamente por el sync engine post-commit/rollback.
 *
 * Solo se solapan parcialmente — no derivar uno del otro. Si un módulo nuevo
 * tiene mutaciones, agregar a ambos con patrón consistente.
 *
 * Nunca consumir desde un service de "invalidación manual" — ese patrón está
 * cubierto por los dos flujos de arriba; un tercer punto de entrada hardcodea
 * URLs que se desactualizan silenciosamente.
 */
export const MODULE_URL_PATTERNS: Record<CacheModule, string> = {
	asistencias: '/api/ConsultaAsistencia',
	usuarios: '/api/sistema/usuarios',
	salones: '/api/sistema/salones',
	cursos: '/api/sistema/cursos',
	reportes: '/api/reportes',
	sistema: '/api/sistema',
	horarios: '/api/horario',
	cursoContenido: '/api/CursoContenido',
	asistenciaCurso: '/api/AsistenciaCurso',
	calificacion: '/api/Calificacion',
	grupoContenido: '/api/GrupoContenido',
	conversaciones: '/api/conversaciones',
};
// #endregion
