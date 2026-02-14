const DB_NAME = 'educa-cache-db';

// #region VERSIONADO DE CACHE - PrevenciÃƒÆ’Ã‚Â³n de errores por cambios backend
//
// PROPÃƒÆ’Ã¢â‚¬Å“SITO: Invalidar automÃƒÆ’Ã‚Â¡ticamente el cache cuando hay cambios breaking
//
// PROBLEMA QUE RESUELVE:
// Cuando el backend cambia la estructura de DTOs (agregar/quitar campos, cambiar tipos),
// el cache guarda datos con estructura antigua. La app intenta deserializar datos
// incompatibles ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ error en el frontend la primera vez ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ segunda vez funciona porque
// el cache ya se actualizÃƒÆ’Ã‚Â³. Esto genera errores intermitentes en producciÃƒÆ’Ã‚Â³n.
//
// SOLUCIÃƒÆ’Ã¢â‚¬Å“N:
// Incrementar DB_VERSION fuerza la recreaciÃƒÆ’Ã‚Â³n de IndexedDB al hacer deploy.
// Esto limpia automÃƒÆ’Ã‚Â¡ticamente TODO el cache de todos los usuarios.
//
// CUÃƒÆ’Ã‚ÂNDO INCREMENTAR:
// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Cambiar estructura de DTOs (agregar/quitar/renombrar campos)
// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Cambiar tipos de datos (string ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ number, null ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ object)
// ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Cambiar cÃƒÆ’Ã‚Â³digos de estado (A/T/F ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ nuevos cÃƒÆ’Ã‚Â³digos)
// ÃƒÂ¢Ã‚ÂÃ…â€™ Agregar campos opcionales al final (no es breaking)
// ÃƒÂ¢Ã‚ÂÃ…â€™ Cambios solo de backend que no afectan JSON de respuesta
//
const DB_VERSION = 2; // ÃƒÂ¢Ã¢â‚¬Â Ã‚Â Incrementado por cambios en estructura de asistencia
const STORE_NAME = 'api-cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

// URLs de API que queremos cachear (solo GET)
const API_URL_PATTERNS = ['/api/'];

// URLs que NUNCA deben cachearse (datos especÃƒÆ’Ã‚Â­ficos por usuario/sesiÃƒÆ’Ã‚Â³n)
const NO_CACHE_PATTERNS = [
	'/api/sistema/permisos',
	'/api/Auth/perfil',
	'/api/Auth/login',
	'/api/Auth/verificar',
];

// Abrir/crear la base de datos IndexedDB
function openDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = event => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
				store.createIndex('timestamp', 'timestamp', { unique: false });
			}
		};
	});
}

// ParÃƒÆ’Ã‚Â¡metros de cache-busting que se eliminan al normalizar la URL
// Todos los demÃƒÆ’Ã‚Â¡s parÃƒÆ’Ã‚Â¡metros se conservan como parte de la cache key
const PARAMS_TO_STRIP = ['_', 't', 'timestamp', 'cacheBust', 'nocache', 'cb', 'v'];

// Normalizar URL para usar como clave (elimina solo params de cache-busting)
function normalizeUrl(url) {
	try {
		const urlObj = new URL(url);
		for (const param of PARAMS_TO_STRIP) {
			urlObj.searchParams.delete(param);
		}
		// Ordenar params para cache key determinÃƒÆ’Ã‚Â­stica
		urlObj.searchParams.sort();
		return urlObj.toString();
	} catch (e) {
		return url;
	}
}

// Guardar respuesta en IndexedDB
async function saveToCache(url, data) {
	try {
		const normalizedUrl = normalizeUrl(url);
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		const cacheEntry = {
			url: normalizedUrl,
			originalUrl: url,
			data: data,
			timestamp: Date.now(),
		};

		store.put(cacheEntry);

		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => {
				db.close();
				console.log('[SW] Cache guardado para:', normalizedUrl);
				resolve();
			};
			transaction.onerror = () => {
				db.close();
				reject(transaction.error);
			};
		});
	} catch (error) {
		console.error('[SW] Error saving to cache:', error);
	}
}

