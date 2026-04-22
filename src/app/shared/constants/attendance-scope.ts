// #region Plan 27 · INV-C11 — Umbral y catálogo de grados con asistencia diaria biométrica

/**
 * Plan 27 · INV-C11. Grados con `GRA_Orden >= UMBRAL_GRADO_ASISTENCIA_DIARIA`
 * (5to Primaria en adelante) usan asistencia diaria biométrica vía CrossChex.
 * Los grados inferiores están temporalmente fuera del alcance.
 *
 * Mirror del backend: `Educa.API.Constants.Asistencias.AsistenciaGrados.UmbralGradoAsistenciaDiaria`.
 * Si cambia en BE, actualizar aquí en el mismo despliegue.
 */
export const UMBRAL_GRADO_ASISTENCIA_DIARIA = 8;

/**
 * Catálogo canónico de grados → `GRA_Orden`. Mirror de la tabla `Grado` en BD
 * (maestro.md, tabla de grados 1-14). Fuente de verdad para el FE cuando el
 * backend no envía `graOrden` directamente.
 */
export const GRADO_ORDEN_MAP: Readonly<Record<string, number>> = {
	'1ro Inicial': 1,
	'2do Inicial': 2,
	'3ro Inicial': 3,
	'1ro Primaria': 4,
	'2do Primaria': 5,
	'3ro Primaria': 6,
	'4to Primaria': 7,
	'5to Primaria': 8,
	'6to Primaria': 9,
	'1ro Secundaria': 10,
	'2do Secundaria': 11,
	'3ro Secundaria': 12,
	'4to Secundaria': 13,
	'5to Secundaria': 14,
};

/**
 * Resuelve `GRA_Orden` desde un nombre canónico de grado.
 * Retorna `null` si el nombre no existe en el catálogo (defensivo: no asume
 * alcance para grados desconocidos — el backend decide).
 */
export function resolverGraOrden(gradoNombre: string | null | undefined): number | null {
	if (!gradoNombre) return null;
	const orden = GRADO_ORDEN_MAP[gradoNombre];
	return typeof orden === 'number' ? orden : null;
}

/**
 * `true` si el grado entra al alcance biométrico diario
 * (`GRA_Orden >= UMBRAL_GRADO_ASISTENCIA_DIARIA`).
 *
 * Acepta orden numérico directo (preferido cuando el backend envía `graOrden`)
 * o nombre canónico (fallback cuando solo llega `grado: string`).
 * Devuelve `false` conservadoramente si el grado es desconocido o null — el
 * mensaje "aún no usa biométrico" NO se muestra ante ambigüedad.
 */
export function esGradoAsistenciaDiaria(grado: string | number | null | undefined): boolean {
	if (grado === null || grado === undefined) return false;
	const orden = typeof grado === 'number' ? grado : resolverGraOrden(grado);
	if (orden === null) return false;
	return orden >= UMBRAL_GRADO_ASISTENCIA_DIARIA;
}

// #endregion
