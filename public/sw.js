const DB_NAME = 'educa-cache-db';

// Cache del app shell (Cache API, separado del IndexedDB de API)
// Necesario para que el SW "controle" la start_url (requisito PWA Lighthouse)
const APP_SHELL_CACHE = 'app-shell-v1';
const APP_SHELL_URL = '/loader.html';

// #region VERSIONADO DE CACHE - Prevencion de errores por cambios backend
//
// PROPOSITO: Invalidar automaticamente el cache cuando hay cambios breaking
//
// PROBLEMA QUE RESUELVE:
// Cuando el backend cambia la estructura de DTOs (agregar/quitar campos, cambiar tipos),
// el cache guarda datos con estructura antigua. La app intenta deserializar datos
// incompatibles -> error en el frontend la primera vez -> segunda vez funciona porque
// el cache ya se actualizo. Esto genera errores intermitentes en produccion.
//
// SOLUCION:
// Incrementar DB_VERSION fuerza la recreacion de IndexedDB al hacer deploy.
// Esto limpia automaticamente TODO el cache de todos los usuarios.
//
// CUANDO INCREMENTAR:
// * Cambiar estructura de DTOs (agregar/quitar/renombrar campos)
// * Cambiar tipos de datos (string -> number, null -> object)
// * Cambiar codigos de estado (A/T/F -> nuevos codigos)
// x Agregar campos opcionales al final (no es breaking)
// x Cambios solo de backend que no afectan JSON de respuesta
//
//? no se baja nunca la db_version
const DB_VERSION = 2; // Incrementado por cambios en estructura de asistencia
const STORE_NAME = 'api-cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

// URLs de API que queremos cachear (solo GET)
const API_URL_PATTERNS = ['/api/'];

// URLs que NUNCA deben cachearse (datos especificos por usuario/sesion)
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

		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
				store.createIndex('timestamp', 'timestamp', { unique: false });
			}
		};
	});
}

// Parametros de cache-busting que se eliminan al normalizar la URL
// Todos los demas parametros se conservan como parte de la cache key
const PARAMS_TO_STRIP = ['_', 't', 'timestamp', 'cacheBust', 'nocache', 'cb', 'v'];