// Obtener respuesta de IndexedDB
async function getFromCache(url) {
	try {
		const normalizedUrl = normalizeUrl(url);
		console.log('[SW] Buscando en cache:', normalizedUrl);

		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get(normalizedUrl);

		return new Promise((resolve, reject) => {
			request.onsuccess = () => {
				db.close();
				const result = request.result;

				if (result) {
					console.log('[SW] Encontrado en cache, timestamp:', new Date(result.timestamp).toISOString());
					// Verificar si el cache ha expirado
					const isExpired = Date.now() - result.timestamp > CACHE_EXPIRY;
					if (!isExpired) {
						console.log('[SW] Cache vÃƒÆ’Ã‚Â¡lido, devolviendo datos');
						resolve(result.data);
					} else {
						console.log('[SW] Cache expirado');
						resolve(null);
					}
				} else {
					console.log('[SW] No encontrado en cache');
					resolve(null);
				}
			};
			request.onerror = () => {
				db.close();
				console.error('[SW] Error al leer cache:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('[SW] Error getting from cache:', error);
		return null;
	}
}

// Listar todas las URLs en cache (para debug)
async function listCachedUrls() {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.getAllKeys();

		return new Promise((resolve) => {
			request.onsuccess = () => {
				db.close();
				console.log('[SW] URLs en cache:', request.result);
				resolve(request.result);
			};
			request.onerror = () => {
				db.close();
				resolve([]);
			};
		});
	} catch (error) {
		return [];
	}
}

// Limpiar entradas expiradas del cache
async function cleanExpiredCache() {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const index = store.index('timestamp');
		const expiredTime = Date.now() - CACHE_EXPIRY;

		const range = IDBKeyRange.upperBound(expiredTime);
		const request = index.openCursor(range);

		request.onsuccess = event => {
			const cursor = event.target.result;
			if (cursor) {
				console.log('[SW] Limpiando cache expirado:', cursor.primaryKey);
				store.delete(cursor.primaryKey);
				cursor.continue();
			}
		};

		transaction.oncomplete = () => db.close();
	} catch (error) {
		console.error('[SW] Error cleaning cache:', error);
	}
}


// #endregion
// #region INVALIDACIÃƒÆ’Ã¢â‚¬Å“N QUIRÃƒÆ’Ã…Â¡RGICA - Limpieza selectiva sin afectar todo el cache

/**
 * PROPÃƒÆ’Ã¢â‚¬Å“SITO: Invalidar un endpoint especÃƒÆ’Ã‚Â­fico sin tocar el resto del cache
 *
 * PROBLEMA QUE RESUELVE:
 * clearCache() es muy agresivo - borra TODO, incluso datos de mÃƒÆ’Ã‚Â³dulos que no cambiaron.
 * Esto causa refetch innecesario de datos estables, desperdiciando ancho de banda.
 *
 * SOLUCIÃƒÆ’Ã¢â‚¬Å“N:
 * Eliminar solo la entrada especÃƒÆ’Ã‚Â­fica del cache. El resto permanece intacto.
 * La prÃƒÆ’Ã‚Â³xima peticiÃƒÆ’Ã‚Â³n a esta URL irÃƒÆ’Ã‚Â¡ al servidor y obtendrÃƒÆ’Ã‚Â¡ la nueva estructura.
 *
 * @param {string} url - URL exacta a invalidar (se normalizarÃƒÆ’Ã‚Â¡ automÃƒÆ’Ã‚Â¡ticamente)
 */
async function invalidateCacheByUrl(url) {
	try {
		const normalizedUrl = normalizeUrl(url);
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		await store.delete(normalizedUrl);

		return new Promise((resolve) => {
			transaction.oncomplete = () => {
				db.close();
				console.log('[SW] Cache invalidado para:', normalizedUrl);
				resolve();
			};
			transaction.onerror = () => {
				db.close();
				console.error('[SW] Error invalidando cache:', transaction.error);
				resolve(); // No fallar si hay error
			};
		});
	} catch (error) {
		console.error('[SW] Error en invalidateCacheByUrl:', error);
	}
}

/**
 * PROPÃƒÆ’Ã¢â‚¬Å“SITO: Invalidar todos los endpoints de un mÃƒÆ’Ã‚Â³dulo cuando cambia su estructura
 *
 * PROBLEMA QUE RESUELVE:
 * Los cambios backend suelen afectar mÃƒÆ’Ã‚Âºltiples endpoints relacionados de un mÃƒÆ’Ã‚Â³dulo.
 * Invalidar uno por uno es tedioso y propenso a olvidar alguno.
 *
 * SOLUCIÃƒÆ’Ã¢â‚¬Å“N:
 * Buscar todas las URLs que contengan el patrÃƒÆ’Ã‚Â³n y eliminarlas del cache.
 * Ejemplo: pattern="/api/ConsultaAsistencia" invalida:
 *   - /api/ConsultaAsistencia/profesor/asistencia-dia
 *   - /api/ConsultaAsistencia/director/asistencia-dia
 *   - /api/ConsultaAsistencia/director/reporte/todos-salones/mes
 *
 * @param {string} pattern - Texto a buscar en las URLs (case-sensitive)
 * @returns {Promise<number>} NÃƒÆ’Ã‚Âºmero de entradas eliminadas
 */
async function invalidateCacheByPattern(pattern) {
	try {
		const db = await openDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.getAllKeys();

		return new Promise((resolve) => {
			request.onsuccess = () => {
				const keys = request.result;
				let deletedCount = 0;

				keys.forEach(key => {
					if (key.includes(pattern)) {
						store.delete(key);
						deletedCount++;
					}
				});

				transaction.oncomplete = () => {
					db.close();
					console.log(`[SW] Cache invalidado: ${deletedCount} entradas con patrÃƒÆ’Ã‚Â³n "${pattern}"`);
					resolve(deletedCount);
				};
			};

			request.onerror = () => {
				db.close();
				console.error('[SW] Error obteniendo keys para invalidaciÃƒÆ’Ã‚Â³n:', request.error);
				resolve(0);
			};
		});
	} catch (error) {
		console.error('[SW] Error en invalidateCacheByPattern:', error);
		return 0;
	}
}

// Verificar si la URL debe ser cacheada
function shouldCache(url) {
	// Primero verificar si estÃƒÆ’Ã‚Â¡ en la lista de exclusiÃƒÆ’Ã‚Â³n
	if (NO_CACHE_PATTERNS.some(pattern => url.includes(pattern))) {
		console.log('[SW] URL excluida del cache:', url);
		return false;
	}
	return API_URL_PATTERNS.some(pattern => url.includes(pattern));
}

// Verificar si hay conexiÃƒÆ’Ã‚Â³n a internet
function isOnline() {
	return navigator.onLine;
}

// InstalaciÃƒÆ’Ã‚Â³n del Service Worker
self.addEventListener('install', event => {
	console.log('[SW] Service Worker instalado');
	self.skipWaiting();
});

// ActivaciÃƒÆ’Ã‚Â³n del Service Worker
self.addEventListener('activate', event => {
	console.log('[SW] Service Worker activado');
	event.waitUntil(
		Promise.all([
			clients.claim(),
			cleanExpiredCache(),
			listCachedUrls()
		])
	);
});

// Interceptar peticiones fetch
self.addEventListener('fetch', event => {
	const request = event.request;

	// Solo interceptar peticiones GET a la API
	if (request.method !== 'GET' || !shouldCache(request.url)) {
		return;
	}

	event.respondWith(handleFetch(request));
});

// Crear respuesta desde cache
function createCacheResponse(data, cacheStatus) {
	return new Response(JSON.stringify(data), {
		status: 200,
		statusText: 'OK',
		headers: {
			'Content-Type': 'application/json',
			'X-Cache-Status': cacheStatus,
		},
	});
}

// Comparar dos objetos/arrays para detectar cambios
function hasDataChanged(oldData, newData) {
	return JSON.stringify(oldData) !== JSON.stringify(newData);
}

// URLs ya servidas en esta sesiÃƒÆ’Ã‚Â³n del SW.
// Primera visita a una URL ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ SWR (cache inmediato + revalidar en background)
// Visitas posteriores ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ Network-first (red primero, cache como fallback)
const servedUrls = new Set();

// Timeout para network-first antes de caer a cache (ms)
const NETWORK_TIMEOUT = 5000;

// Estrategia hÃƒÆ’Ã‚Â­brida: SWR en carga inicial, Network-first en navegaciÃƒÆ’Ã‚Â³n posterior
async function handleFetch(request) {
	const url = request.url;
	const normalizedUrl = normalizeUrl(url);

	console.log('[SW] Interceptando:', url);

	const cachedData = await getFromCache(url);
	const alreadyServed = servedUrls.has(normalizedUrl);

	// Marcar como servida para futuras peticiones
	servedUrls.add(normalizedUrl);

	// --- PRIMERA VISITA: Stale-While-Revalidate ---
	// Devolver cache inmediato y revalidar en background
	if (cachedData && !alreadyServed) {
		console.log('[SW] SWR (primera visita) - devolviendo cache y revalidando');

		if (isOnline()) {
			revalidateInBackground(request, url, cachedData);
		}

		return createCacheResponse(cachedData, 'SWR');
	}

	// --- VISITAS POSTERIORES: Network-first ---
	// El usuario navega activamente, necesita data fresca
	if (alreadyServed && isOnline()) {
		console.log('[SW] Network-first (navegaciÃƒÆ’Ã‚Â³n activa)');

		try {
			const networkResponse = await fetchWithTimeout(request.clone(), NETWORK_TIMEOUT);

			if (networkResponse.ok) {
				const responseClone = networkResponse.clone();
				responseClone.json().then(data => {
					saveToCache(url, data);
				});
			}

			return networkResponse;
		} catch (error) {
			// Network fallÃƒÆ’Ã‚Â³ ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ fallback a cache
			console.log('[SW] Network fallÃƒÆ’Ã‚Â³, usando cache como fallback');
			if (cachedData) {
				return createCacheResponse(cachedData, 'FALLBACK');
			}
			return createOfflineResponse();
		}
	}

	// --- SIN CACHE, SIN SERVIR ANTES: ir a la red ---
	console.log('[SW] Cache MISS - obteniendo de red');

	try {
		const networkResponse = await fetch(request.clone());

		if (networkResponse.ok) {
			const responseClone = networkResponse.clone();
			responseClone.json().then(data => {
				saveToCache(url, data);
			});
		}

		return networkResponse;
	} catch (error) {
		// Offline sin cache
		console.log('[SW] Error de red y sin cache');
		return createOfflineResponse();
	}
}

// Fetch con timeout para network-first
function fetchWithTimeout(request, timeoutMs) {
	return new Promise((resolve, reject) => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => {
			controller.abort();
			reject(new Error('Network timeout'));
		}, timeoutMs);

		fetch(request, { signal: controller.signal })
			.then(response => {
				clearTimeout(timeoutId);
				resolve(response);
			})
			.catch(error => {
				clearTimeout(timeoutId);
				reject(error);
			});
	});
}

