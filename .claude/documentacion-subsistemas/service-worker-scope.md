# Subsistema: Scope del Service Worker

> Principios transferibles sobre cómo el scope de un Service Worker define qué intercepta, a quién controla y cómo se actualiza.

---

## Principio central

> **"El scope define el contrato: qué requests intercepta el SW, a qué clients envía mensajes, y dónde vive su ciclo de vida."**

Un Service Worker mal configurado no falla con errores claros — falla silenciosamente. Los requests pasan sin interceptarse, los mensajes no llegan a nadie, y las actualizaciones nunca se activan. Entender el scope es entender por qué.

---

## 1. El scope es un prefijo de ruta

Un SW registrado con scope `/intranet/` **solo** intercepta:

- Navegaciones a rutas que empiezan con `/intranet/`
- Requests (fetch, XHR) hechos desde páginas dentro de `/intranet/*`
- Requests hacia URLs que empiezan con `/intranet/` (dependiendo del contexto)

### Regla

El scope es un **string prefix match**, no un glob. `/intranet/` matchea `/intranet/admin/page`, `/intranet/profile`, pero NO `/api/data` (el fetch hacia un URL fuera del scope sí es interceptado si viene de una página controlada).

### Restricción del browser

Por defecto, el scope de un SW no puede ser más amplio que la ubicación del archivo:
- `sw.js` en `/intranet/sw.js` → scope max `/intranet/`
- `sw.js` en `/sw.js` → scope max `/` (todo el origin)

Para servir `sw.js` desde `/sw.js` con scope `/intranet/`, el servidor debe enviar el header `Service-Worker-Allowed: /`.

---

## 2. Un SW por scope, un scope por SW

No se pueden tener dos SW activos en el mismo scope. Si registras un nuevo SW con el mismo scope, **reemplaza** al anterior.

### Reglas

- Si tu app tiene un área pública y una intranet, puedes tener **un solo SW** para la intranet
- El área pública queda sin SW (sin cache, sin offline) a menos que registres otro
- Los SW no se superponen: `/intranet/` y `/intranet/admin/` no pueden tener SWs distintos sin coordinación

### Por qué

Es una restricción del browser para evitar conflictos. Un solo SW gestiona todo lo que cae bajo su scope.

---

## 3. Registro condicional por ruta

No siempre quieres registrar el SW. Por ejemplo, si el usuario está en una página pública, registrar un SW con scope de intranet no tiene sentido.

### Regla

```
Si location.pathname no está dentro del scope → no registrar
```

### Por qué

Registrar un SW en una página fuera de su scope crea un registro "huérfano" que nunca controla nada. Gasta recursos del browser y confunde al debugging.

---

## 4. Ciclo de vida: installing → waiting → active

Un SW pasa por estados:

| Estado | Qué significa |
|--------|---------------|
| `installing` | Recién descargado, ejecutando el evento `install` |
| `waiting` | Instalado pero hay otro SW activo — espera a que todos los clients se cierren |
| `active` | Está interceptando requests y controlando clients |

### Regla crítica

Un SW nuevo **no** reemplaza al viejo automáticamente si hay pestañas abiertas del sitio. Queda en `waiting` hasta que todas las pestañas se cierren. **Este es el problema más común** al debuggear SWs: el nuevo código está desplegado pero el SW viejo sigue activo.

---

## 5. `skipWaiting()` — actualización agresiva

Para evitar que el SW nuevo se quede en `waiting`, puede llamar `self.skipWaiting()` en el evento `install`.

### Reglas

- `skipWaiting()` fuerza al SW nuevo a activarse inmediatamente aunque haya clients del viejo
- Los clients siguen controlados por el SW **viejo** hasta que recarguen
- Para tomar control de los clients existentes, llamar `self.clients.claim()` en el evento `activate`
- **Cuidado**: cambiar de SW a mitad de una sesión puede causar inconsistencias si las versiones manejan cache distinto

