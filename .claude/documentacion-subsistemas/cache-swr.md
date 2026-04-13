# Subsistema: Cache Stale-While-Revalidate (SWR)

> Principios transferibles entre tecnologías para construir un sistema de cache con respuesta inmediata, revalidación en background y control programático.

---

## Principio central

> **"Responder con cache de inmediato. Traer datos frescos en paralelo. Notificar cuando cambien."**

El usuario nunca debe esperar a la red. Si hay cache, se devuelve; si no, se va a la red. En ambos casos, la próxima vez que llegue data nueva, la UI se entera y se actualiza.

---

## 1. Estrategia única: SWR para todo lo cacheable

Múltiples estrategias de cache (cache-first, network-first, cache-only) agregan complejidad sin beneficio. Una sola estrategia bien implementada cubre el 95% de los casos.

### Reglas

- **Con cache**: devolver inmediato + revalidar en background
- **Sin cache (MISS)**: ir a la red, guardar el resultado, devolver
- **Offline sin cache**: devolver error claro (503 con mensaje explicativo)
- No intentar ser listo con lógicas de "esta URL es más importante"

### Por qué

Una sola estrategia es más fácil de razonar, debuggear y documentar. Los usuarios ven datos **inmediatamente** siempre que han visitado la página antes.

---

## 2. Notificación de actualizaciones

El usuario no debe refrescar la página manualmente para ver datos nuevos. Cuando la revalidación en background trae algo diferente, la UI se entera.

### Reglas

- Cuando el fetch en background completa con datos **diferentes** al cache, emitir un mensaje
- El mensaje incluye: URL, datos nuevos, URL original
- La app escucha el mensaje y actualiza el estado correspondiente
- Si los datos son iguales (mismo hash), no notificar (evita re-renders inútiles)

### Patrón común

```
UI muestra cache inmediato → SW revalida → SW detecta cambio → UI se actualiza suavemente
```

---

## 3. Normalización de keys de cache

Dos URLs que devuelven los mismos datos deben tener la misma key. Si no, el cache guarda duplicados.

### Reglas

- Eliminar parámetros de **cache-busting** antes de guardar (`_`, `t`, `timestamp`, `cb`, `v`, etc.) — blocklist explícita
- Conservar todos los demás params (pueden afectar la respuesta)
- Ordenar los params alfabéticamente para que `?a=1&b=2` y `?b=2&a=1` tengan la misma key
- Preservar el host y path completos

### Por qué

Angular/frameworks frecuentemente agregan `?_=timestamp` para evitar el cache del browser. Pero tu cache **sí** quiere ser cacheable — por eso los strips.

---

## 4. Versionado del storage

Cuando el shape de los datos cambia (breaking change en la API), el cache viejo es veneno: puede producir errores de deserialización.

### Reglas

- El storage local tiene una **versión** (`DB_VERSION`)
- Incrementar la versión **recrea** el storage completo (wipe + rebuild)
- Al hacer deploy con breaking changes, bumpear la versión
- Documentar **cuándo** incrementar (cambios breaking en DTOs, nuevos tipos, códigos cambiados)
- Documentar **cuándo no** (agregar campos opcionales, cambios internos del servidor que no afectan la respuesta)

### Por qué

Sin versionado, el usuario ve errores aleatorios después de un deploy porque su cache local tiene datos con shape viejo. Con versionado, un deploy breaking = cache limpio = datos frescos.

---

## 5. Invalidación programática

Además del versionado (que es global), la app necesita invalidar cache selectivamente.

### Tres niveles

| Nivel | Scope | Cuándo usar |
|-------|-------|-------------|
| **Total** | Todo el cache | Logout (limpiar datos del usuario anterior) |
| **Por URL exacta** | Un endpoint específico | Después de una mutación crítica |
| **Por patrón** | Varios endpoints relacionados | Breaking change en un módulo |

### Reglas

- Exponer una API clara desde el SW al client (mensajes con tipo)
- Documentar cuándo usar cada nivel
- Preferir versionado para cambios globales; invalidación programática para casos específicos

---

## 6. TTL — las entradas caducan

El cache no puede vivir para siempre. Entradas viejas ocupan espacio y pueden ser incorrectas.

### Reglas

- Cada entrada guarda su `timestamp` al guardarse
- Al leer, si `now - timestamp > TTL`, tratar como MISS
- TTL típico: 24 horas
- Entradas expiradas se limpian en la siguiente revalidación exitosa
- Job periódico opcional para compactación

### Por qué

Sin TTL, datos obsoletos persisten indefinidamente. Con TTL 24h, aunque el usuario no vuelva a visitar la página en varios días, al abrir recibe datos frescos.

---

## 7. Excepciones: qué NO cachear

No todo beneficia del cache. Algunos endpoints **deben** ir a la red siempre.

### Reglas

- **Datos específicos del usuario/sesión**: `/api/auth/profile`, `/api/auth/login`, `/api/permisos` — pueden cambiar con el usuario actual
- **Mutaciones**: POST/PUT/DELETE nunca se cachean (solo GET)
- **Endpoints de tiempo real**: chat, notificaciones activas, presence — el cache los haría obsoletos
- **Endpoints sensibles**: tokens, refresh, verify

### Regla técnica

Lista explícita de patrones `NO_CACHE_PATTERNS`. Si el URL matchea, saltar el cache y siempre ir a la red.

---

## 8. Offline con gracia

Cuando no hay red y no hay cache, no devolver un error crudo del browser — devolver una respuesta estructurada.

### Reglas

