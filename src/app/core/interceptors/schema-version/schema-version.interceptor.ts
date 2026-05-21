// #region Imports
import { HttpInterceptorFn } from '@angular/common/http';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-50-F3a
import { extractPathname, getSchemaVersion } from '@shared/constants';
// #endregion

// #region Implementation

const SCHEMA_VERSION_HEADER = 'X-Schema-Version';

/**
 * Plan WAL Resilience M4 — Schema fingerprint en cache.
 *
 * Inserta el header `X-Schema-Version` en cada request `/api/*` GET cuyo
 * path matchea un endpoint registrado en `API_SCHEMA_VERSIONS`. El BE
 * espeja el header en la response (ver `SchemaVersionMiddleware`); el SW
 * lo persiste con la entrada cacheada. Si el FE bumpea el número y el BE
 * todavía no, mismatch → discard local y network fetch (ver §M4 del doc
 * de resiliencia).
 *
 * Endpoints sin entrada en el map NO reciben header — el SW los excluye
 * del cache (INV-WAL-RES11). Tolerar requests sin path mapeable es el
 * comportamiento conservador correcto para mutations (POST/PUT/DELETE)
 * y para endpoints transversales (auth, permisos).
 */
export const schemaVersionInterceptor: HttpInterceptorFn = (req, next) => {
	if (req.method !== 'GET') return next(req);

	const path = extractPathname(req.url);
	if (!path.startsWith('/api/')) return next(req);

	const version = getSchemaVersion(path);
	if (version === null) return next(req);

	const cloned = req.clone({
		setHeaders: { [SCHEMA_VERSION_HEADER]: String(version) },
	});
	return next(cloned);
};
// #endregion