// Revalidar en background (SWR) y notificar si hay cambios
function revalidateInBackground(request, url, cachedData) {
	fetch(request.clone())
		.then(response => {
			if (response.ok) {
				response.json().then(async data => {
					if (hasDataChanged(cachedData, data)) {
						await saveToCache(url, data);
						console.log('[SW] Cache actualizado - notificando a la app');
						notifyClients({
							type: 'CACHE_UPDATED',
							payload: {
								url: normalizeUrl(url),
								originalUrl: url,
								data: data,
							},
						});
					}
				});
			}
		})
		.catch(() => {
			console.log('[SW] No se pudo revalidar en segundo plano');
		});
}

// Respuesta de error offline
function createOfflineResponse() {
	return new Response(JSON.stringify({ error: 'Sin conexiÃƒÆ’Ã‚Â³n y sin datos en cache' }), {
		status: 503,
		headers: { 'Content-Type': 'application/json' },
	});
}


// #endregion
// #region MENSAJES DESDE LA APLICACIÃƒÆ’Ã¢â‚¬Å“N - Comandos para control del cache
//
// PROPÃƒÆ’Ã¢â‚¬Å“SITO: Permitir que el frontend controle el cache de forma programÃƒÆ’Ã‚Â¡tica
//
// FLUJO:
// 1. Frontend detecta que el backend cambiÃƒÆ’Ã‚Â³ (ej: nueva versiÃƒÆ’Ã‚Â³n, error de deserializaciÃƒÆ’Ã‚Â³n)
// 2. Frontend llama a SwService.clearCache() / invalidateCacheByUrl() / invalidateCacheByPattern()
// 3. SwService envÃƒÆ’Ã‚Â­a mensaje al Service Worker
// 4. Service Worker ejecuta la invalidaciÃƒÆ’Ã‚Â³n correspondiente
// 5. Service Worker responde al frontend (vÃƒÆ’Ã‚Â­a MessageChannel)
//
self.addEventListener('message', event => {
	// CLEAR_CACHE: Limpiar TODO el cache
	// Uso: Logout, cambios breaking globales, reset completo
	// Llamado desde: SwService.clearCache()
	if (event.data && event.data.type === 'CLEAR_CACHE') {
		event.waitUntil(
			openDB().then(db => {
				const transaction = db.transaction(STORE_NAME, 'readwrite');
				const store = transaction.objectStore(STORE_NAME);
				store.clear();
				return new Promise(resolve => {
					transaction.oncomplete = () => {
						db.close();
						console.log('[SW] Cache limpiado completamente');
						servedUrls.clear(); // Reset estrategia SWR vs Network-first
						resolve();
					};
				});
			})
		);
	}

	// INVALIDATE_BY_URL: Invalidar endpoint especÃƒÆ’Ã‚Â­fico
	// Uso: Un solo endpoint cambiÃƒÆ’Ã‚Â³ su estructura
	// Llamado desde: SwService.invalidateCacheByUrl(url)
	if (event.data && event.data.type === 'INVALIDATE_BY_URL') {
		const url = event.data.payload?.url;
		if (url) {
			event.waitUntil(
				invalidateCacheByUrl(url).then(() => {
					// Forzar SWR en prÃƒÆ’Ã‚Â³xima visita (cache + revalidaciÃƒÆ’Ã‚Â³n en background)
					const normalized = normalizeUrl(url);
					servedUrls.delete(normalized);
					event.ports[0]?.postMessage({ success: true });
				})
			);
		}
	}

	// INVALIDATE_BY_PATTERN: Invalidar mÃƒÆ’Ã‚Â³dulo completo
	// Uso: MÃƒÆ’Ã‚Âºltiples endpoints de un mÃƒÆ’Ã‚Â³dulo cambiaron (ej: /api/ConsultaAsistencia/*)
	// Llamado desde: SwService.invalidateCacheByPattern(pattern)
	if (event.data && event.data.type === 'INVALIDATE_BY_PATTERN') {
		const pattern = event.data.payload?.pattern;
		if (pattern) {
			event.waitUntil(
				invalidateCacheByPattern(pattern).then(count => {
					// Forzar SWR para todas las URLs invalidadas
					for (const url of servedUrls) {
						if (url.includes(pattern)) {
							servedUrls.delete(url);
						}
					}
					event.ports[0]?.postMessage({ success: true, count });
				})
			);
		}
	}

	// SKIP_WAITING: Actualizar Service Worker inmediatamente
	// Uso: Nueva versiÃƒÆ’Ã‚Â³n del SW disponible
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}

	// LIST_CACHE: Debug - listar URLs en cache
	// Uso: Desarrollo, troubleshooting
	if (event.data && event.data.type === 'LIST_CACHE') {
		listCachedUrls();
	}
});