### Cuándo usar

- Apps con un solo scope unificado (intranet)
- Cuando los cambios en el SW son **aditivos** (no breaking)
- Cuando aceptas que el usuario puede ver un momento transitorio al recargar

### Cuándo NO usar

- Apps con múltiples tabs abiertas por largos períodos donde mezclar versiones romperá cosas
- Breaking changes en el formato del cache (mejor bumpear `DB_VERSION`)

---

## 6. `clients.matchAll()` — a quién envías mensajes

Cuando el SW quiere notificar a la app (por ejemplo, `CACHE_UPDATED`), usa `clients.matchAll()`.

### Reglas

- `clients.matchAll({ type: 'window' })` → solo pestañas dentro del scope
- `includeUncontrolled: true` → también incluye pestañas que se acaban de abrir y aún no están controladas
- Las pestañas **fuera del scope** nunca reciben mensajes aunque el origin sea el mismo
- Cada mensaje se envía individualmente a cada client con `client.postMessage(msg)`

### Por qué importa el scope

Si tu vista admin está en `/intranet/admin/trazabilidad-errores` (dentro del scope), recibe mensajes. Si estuviera en `/admin/...` (fuera), el SW no sabría de su existencia.

---

## 7. Actualización del SW — cuándo detecta cambios

El browser chequea si hay un SW nuevo:

- Al navegar a cualquier página dentro del scope (cada ~24 horas)
- Al llamar `registration.update()` explícitamente
- Al detectar un cambio byte-a-byte en el archivo `sw.js`

### Reglas

- El browser compara el archivo `sw.js` descargado con el registrado
- Si hay diferencia de **un solo byte**, inicia la instalación del nuevo
- El servidor debe servir `sw.js` con headers `Cache-Control: no-cache` para que el browser verifique siempre
- En CDN, asegurarse de que el archivo se actualiza al deploy (invalidación forzada)

### Cache header crítico

```
Cache-Control: no-cache, no-store, must-revalidate
```

Sin esto, el browser puede servir el `sw.js` viejo desde su propio HTTP cache y nunca detectar la actualización.

---

## 8. Forzar actualización desde la app

Para casos donde quieres garantizar que el SW se actualice (por ejemplo, después de un deploy crítico), la app puede hacerlo explícitamente.

### Patrón

```
1. Obtener registration: navigator.serviceWorker.getRegistrations()
2. Llamar registration.update() — descarga el archivo nuevo si cambió
3. Si registration.waiting existe, enviarle un mensaje { type: 'SKIP_WAITING' }
4. El SW escucha ese mensaje y llama self.skipWaiting()
5. Recargar la página para que el nuevo SW tome control
```

### Regla

La app debe **ofrecer** actualizar, no forzar. Mostrar un banner "Nueva versión disponible — Recargar".

---

## 9. Guard: no interceptar requests del propio SW

Cuando el SW intercepta fetches, debe asegurarse de no interceptar sus propios requests internos (por ejemplo, cuando revalida en background).

### Reglas

- No cachear requests hacia el endpoint de error reporting (recursión infinita)
- No interceptar requests hacia servicios de autenticación (datos dinámicos)
- Lista de exclusiones explícita, no basada en heurística

---

## 10. Debugging de scope

El scope es invisible hasta que algo falla. Debugging común:

### Problema: "Los mensajes del SW no llegan"

**Causa probable**: la página está fuera del scope. `clients.matchAll()` no la ve.

**Verificación**:
```js
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs.map(r => r.scope)));
```
Si el scope es `/intranet/` pero estás en `/admin/`, el SW no te controla.

### Problema: "El SW nuevo no se activa"

**Causa probable**: hay clients del SW viejo abiertos; el nuevo está en `waiting`.

**Verificación**:
```js
const reg = await navigator.serviceWorker.getRegistration();
console.log({ active: reg.active?.state, waiting: reg.waiting?.state, installing: reg.installing?.state });
```
Si `waiting` tiene algo, cerrar todas las pestañas del sitio y reabrir, o usar `skipWaiting`.

