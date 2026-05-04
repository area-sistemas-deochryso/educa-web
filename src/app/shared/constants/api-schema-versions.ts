// #region API Schema Versions
//
// PROPÓSITO: Cada endpoint cacheable lleva un fingerprint de schema. Si el FE
// y el BE no coinciden en la versión, el SW descarta la entrada cacheada y va
// a la red. Esto evita que un deploy con cambios breaking sirva JSON viejo.
//
// CUÁNDO BUMPEAR (regla):
// - Renombrar campo de un DTO devuelto                    → bump
// - Cambiar tipo (string→number, agregar union, etc.)     → bump
// - Cambiar formato de fecha / código de estado           → bump
// - Agregar campo opcional al final                        → NO bump
// - Cambiar lógica interna sin alterar el JSON             → NO bump
// - Agregar endpoint nuevo                                 → registrar en v1
// - Eliminar endpoint                                      → quitar del map
//
// SINCRONIZACIÓN: este archivo + `Educa.API/Constants/Sistema/ApiSchemaVersions.cs`
// + `public/sw.js` (mapa embebido). Bumpear los TRES en el mismo PR.
//
// INVARIANTES (ver wal-resilience-degradation.md §M4):
// - INV-WAL-RES11: si el endpoint NO está en este map, NO se cachea.
// - INV-WAL-RES12: cache miss por mismatch loggea como Information en SW.
// - INV-WAL-RES13: bumpear acá es la única forma de invalidar selectivamente.
//
// TODO: build step que genere `sw.js` desde este archivo automáticamente.
// #endregion

// #region Map
/**
 * Map de endpoints cacheables a su versión de schema actual.
 *
 * Las claves son **prefijos de path** en lowercase. La búsqueda en runtime
 * usa "longest prefix match": para `/api/sistema/usuarios/123`, gana la
 * entrada `/api/sistema/usuarios` (más larga que `/api/sistema`).
 *
 * Endpoints excluidos vía NO_CACHE_PATTERNS del SW (auth, permisos) NO
 * necesitan estar acá — no se cachean independientemente del map.
 */
export const API_SCHEMA_VERSIONS: Readonly<Record<string, number>> = Object.freeze({
	// Académico
	'/api/horario': 1,
	'/api/profesor': 1,
	'/api/profesorsalon': 1,
	'/api/profesorcurso': 1,
	'/api/cursocontenido': 1,
	'/api/grupocontenido': 1,
	'/api/calificacion': 1,
	'/api/estudiantecurso': 1,
	'/api/asistenciacurso': 1,
	'/api/boletanotas': 1,
	'/api/aprobacionestudiante': 1,
	'/api/permisos-salud': 1,

	// Asistencia (CrossChex + admin)
	'/api/consultaasistencia': 1,
	'/api/asistencia-admin': 1,
	'/api/cierre-asistencia': 1,
	'/api/reportesasistencia': 1,

	// Mensajería / campus
	'/api/conversaciones': 1,
	'/api/campus': 1,

	// Storage / utilidades
	'/api/blobstorage': 1,
	'/api/servertime': 1,

	// Sistema (admin)
	'/api/sistema/usuarios': 1,
	'/api/sistema/cursos': 1,
	'/api/sistema/salones': 1,
	'/api/sistema/grados': 1,
	'/api/sistema/permisos': 1,
	'/api/sistema/notificaciones': 1,
	'/api/sistema/eventoscalendario': 1,
	'/api/sistema/reportes-usuario': 1,
	'/api/sistema/correlation': 1,
	'/api/sistema/auditoria-correos-asistencia': 1,
	'/api/sistema/error-groups': 1,
	'/api/sistema/errors': 1,
	'/api/sistema/rate-limit-events': 1,
	'/api/sistema/asistencia': 1,
	'/api/sistema/email-outbox': 1,
	'/api/sistema/email-blacklist': 1,
});
// #endregion

// #region Helpers
/**
 * Devuelve la versión de schema esperada para un path, o `null` si el
 * endpoint no está mapeado. Usa longest-prefix match (case-insensitive).
 *
 * Resultado `null` significa "no cachear" según INV-WAL-RES11 — el caller
 * decide si saltar el cache write o asumir versión default.
 */
export function getSchemaVersion(path: string): number | null {
	const normalized = path.toLowerCase();
	let bestMatch: string | null = null;
	for (const key of Object.keys(API_SCHEMA_VERSIONS)) {
		if (normalized === key || normalized.startsWith(key + '/') || normalized.startsWith(key + '?')) {
			if (bestMatch === null || key.length > bestMatch.length) {
				bestMatch = key;
			}
		}
	}
	return bestMatch === null ? null : API_SCHEMA_VERSIONS[bestMatch];
}

/**
 * Extrae el path de una URL absoluta o relativa. Tolera URLs sin host.
 */
export function extractPathname(url: string): string {
	try {
		const parsed = new URL(url, 'http://placeholder.local');
		return parsed.pathname;
	} catch {
		const qIdx = url.indexOf('?');
		return qIdx >= 0 ? url.substring(0, qIdx) : url;
	}
}
// #endregion