// #endregion
// #region PUSH NOTIFICATIONS
// Push es el wake-up call, no el mensaje completo.
// El SW recibe el push, muestra notificaciÃƒÆ’Ã‚Â³n nativa y avisa a la app.

// Recibir Push del servidor
self.addEventListener('push', event => {
	console.log('[SW] Push recibido');

	let data = {
		title: 'EducaWeb',
		body: 'Tienes una nueva notificaciÃƒÆ’Ã‚Â³n',
		icon: '/images/common/icono.png',
		url: '/',
		tag: 'educa-notification',
		priority: 'medium'
	};

	// Intentar parsear el payload del push
	if (event.data) {
		try {
			const payload = event.data.json();
			data = { ...data, ...payload };
		} catch (e) {
			// Si no es JSON, usar el texto como body
			data.body = event.data.text() || data.body;
		}
	}

	console.log('[SW] Push data:', data);

	// Opciones de la notificaciÃƒÆ’Ã‚Â³n nativa
	const options = {
		body: data.body,
		icon: data.icon || '/images/common/icono.png',
		badge: '/images/common/badge-72.png',
		tag: data.tag || 'educa-notification',
		data: {
			url: data.url || '/',
			id: data.id,
			priority: data.priority
		},
		requireInteraction: data.priority === 'urgent' || data.priority === 'high',
		vibrate: data.priority === 'urgent' ? [200, 100, 200] : [100, 50, 100],
		actions: data.actions || []
	};

	// Mostrar notificaciÃƒÆ’Ã‚Â³n nativa Y notificar a la app
	event.waitUntil(
		Promise.all([
			self.registration.showNotification(data.title, options),
			notifyClients({
				type: 'PUSH_RECEIVED',
				payload: data
			})
		])
	);
});

