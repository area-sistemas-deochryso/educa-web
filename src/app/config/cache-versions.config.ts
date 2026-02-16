// #region Implementation
/**
 * ============================================================================
 * CONFIGURACIÓN DE VERSIONES DE CACHE POR MÓDULO
 * ============================================================================
 *
 * PROPÓSITO:
 * Invalidación automática de cache cuando el backend cambia la estructura de datos.
 *
 * CÓMO FUNCIONA:
 * 1. Al iniciar la app, el sistema compara estas versiones con las guardadas en localStorage
 * 2. Si una versión cambió → invalida automáticamente el cache de ese módulo
 * 3. Guarda la nueva versión en localStorage
 * 4. El usuario nunca ve errores de deserialización
 *
 * CUÁNDO INCREMENTAR LA VERSIÓN:
 * ✅ Cambias estructura de DTOs del módulo (agregar/quitar/renombrar campos)
 * ✅ Cambias tipos de datos (string → number, null → object)
 * ✅ Cambias códigos de estado o enums
 * ❌ Cambios que no afectan el JSON de respuesta (solo backend)
 * ❌ Cambios no-breaking (agregar campos opcionales al final)
 *
 * EJEMPLO DE USO:
 * ```
 * // Hiciste cambios en los DTOs de asistencias
 * asistencias: '2024-02-05-v2',  // ← Cambiar de v1 a v2
 *
 * // Al recargar la app:
 * // - Sistema detecta que asistencias cambió de v1 a v2
 * // - Invalida automáticamente cache de /api/ConsultaAsistencia/*
 * // - Usuario recibe datos frescos sin errores
 * ```
 *
 * FORMATO DE VERSIÓN RECOMENDADO:
 * YYYY-MM-DD-vN  (fecha del cambio + número de versión)
 * Ejemplo: '2024-02-05-v1'
 *
 * ALTERNATIVA: Cualquier string único (git commit hash, timestamp, etc.)
 */
export const CACHE_VERSIONS = {
	/**
	 * Módulo de asistencias (ConsultaAsistencia, reportes)
	 * Patrón invalidado: /api/ConsultaAsistencia
	 */
	asistencias: '2024-02-05-v2', // ← Cambiar cuando modifiques DTOs de asistencias

	/**
	 * Módulo de usuarios (CRUD usuarios)
	 * Patrón invalidado: /api/usuarios
	 */
	usuarios: '2024-01-15-v1',

	/**
	 * Módulo de salones (CRUD salones)
	 * Patrón invalidado: /api/salones
	 */
	salones: '2024-01-15-v1',

	/**
	 * Módulo de cursos (CRUD cursos)
	 * Patrón invalidado: /api/cursos
	 */
	cursos: '2024-01-15-v1',

	/**
	 * Módulo de reportes (PDFs, estadísticas)
	 * Patrón invalidado: /api/reportes
	 */
	reportes: '2024-01-15-v1',

	/**
	 * Sistema general (permisos, configuración)
	 * Patrón invalidado: /api/sistema
	 */
	sistema: '2024-01-15-v1',
} as const;

/**
 * Tipo derivado para type-safety
 */
export type CacheModule = keyof typeof CACHE_VERSIONS;

/**
 * Mapeo de módulos a patrones de URL
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
