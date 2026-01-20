const DB_NAME = 'educa-cache-db';
const DB_VERSION = 1;
const STORE_NAME = 'api-cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

// URLs de API que queremos cachear (solo GET)
const API_URL_PATTERNS = ['/api/'];

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

// Normalizar URL para usar como clave (sin query params de cache-busting)
function normalizeUrl(url) {
	try {
		const urlObj = new URL(url);
		// Remover parámetros que cambian frecuentemente pero mantener los importantes
		const paramsToKeep = ['mes', 'anio', 'month', 'year', 'id', 'page', 'limit'];
		const newParams = new URLSearchParams();

		for (const [key, value] of urlObj.searchParams) {
			if (paramsToKeep.includes(key.toLowerCase())) {
				newParams.set(key, value);
			}
		}

		urlObj.search = newParams.toString();
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
						console.log('[SW] Cache válido, devolviendo datos');
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

// Verificar si la URL debe ser cacheada
function shouldCache(url) {
	return API_URL_PATTERNS.some(pattern => url.includes(pattern));
}

// Verificar si hay conexión a internet
function isOnline() {
	return navigator.onLine;
}

// Instalación del Service Worker
self.addEventListener('install', event => {
	console.log('[SW] Service Worker instalado');
	self.skipWaiting();
});

// Activación del Service Worker
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

// Estrategia Cache First: devolver cache inmediatamente, actualizar en segundo plano
async function handleFetch(request) {
	const url = request.url;
	console.log('[SW] Interceptando:', url);

	// Buscar en cache primero
	const cachedData = await getFromCache(url);

	if (cachedData) {
		console.log('[SW] Cache HIT - devolviendo datos inmediatamente');

		// Actualizar cache en segundo plano si hay conexión
		if (isOnline()) {
			fetch(request.clone())
				.then(response => {
					if (response.ok) {
						response.json().then(data => {
							saveToCache(url, data);
							console.log('[SW] Cache actualizado en segundo plano');
						});
					}
				})
				.catch(() => {
					console.log('[SW] No se pudo actualizar en segundo plano');
				});
		}

		return createCacheResponse(cachedData, 'HIT');
	}

	// Si no hay cache, ir a la red
	console.log('[SW] Cache MISS - obteniendo de red');

	try {
		const networkResponse = await fetch(request.clone());

		if (networkResponse.ok) {
			const responseClone = networkResponse.clone();
			responseClone.json().then(data => {
				saveToCache(url, data);
				console.log('[SW] Datos guardados en cache');
			});
		}

		return networkResponse;
	} catch (error) {
		console.log('[SW] Error de red y sin cache');
		return new Response(JSON.stringify({ error: 'Sin conexión y sin datos en cache' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

// Escuchar mensajes desde la aplicación
self.addEventListener('message', event => {
	if (event.data && event.data.type === 'CLEAR_CACHE') {
		event.waitUntil(
			openDB().then(db => {
				const transaction = db.transaction(STORE_NAME, 'readwrite');
				const store = transaction.objectStore(STORE_NAME);
				store.clear();
				return new Promise(resolve => {
					transaction.oncomplete = () => {
						db.close();
						console.log('[SW] Cache limpiado');
						resolve();
					};
				});
			})
		);
	}

	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}

	if (event.data && event.data.type === 'LIST_CACHE') {
		listCachedUrls();
	}
});