// Click en notificaciÃƒÆ’Ã‚Â³n nativa
self.addEventListener('notificationclick', event => {
	console.log('[SW] Notification click:', event.notification.tag);

	event.notification.close();

	const url = event.notification.data?.url || '/';
	const notificationId = event.notification.data?.id;

	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
			// Buscar si hay una ventana abierta
			for (const client of clientList) {
				if (client.url.includes(self.location.origin) && 'focus' in client) {
					// Notificar a la app que se hizo click
					client.postMessage({
						type: 'NOTIFICATION_CLICKED',
						payload: { id: notificationId, url }
					});
					return client.focus();
				}
			}
			// Si no hay ventana abierta, abrir una nueva
			if (clients.openWindow) {
				return clients.openWindow(url);
			}
		})
	);
});

// NotificaciÃƒÆ’Ã‚Â³n cerrada sin click
self.addEventListener('notificationclose', event => {
	console.log('[SW] Notification closed:', event.notification.tag);

	const notificationId = event.notification.data?.id;

	// Notificar a la app que se cerrÃƒÆ’Ã‚Â³
	notifyClients({
		type: 'NOTIFICATION_CLOSED',
		payload: { id: notificationId }
	});
});

// Helper para notificar a todos los clientes (ventanas de la app)
async function notifyClients(message) {
	const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
	for (const client of allClients) {
		client.postMessage(message);
	}
}
// #endregion