- Si el fetch falla y no hay cache: devolver 503 con body JSON (`{ error: "Sin conexión y sin datos en cache" }`)
- La app detecta el 503 y muestra un empty state "Sin conexión"
- El usuario sabe que el problema es la red, no un bug
- Al reconectar, el próximo fetch popula el cache

### Por qué

Un 503 estructurado es manejable en la UI. Un `TypeError: Failed to fetch` es un error aleatorio.

---

## 9. Detección y notificación de fallos de revalidación

Cuando la revalidación en background falla (offline, servidor caído, DNS fail), la app debe enterarse — al menos para trackear el problema.

### Reglas

- El fetch en background tiene un `.catch()` explícito
- En el catch, notificar al client con `REVALIDATION_FAILED` (tipo de mensaje distinto)
- El client puede usarlo para:
  - Mostrar un indicador sutil de "trabajando offline"
  - Reportar al sistema de trazabilidad de errores (origen NETWORK)
  - Ajustar comportamiento (ej: reducir frecuencia de polls)

### Por qué

Sin este hook, los fallos de red son invisibles: el usuario ve cache viejo sin saber que la red está caída.

---

## 10. Cache vs storage estructurado

Hay dos storages distintos con propósitos diferentes:

| Storage | Propósito | Ejemplo |
|---------|-----------|---------|
| **Cache API** | Assets estáticos del app shell | HTML, JS, CSS, imágenes |
| **IndexedDB** | Data de API dinámica con TTL y queries | Respuestas JSON de endpoints |

### Reglas

- **No mezclar**: el app shell va en Cache API (requisito PWA); la data en IndexedDB
- El app shell se cachea en el evento `install` del SW
- IndexedDB se popula on-demand (cuando el fetch es exitoso)

---

## 11. Invariantes del sistema

| ID | Invariante |
|----|-----------|
| `INV-CACHE01` | Si hay cache, se devuelve inmediato (<10ms) |
| `INV-CACHE02` | La revalidación en background nunca bloquea la respuesta |
| `INV-CACHE03` | Las keys normalizadas evitan duplicados por cache-busting |
| `INV-CACHE04` | Incrementar DB_VERSION limpia el cache en el próximo load |
| `INV-CACHE05` | Endpoints sensibles nunca se cachean (NO_CACHE_PATTERNS) |
| `INV-CACHE06` | TTL garantiza que entradas viejas no persisten indefinidamente |
| `INV-CACHE07` | Fallos de revalidación se notifican (REVALIDATION_FAILED) |
| `INV-CACHE08` | Offline sin cache retorna 503 estructurado, no TypeError |

---

## Anti-patrones

| Anti-patrón | Por qué es malo | Solución |
|-------------|-----------------|----------|
| Cachear endpoints de auth | Datos del usuario anterior aparecen al nuevo usuario | `NO_CACHE_PATTERNS` explícitos |
| Cache keys con timestamps | Cada request es un MISS | Normalizar stripping `PARAMS_TO_STRIP` |
| Múltiples estrategias (cache-first, network-first...) | Complejo de razonar y debuggear | Una sola estrategia SWR |
| Sin notificación de actualizaciones | UI muestra cache viejo indefinidamente | `CACHE_UPDATED` message |
| Sin TTL | Datos obsoletos para siempre | TTL de 24h típico |
| Sin versionado | Breaking changes rompen la app de usuarios con cache viejo | `DB_VERSION` bumpeable |
| Swallow de errores de revalidación | Fallos de red invisibles | `REVALIDATION_FAILED` message |
| Mezclar app shell y API data en el mismo storage | Invalidación torpe, lógica confusa | Cache API para shell, IndexedDB para data |

---

## Checklist de implementación

```
ESTRATEGIA SWR
[ ] Cache HIT: devolver inmediato + revalidar background
[ ] Cache MISS: ir a red + guardar
[ ] Offline sin cache: 503 estructurado

NORMALIZACIÓN
[ ] Blocklist de params cache-busting
[ ] Sort alfabético de params
[ ] Key determinística

VERSIONADO
[ ] DB_VERSION constante
[ ] onupgradeneeded recrea store
[ ] Documentación de cuándo incrementar

INVALIDACIÓN
[ ] API de invalidación total
[ ] API de invalidación por URL
[ ] API de invalidación por patrón
[ ] Llamada a clearCache() en logout

TTL
[ ] Timestamp en cada entrada
[ ] Check de expiración al leer
[ ] Limpieza lazy o periódica

EXCEPCIONES
[ ] NO_CACHE_PATTERNS lista explícita
[ ] Mutaciones (POST/PUT/DELETE) no cacheables
[ ] Endpoints de auth excluidos

NOTIFICACIONES
[ ] CACHE_UPDATED al detectar diff
[ ] REVALIDATION_FAILED al fallar fetch
[ ] Listener en el client para ambos

SEPARACIÓN DE STORAGES
[ ] App shell en Cache API
[ ] Data de API en IndexedDB
[ ] Install event cachea el shell
```

---

## Métricas de éxito

1. **<10ms de respuesta** para requests con cache HIT
2. **Cero datos obsoletos** visibles al usuario después de TTL/invalidación
3. **Cero duplicados** en el storage por cache-busting no normalizado
4. **Cero crashes** por breaking changes (versionado bumpeado a tiempo)
5. **Revalidación transparente**: el usuario nunca ve una "actualización" explícita, solo datos frescos al hacer cualquier acción
6. **Offline sin errores crudos**: siempre un estado vacío o 503 estructurado