// Normalizar URL para usar como clave (elimina solo params de cache-busting)
function normalizeUrl(url) {
	try {
		const urlObj = new URL(url);
		for (const param of PARAMS_TO_STRIP) {
			urlObj.searchParams.delete(param);
		}
		// Ordenar params para cache key deterministica
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
					console.log(
						'[SW] Encontrado en cache, timestamp:',
						new Date(result.timestamp).toISOString(),
					);
					// Verificar si el cache ha expirado
					const isExpired = Date.now() - result.timestamp > CACHE_EXPIRY;
					if (!isExpired) {
						console.log('[SW] Cache valido, devolviendo datos');
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

		request.onsuccess = (event) => {
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
// #region INVALIDACION QUIRURGICA - Limpieza selectiva sin afectar todo el cache

/**
 * PROPOSITO: Invalidar un endpoint especifico sin tocar el resto del cache
 *
 * PROBLEMA QUE RESUELVE:
 * clearCache() es muy agresivo - borra TODO, incluso datos de modulos que no cambiaron.
 * Esto causa refetch innecesario de datos estables, desperdiciando ancho de banda.
 *
 * SOLUCION:
 * Eliminar solo la entrada especifica del cache. El resto permanece intacto.
 * La proxima peticion a esta URL ira al servidor y obtendra la nueva estructura.
 *
 * @param {string} url - URL exacta a invalidar (se normalizara automaticamente)
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
 * PROPOSITO: Invalidar todos los endpoints de un modulo cuando cambia su estructura
 *
 * PROBLEMA QUE RESUELVE:
 * Los cambios backend suelen afectar multiples endpoints relacionados de un modulo.
 * Invalidar uno por uno es tedioso y propenso a olvidar alguno.
 *
 * SOLUCION:
 * Buscar todas las URLs que contengan el patron y eliminarlas del cache.
 * Ejemplo: pattern="/api/ConsultaAsistencia" invalida:
 *   - /api/ConsultaAsistencia/profesor/asistencia-dia
 *   - /api/ConsultaAsistencia/director/asistencia-dia
 *   - /api/ConsultaAsistencia/director/reporte/todos-salones/mes
 *
 * @param {string} pattern - Texto a buscar en las URLs (case-sensitive)
 * @returns {Promise<number>} Numero de entradas eliminadas
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

				keys.forEach((key) => {
					if (key.includes(pattern)) {
						store.delete(key);
						deletedCount++;
					}
				});

				transaction.oncomplete = () => {
					db.close();
					console.log(
						`[SW] Cache invalidado: ${deletedCount} entradas con patron "${pattern}"`,
					);
					resolve(deletedCount);
				};
			};

			request.onerror = () => {
				db.close();
				console.error('[SW] Error obteniendo keys para invalidacion:', request.error);
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
	// Primero verificar si esta en la lista de exclusion
	if (NO_CACHE_PATTERNS.some((pattern) => url.includes(pattern))) {
		console.log('[SW] URL excluida del cache:', url);
		return false;
	}
	return API_URL_PATTERNS.some((pattern) => url.includes(pattern));
}

// Verificar si hay conexion a internet
function isOnline() {
	return navigator.onLine;
}

// Instalacion del Service Worker
self.addEventListener('install', (event) => {
	console.log('[SW] Service Worker instalado');
	// Pre-cachear el app shell para controlar la start_url (/intranet/login → loader.html)
	event.waitUntil(
		caches.open(APP_SHELL_CACHE).then((cache) => cache.add(APP_SHELL_URL)),
	);
	self.skipWaiting();
});

// Activacion del Service Worker
self.addEventListener('activate', (event) => {
	console.log('[SW] Service Worker activado');
	event.waitUntil(Promise.all([clients.claim(), cleanExpiredCache(), listCachedUrls()]));
});

// Interceptar peticiones fetch
self.addEventListener('fetch', (event) => {
	const request = event.request;

	// Navegaciones (HTML) → servir app shell cacheado
	// Necesario para que el SW "controle" la start_url (requisito PWA Lighthouse)
	if (request.mode === 'navigate') {
		event.respondWith(
			caches.match(APP_SHELL_URL).then((cached) => cached || fetch(request)),
		);
		return;
	}

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

// Estrategia unica: Stale-While-Revalidate para todos los requests cacheables.
// Si hay cache -> devolver inmediatamente + revalidar en background.
// Si no hay cache -> ir a la red y guardar resultado.
// La app recibe datos frescos via CACHE_UPDATED cuando el background fetch termina.
async function handleFetch(request) {
	const url = request.url;

	console.log('[SW] Interceptando:', url);

	// --- OFFLINE: devolver cache directamente ---
	if (!isOnline()) {
		console.log('[SW] Offline - buscando cache');
		const cachedData = await getFromCache(url);
		if (cachedData) {
			return createCacheResponse(cachedData, 'OFFLINE');
		}
		return createOfflineResponse();
	}

	const cachedData = await getFromCache(url);

	// --- CACHE HIT: SWR ---
	// Devolver cache inmediatamente y revalidar en background.
	// Cuando llegan datos nuevos, CACHE_UPDATED notifica a la app.
	if (cachedData) {
		console.log('[SW] SWR - devolviendo cache y revalidando en background');
		revalidateInBackground(request, url, cachedData);
		return createCacheResponse(cachedData, 'SWR');
	}

	// --- CACHE MISS: ir a la red ---
	console.log('[SW] Cache MISS - obteniendo de red');

	try {
		const networkResponse = await fetch(request.clone());

		if (networkResponse.ok) {
			networkResponse
				.clone()
				.json()
				.then((data) => {
					saveToCache(url, data);
				});
		}

		return networkResponse;
	} catch (error) {
		console.log('[SW] Error de red y sin cache');
		return createOfflineResponse();
	}
}

// Revalidar en background (SWR) y notificar si hay cambios
function revalidateInBackground(request, url, cachedData) {
	fetch(request.clone())
		.then((response) => {
			if (response.ok) {
				response.json().then(async (data) => {
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
	return new Response(JSON.stringify({ error: 'Sin conexion y sin datos en cache' }), {
		status: 503,
		headers: { 'Content-Type': 'application/json' },
	});
}

// #endregion
// #region MENSAJES DESDE LA APLICACION - Comandos para control del cache
//
// PROPOSITO: Permitir que el frontend controle el cache de forma programatica
//
// FLUJO:
// 1. Frontend detecta que el backend cambio (ej: nueva version, error de deserializacion)
// 2. Frontend llama a SwService.clearCache() / invalidateCacheByUrl() / invalidateCacheByPattern()
// 3. SwService envia mensaje al Service Worker
// 4. Service Worker ejecuta la invalidacion correspondiente
// 5. Service Worker responde al frontend (via MessageChannel)
//
self.addEventListener('message', (event) => {
	// CLEAR_CACHE: Limpiar TODO el cache
	// Uso: Logout, cambios breaking globales, reset completo
	// Llamado desde: SwService.clearCache()
	if (event.data && event.data.type === 'CLEAR_CACHE') {
		event.waitUntil(
			openDB().then((db) => {
				const transaction = db.transaction(STORE_NAME, 'readwrite');
				const store = transaction.objectStore(STORE_NAME);
				store.clear();
				return new Promise((resolve) => {
					transaction.oncomplete = () => {
						db.close();
						console.log('[SW] Cache limpiado completamente');
						resolve();
					};
				});
			}),
		);
	}

	// INVALIDATE_BY_URL: Invalidar endpoint especifico
	// Uso: Un solo endpoint cambio su estructura
	// Llamado desde: SwService.invalidateCacheByUrl(url)
	if (event.data && event.data.type === 'INVALIDATE_BY_URL') {
		const url = event.data.payload?.url;
		if (url) {
			event.waitUntil(
				invalidateCacheByUrl(url).then(() => {
					event.ports[0]?.postMessage({ success: true });
				}),
			);
		}
	}

	// INVALIDATE_BY_PATTERN: Invalidar modulo completo
	// Uso: Multiples endpoints de un modulo cambiaron (ej: /api/ConsultaAsistencia/*)
	// Llamado desde: SwService.invalidateCacheByPattern(pattern)
	if (event.data && event.data.type === 'INVALIDATE_BY_PATTERN') {
		const pattern = event.data.payload?.pattern;
		if (pattern) {
			event.waitUntil(
				invalidateCacheByPattern(pattern).then((count) => {
					event.ports[0]?.postMessage({ success: true, count });
				}),
			);
		}
	}

	// SKIP_WAITING: Actualizar Service Worker inmediatamente
	// Uso: Nueva version del SW disponible
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
// El SW recibe el push, muestra notificacion nativa y avisa a la app.

// Recibir Push del servidor
self.addEventListener('push', (event) => {
	console.log('[SW] Push recibido');

	let data = {
		title: 'EducaWeb',
		body: 'Tienes una nueva notificacion',
		icon: '/images/common/icono.png',
		url: '/',
		tag: 'educa-notification',
		priority: 'medium',
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

	// Opciones de la notificacion nativa
	const options = {
		body: data.body,
		icon: data.icon || '/images/common/icono.png',
		badge: '/images/common/badge-72.png',
		tag: data.tag || 'educa-notification',
		data: {
			url: data.url || '/',
			id: data.id,
			priority: data.priority,
		},
		requireInteraction: data.priority === 'urgent' || data.priority === 'high',
		vibrate: data.priority === 'urgent' ? [200, 100, 200] : [100, 50, 100],
		actions: data.actions || [],
	};

	// Mostrar notificacion nativa Y notificar a la app
	event.waitUntil(
		Promise.all([
			self.registration.showNotification(data.title, options),
			notifyClients({
				type: 'PUSH_RECEIVED',
				payload: data,
			}),
		]),
	);
});

// Click en notificacion nativa
self.addEventListener('notificationclick', (event) => {
	console.log('[SW] Notification click:', event.notification.tag);

	event.notification.close();

	const url = event.notification.data?.url || '/';
	const notificationId = event.notification.data?.id;

	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			// Buscar si hay una ventana abierta
			for (const client of clientList) {
				if (client.url.includes(self.location.origin) && 'focus' in client) {
					// Notificar a la app que se hizo click
					client.postMessage({
						type: 'NOTIFICATION_CLICKED',
						payload: { id: notificationId, url },
					});
					return client.focus();
				}
			}
			// Si no hay ventana abierta, abrir una nueva
			if (clients.openWindow) {
				return clients.openWindow(url);
			}
		}),
	);
});

// Notificacion cerrada sin click
self.addEventListener('notificationclose', (event) => {
	console.log('[SW] Notification closed:', event.notification.tag);

	const notificationId = event.notification.data?.id;

	// Notificar a la app que se cerro
	notifyClients({
		type: 'NOTIFICATION_CLOSED',
		payload: { id: notificationId },
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
