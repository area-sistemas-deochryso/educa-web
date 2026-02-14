// #region Implementation
/**
 * ============================================================================
 * CONFIGURACIÃ“N DE VERSIONES DE CACHE POR MÃ“DULO
 * ============================================================================
 *
 * PROPÃ“SITO:
 * InvalidaciÃ³n automÃ¡tica de cache cuando el backend cambia la estructura de datos.
 *
 * CÃ“MO FUNCIONA:
 * 1. Al iniciar la app, el sistema compara estas versiones con las guardadas en localStorage
 * 2. Si una versiÃ³n cambiÃ³ â†’ invalida automÃ¡ticamente el cache de ese mÃ³dulo
 * 3. Guarda la nueva versiÃ³n en localStorage
 * 4. El usuario nunca ve errores de deserializaciÃ³n
 *
 * CUÃNDO INCREMENTAR LA VERSIÃ“N:
 * âœ… Cambias estructura de DTOs del mÃ³dulo (agregar/quitar/renombrar campos)
 * âœ… Cambias tipos de datos (string â†’ number, null â†’ object)
 * âœ… Cambias cÃ³digos de estado o enums
 * âŒ Cambios que no afectan el JSON de respuesta (solo backend)
 * âŒ Cambios no-breaking (agregar campos opcionales al final)
 *
 * EJEMPLO DE USO:
 * ```
 * // Hiciste cambios en los DTOs de asistencias
 * asistencias: '2024-02-05-v2',  // â† Cambiar de v1 a v2
 *
 * // Al recargar la app:
 * // - Sistema detecta que asistencias cambiÃ³ de v1 a v2
 * // - Invalida automÃ¡ticamente cache de /api/ConsultaAsistencia/*
 * // - Usuario recibe datos frescos sin errores
 * ```
 *
 * FORMATO DE VERSIÃ“N RECOMENDADO:
 * YYYY-MM-DD-vN  (fecha del cambio + nÃºmero de versiÃ³n)
 * Ejemplo: '2024-02-05-v1'
 *
 * ALTERNATIVA: Cualquier string Ãºnico (git commit hash, timestamp, etc.)
 */
export const CACHE_VERSIONS = {
	/**
	 * MÃ³dulo de asistencias (ConsultaAsistencia, reportes)
	 * PatrÃ³n invalidado: /api/ConsultaAsistencia
	 */
	asistencias: '2024-02-05-v2', // â† Cambiar cuando modifiques DTOs de asistencias

	/**
	 * MÃ³dulo de usuarios (CRUD usuarios)
	 * PatrÃ³n invalidado: /api/usuarios
	 */
	usuarios: '2024-01-15-v1',

	/**
	 * MÃ³dulo de salones (CRUD salones)
	 * PatrÃ³n invalidado: /api/salones
	 */
	salones: '2024-01-15-v1',

	/**
	 * MÃ³dulo de cursos (CRUD cursos)
	 * PatrÃ³n invalidado: /api/cursos
	 */
	cursos: '2024-01-15-v1',

	/**
	 * MÃ³dulo de reportes (PDFs, estadÃ­sticas)
	 * PatrÃ³n invalidado: /api/reportes
	 */
	reportes: '2024-01-15-v1',

	/**
	 * Sistema general (permisos, configuraciÃ³n)
	 * PatrÃ³n invalidado: /api/sistema
	 */
	sistema: '2024-01-15-v1',
} as const;

/**
 * Tipo derivado para type-safety
 */
export type CacheModule = keyof typeof CACHE_VERSIONS;

/**
 * Mapeo de mÃ³dulos a patrones de URL
 * IMPORTANTE: Estos patrones se usan para invalidar el cache
 */
export const MODULE_URL_PATTERNS: Record<CacheModule, string> = {
	asistencias: '/api/ConsultaAsistencia',
	usuarios: '/api/usuarios',
	salones: '/api/salones',
	cursos: '/api/cursos',
	reportes: '/api/reportes',
	sistema: '/api/sistema',
};
// #endregion
