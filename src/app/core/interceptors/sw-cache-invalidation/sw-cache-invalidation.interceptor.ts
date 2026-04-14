import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';

import { SwService } from '@features/intranet/services/sw/sw.service';
import { logger } from '@core/helpers';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);
const API_PREFIX = '/api/';

/**
 * Interceptor que invalida el cache del SW automáticamente después de
 * cualquier mutación exitosa (POST/PUT/DELETE/PATCH).
 *
 * Esto garantiza que el próximo GET a ese recurso va directo al servidor
 * (cache MISS), eliminando la necesidad de invalidar cache manualmente
 * en cada facade.
 *
 * Ejemplo: PUT /api/sistema/usuarios/Estudiante/77
 *   → extrae "/api/sistema/usuarios"
 *   → invalida todas las entradas de cache que contengan ese patrón
 *   → el siguiente GET /api/sistema/usuarios?page=1 va a red
 */
export const swCacheInvalidationInterceptor: HttpInterceptorFn = (req, next) => {
	if (!MUTATION_METHODS.has(req.method)) {
		return next(req);
	}

	const swService = inject(SwService);

	return next(req).pipe(
		tap((event) => {
			if (event instanceof HttpResponse && event.ok) {
				const pattern = extractResourcePattern(req.url);
				if (pattern) {
					swService.invalidateCacheByPattern(pattern);
					logger.log(`[SW-Cache] Auto-invalidado "${pattern}" por ${req.method}`);
				}
			}
		}),
	);
};

/**
 * Extrae el patrón base del recurso API para invalidar cache.
 *
 * /api/sistema/usuarios/crear           → /api/sistema/usuarios
 * /api/sistema/usuarios/Estudiante/77   → /api/sistema/usuarios
 * /api/horario/5/toggle-estado          → /api/horario
 * /api/sistema/permisos/rol/crear       → /api/sistema/permisos
 *
 * Estrategia: tomar los primeros segmentos del path hasta encontrar
 * un segmento que sea un ID numérico o una acción conocida.
 */
function extractResourcePattern(url: string): string | null {
	try {
		const urlObj = new URL(url, 'https://placeholder');
		const path = urlObj.pathname;

		const apiIndex = path.indexOf(API_PREFIX);
		if (apiIndex === -1) return null;

		const apiPath = path.substring(apiIndex);
		const segments = apiPath.split('/').filter(Boolean);

		// segments: ['api', 'sistema', 'usuarios', 'Estudiante', '77']
		// or:       ['api', 'horario', '5', 'toggle-estado']
		// or:       ['api', 'sistema', 'permisos', 'rol', 'crear']

		const resourceSegments: string[] = [];
		for (const segment of segments) {
			// Parar antes de IDs numéricos, acciones CRUD, o discriminadores PascalCase
			// (ej: /api/sistema/usuarios/Profesor/24 → el segmento "Profesor" es un rol,
			// no parte del recurso base — la lista paginada vive en /api/sistema/usuarios).
			if (/^\d+$/.test(segment)) break;
			if (isActionSegment(segment)) break;
			if (/^[A-Z]/.test(segment)) break;
			resourceSegments.push(segment);
		}

		if (resourceSegments.length <= 1) return null; // solo '/api' — no es útil

		return '/' + resourceSegments.join('/');
	} catch {
		return null;
	}
}

/** Segmentos que indican una acción, no parte del recurso base */
function isActionSegment(segment: string): boolean {
	const actions = new Set([
		'crear', 'actualizar', 'eliminar', 'toggle-estado',
		'estado', 'importar', 'exportar', 'masivo',
	]);
	return actions.has(segment.toLowerCase());
}