### Problema: "El SW viejo sigue corriendo después de deploy"

**Causa probable**: el browser sirvió `sw.js` desde su HTTP cache.

**Verificación**: cargar `sw.js` directamente y comparar con el repo. Si difieren, el CDN o los headers están fallando.

---

## 11. Invariantes del sistema

| ID | Invariante |
|----|-----------|
| `INV-SW01` | El SW solo se registra si la ruta actual está dentro del scope |
| `INV-SW02` | `sw.js` se sirve con `Cache-Control: no-cache` — nunca desde HTTP cache |
| `INV-SW03` | Un solo SW activo por scope (no hay coexistencia) |
| `INV-SW04` | Los mensajes `clients.matchAll()` solo llegan a páginas dentro del scope |
| `INV-SW05` | `skipWaiting()` en install + `clients.claim()` en activate = actualización agresiva |
| `INV-SW06` | Los requests del propio SW nunca son interceptados (anti-recursión) |
| `INV-SW07` | La app puede forzar actualización vía `registration.update()` + `SKIP_WAITING` |

---

## Anti-patrones

| Anti-patrón | Por qué es malo | Solución |
|-------------|-----------------|----------|
| Registrar el SW siempre, sin check de ruta | SW huérfano que no controla nada | Registro condicional por path |
| Esperar a que el usuario cierre todas las pestañas para actualizar | Deploy tarda días en propagar | `skipWaiting()` + banner "recargar" |
| `sw.js` con cache headers normales | Browser sirve versión vieja del SW | `Cache-Control: no-cache` explícito |
| Asumir que `clients.matchAll()` ve todo | Mensajes perdidos en páginas fuera del scope | Diseñar la UI dentro del scope o no usar SW |
| Interceptar fetches del propio SW | Recursión infinita | Lista de URLs excluidas |
| Scope demasiado amplio (`/`) sin necesidad | Intercepta requests públicos sin razón | Scope mínimo necesario |
| Múltiples SW con scopes anidados | No soportado, conflictos | Un solo SW por origin |

---

## Checklist de implementación

```
REGISTRO
[ ] Path check antes de registrar (solo en rutas dentro del scope)
[ ] Scope explícito en register() options
[ ] Header Service-Worker-Allowed si el scope es más amplio que el path de sw.js

CICLO DE VIDA
[ ] self.skipWaiting() en evento install
[ ] self.clients.claim() en evento activate (opcional)
[ ] Pre-cache del app shell en install

ACTUALIZACIÓN
[ ] Cache-Control: no-cache en sw.js
[ ] registration.update() exposición al client
[ ] Listener de SKIP_WAITING en el SW
[ ] Banner "nueva versión" al detectar waiting

MENSAJERÍA
[ ] clients.matchAll({ type: 'window', includeUncontrolled: true })
[ ] Tipos de mensaje documentados (CACHE_UPDATED, REVALIDATION_FAILED, SKIP_WAITING)
[ ] Listener en el client con tipo-switch

ANTI-RECURSIÓN
[ ] Lista de URLs que el SW NO debe interceptar
[ ] Guard explícito antes de llamar fetch desde el SW

DEBUGGING
[ ] Documentar cómo verificar scope, estado, version del SW
[ ] Comandos útiles para consola del browser
```

---

## Métricas de éxito

1. **Deploy detectado en <1 minuto**: el SW nuevo se instala al siguiente navigate
2. **Activación predecible**: `skipWaiting` o prompt al usuario, nunca "esperar a ver qué pasa"
3. **Cero registros huérfanos**: SW solo activo dentro del scope donde tiene sentido
4. **Mensajes llegan 100% a páginas scope**: sin silent drops
5. **Debugging directo**: en cualquier pestaña, puedes saber qué SW está activo y en qué estado
