# Subsistema: Autenticación, Sesión y Permisos

> Principios transferibles entre tecnologías para construir un sistema de identidad que combine login/logout seguros, sesiones de larga duración con refresh transparente, coordinación entre pestañas y dispositivos, y autorización granular por rol + usuario.

---

## Principio central

> **"La identidad se prueba una vez, la sesión se mantiene sin fricción, y los permisos se verifican en cada ruta sin confiar en la UI."**

Tres preguntas distintas, tres capas distintas:

| Pregunta | Capa | Responsable |
|----------|------|-------------|
| ¿Quién eres? | **Autenticación** | Login → emite credenciales persistentes (token + refresh) |
| ¿Sigues siendo tú? | **Sesión** | Refresh + actividad + coordinación multi-pestaña |
| ¿Puedes hacer esto? | **Autorización** | Permisos por rol + overrides por usuario, verificación exacta |

Mezclar estas capas produce bugs sutiles: tokens robados por XSS, sesiones que no expiran, permisos que se acumulan en vez de reemplazarse, pestañas con estados contradictorios.

---

## 1. El token vive donde el JavaScript no lo ve

El activo más sensible del sistema es el token de acceso. Si un atacante inyecta JS en la página (XSS, extensión maliciosa, dependencia comprometida) y el token es legible, la cuenta está perdida.

### Reglas

- El token de acceso y el refresh token se almacenan en **cookies HttpOnly**, no en localStorage ni sessionStorage
- El frontend **nunca** lee el token; solo lo envía implícitamente en cada request
- Metadatos no sensibles (nombre, rol, id de entidad) pueden vivir en storage del navegador
- En clientes donde no hay cookies (apps móviles nativas), se usa Bearer token — pero entonces el storage nativo debe ser seguro (Keychain/Keystore), no un archivo de texto

### Por qué

Un token en localStorage es accesible por `document.getElementById('...').innerHTML = fetch(...)` inyectado por cualquier script. Un token en cookie HttpOnly solo puede ser usado, no leído. Esta asimetría es la línea de defensa más valiosa contra XSS.

### Anti-patrón

"Guardo el token en localStorage porque es más fácil de mandar en el header". Cambia la conveniencia por vulnerabilidad estructural.

---

## 2. Login dispara por rol, no busca por DNI

Cuando un usuario puede pertenecer a múltiples tablas (estudiante, profesor, apoderado, director), buscar secuencialmente hasta encontrar es ineficiente y abre ataques de enumeración por timing.

### Reglas

- El usuario selecciona su rol al iniciar sesión (o el cliente lo indica explícitamente)
- El backend hace **dispatch directo** a la tabla del rol seleccionado; no recorre tablas
- Si la tabla más grande es "Estudiantes" y la más chica es "Directores", el dispatch evita tocar la grande innecesariamente
- Cuenta inactiva bloquea login con mensaje explicativo, no con error genérico
- La contraseña siempre se verifica con hash resistente (bcrypt/argon2); contraseñas legacy en texto plano se rehashean transparentemente en el login exitoso

### Por qué

Buscar secuencialmente "¿es estudiante? ¿es profesor? ¿es director?" filtra por tiempo de respuesta qué tablas existen y qué DNIs pertenecen a cada una. El dispatch por rol es O(1) y no filtra información.

---

## 3. Cookies separadas con propósitos diferentes

Un sistema de cookies bien diseñado tiene **múltiples cookies con un propósito cada una**, no una sola cookie con todo adentro.

### Reglas

| Cookie | Tipo | Duración | Propósito |
|--------|------|----------|-----------|
| Access token | HttpOnly, Secure, SameSite | Corta (1h) | Autenticación de cada request |
| Refresh token | HttpOnly, Secure, SameSite | Larga (7-30 días) | Obtener nuevos access tokens |
| CSRF token | **Legible por JS**, Secure | Igual al access | Double-submit para mutaciones |
| Device ID | Persistente | Muy larga (365 días) | Agrupar sesiones por dispositivo |

- Cada cookie tiene su responsabilidad; si una se compromete, las otras siguen funcionando
- El CSRF token **debe** ser legible por JS (el frontend lo lee y lo echa en un header)
- El device ID no es sensible: sirve para que el usuario pueda "cerrar sesión en este dispositivo" sin tocar los demás

### Por qué

Separar permite revocar selectivamente. Logout no necesita destruir el device ID. Rotación de access tokens no necesita rotar el refresh. Un bug en un middleware que lea mal una cookie no afecta a las demás.

---

## 4. CSRF por double-submit, no por session storage

Si las cookies son HttpOnly, el servidor no puede pedirle al frontend que eche el token en un header — el frontend no lo ve. Pero sí puede pedirle que eche **otro** token diferente.

### Reglas

- Al login, el servidor emite dos cookies: el access token (HttpOnly) y un CSRF token (legible por JS)
- En cada mutación (POST/PUT/DELETE/PATCH), el frontend lee la cookie CSRF y la echa en un header `X-CSRF-Token`
- El middleware valida que el header coincida con la cookie CSRF
- Si coinciden, la request viene del origen legítimo (un atacante cross-site no puede leer la cookie CSRF por Same-Origin Policy)
- GET requests no requieren CSRF (no mutan estado)
- Clientes Bearer (móviles nativos) están exentos de CSRF — el header Authorization ya no es enviado automáticamente por el browser

### Por qué

El ataque CSRF clásico es: "mi sitio malicioso hace un POST a tu banco usando tus cookies automáticas". Double-submit lo rompe porque mi sitio malicioso no puede leer tu cookie CSRF (está en otro origen) y por lo tanto no puede echarla en el header.

### Anti-patrón

Usar solo SameSite=Strict como defensa CSRF. SameSite es defensa en profundidad, no suficiente: navegadores viejos, extensiones, subdominios, y navegadores sin soporte dejan ventanas abiertas.

---

## 5. Refresh proactivo con ventana deslizante

El token de acceso debe ser corto (1h) para limitar el daño de un robo. Pero el usuario no debe notarlo nunca.

### Reglas

- El frontend agenda un refresh **antes** de que el token expire (ej: a los 50min si dura 60min)
- Cuando el timer dispara, se llama al endpoint de refresh con la cookie del refresh token
- El servidor valida que el refresh no esté revocado, emite un nuevo access + (opcionalmente) un nuevo refresh
- El frontend actualiza su registro de "último refresh" y reprograma el próximo
- Si el refresh falla con 401 (revocado), se fuerza logout sin preguntar

### Por qué

Refresh reactivo ("el request falló con 401, refrescar y reintentar") funciona pero introduce latencia visible en el primer request después de expirar. Refresh proactivo es invisible.

### Invariante

El refresh **no** debe ocurrir si el usuario está inactivo o la pestaña está oculta (ver principios 6 y 7). Un usuario inactivo por 8 horas no debe mantener tokens vivos refrescándose solos.

---

## 6. Actividad real, no reloj del servidor

La sesión vive mientras el usuario existe del otro lado del cristal. Un usuario que se fue a almorzar no debe seguir teniendo sesión activa.

### Reglas

- Se instala un tracker de eventos del usuario: mouse, teclado, touch, scroll
- Debounce agresivo (30s) para no gastar CPU en eventos continuos
- El tracker mantiene un timestamp de "última actividad"
- Antes de cada refresh, el scheduler consulta: ¿hubo actividad en los últimos N minutos?
- Si no hubo actividad, el refresh se pospone (no se cancela) — vuelve a chequear más tarde
- Si el usuario vuelve (evento de actividad), el refresh se ejecuta en el próximo ciclo

### Por qué

El servidor no puede saber si el usuario está presente. Solo el cliente puede. La actividad real es la fuente de verdad; el timer del servidor es secundario.

### Anti-patrón

"La sesión expira a los 30 minutos de creada". Ignora si el usuario estuvo usando la app los 30 minutos o si se fue a los 5. Frustra a los activos y mantiene vivas sesiones abandonadas.

---

## 7. Visibilidad de pestaña importa

Una pestaña en segundo plano no debería comportarse igual que una pestaña activa.

### Reglas

- Si la pestaña está oculta (`visibilitychange` lo indica), no se ejecutan refreshes programados
- Cuando la pestaña vuelve a ser visible, se chequea: ¿el token expiró mientras estaba oculto?
- Si expiró, se refresca inmediatamente antes de permitir cualquier request
- Si el usuario tiene 50 pestañas abiertas y solo usa una, solo esa refresca

### Por qué

Los navegadores modernos throttlean timers en pestañas ocultas. Un refresh programado puede disparar tarde, cuando el token ya expiró. Chequear al volver es más confiable que confiar en el timer.

---

## 8. Una sola sesión, muchas pestañas

El usuario ve pestañas; el sistema ve una sola identidad. Cualquier cambio de estado debe reflejarse en todas.

### Reglas

- Se usa un canal de broadcast intra-origen (BroadcastChannel o equivalente) con un nombre fijo
- Eventos mínimos: `login`, `logout`, `refresh-done`, `permisos-updated`
- **Login** en pestaña A con un usuario diferente → pestaña B detecta el conflicto y fuerza logout
- **Logout** en pestaña A → pestaña B recibe el mensaje y limpia su estado
- **Refresh-done** en pestaña A → pestañas B, C, D actualizan su "última hora de refresh" y evitan refrescar ellas mismas por un cooldown (ej: 2 minutos)
- Si el canal no está disponible (navegador viejo), degrada: cada pestaña se maneja sola; pueden coexistir pequeñas inconsistencias

### Por qué

Sin coordinación, dos pestañas pueden intentar refrescar al mismo tiempo (thundering herd), o una pestaña puede seguir mostrando datos de un usuario después de que otra pestaña hizo logout, o el cambio de usuario puede producir 403s porque los permisos en memoria no coinciden con las cookies.

### Invariante

Cualquier evento global de sesión (`login`, `logout`) debe ser **idempotente** — si llega dos veces no debe romper nada. Una pestaña no puede saber si ya aplicó el evento o no.

---

## 9. Logout es revocación, no solo "borrar cookies"

Borrar la cookie en el navegador solo impide que ese navegador la use. No impide que alguien que la robó la siga usando.

### Reglas

- Logout hace tres cosas:
  1. **Servidor**: revoca el refresh token asociado a (usuario, dispositivo) en la base de datos
  2. **Servidor**: emite headers `Set-Cookie` que vacían las cookies
  3. **Cliente**: limpia estado local (signals, storage, cache, permisos, service worker)
- La revocación del refresh es lo que realmente termina la sesión. Sin ella, un atacante con el refresh podría seguir pidiendo access tokens
- El device ID no se revoca — permanece para "recordar este dispositivo" en el próximo login
- Logout se propaga a otras pestañas por el canal de broadcast (principio 8)
- El cache del service worker se limpia para que datos sensibles de la sesión anterior no sean visibles al próximo usuario

### Por qué

Si solo borras la cookie del cliente y el servidor no revoca, un atacante que robó la cookie antes del logout puede seguir usando tokens hasta que expiren. Revocar server-side cierra esa ventana.

### Anti-patrón

"Logout = redirect a /login". No limpia estado, no revoca refresh, no notifica a otras pestañas. Es un espejismo de seguridad.

---

## 10. Dispositivo como unidad de sesión

Un usuario puede estar logueado en su laptop de trabajo, su laptop personal y su teléfono. Cerrar sesión en uno no debe cerrar los otros.

### Reglas

- Al primer login desde un navegador, se emite un device ID persistente (cookie, 1 año)
- El refresh token se almacena en BD con una clave compuesta `(usuario, device_id)`
- Logout revoca solo el refresh de ese (usuario, device)
- Una pantalla "Mis dispositivos" puede listar los devices activos del usuario y permitir revocación selectiva
- Un dispositivo perdido puede ser revocado explícitamente sin afectar a los otros

### Por qué

Agrupar sesiones por usuario (sin dispositivo) significa que "logout" cierra sesión en todas partes. Agrupar por dispositivo permite el modelo mental del usuario real.

---

## 11. Permisos por rol + overrides por usuario: **reemplazo, no merge**

El error más común en sistemas de autorización es acumular permisos: "tiene los de su rol más los suyos propios". Este modelo produce escaladas accidentales.

### Reglas

- Hay dos capas: **permisos de rol** (definidos por rol) y **permisos personalizados** (definidos por usuario)
- Si un usuario tiene permisos personalizados definidos, estos **reemplazan completamente** a los del rol
- Si un usuario no tiene permisos personalizados, se usan los del rol
- No existe "unión" ni "intersección" — es una sustitución binaria
- Quitar un permiso a un usuario significa definir permisos personalizados que lo excluyan explícitamente

### Por qué

En el modelo merge, dar "acceso temporal" a un permiso a un usuario requiere luego acordarse de quitarlo. En el modelo replace, los permisos personalizados son una lista explícita, auditable, y sin ambigüedad sobre qué está activo.

### Anti-patrón

"Permisos efectivos = roles ∪ overrides". Parece flexible pero produce casos donde un usuario hereda permisos por tener dos roles y nadie recuerda por qué.

### Invariante

Si `permisos_personalizados(usuario)` existe, `permisos(rol(usuario))` es ignorado completamente en la autorización.

---

## 12. Verificación exacta, no por prefijo

Los permisos por ruta deben ser exactos. Tener permiso a `/intranet` **no** debe implicar permiso a `/intranet/admin`.

### Reglas

- Cada ruta es una unidad atómica de permiso
- La verificación compara strings normalizados con igualdad estricta
- Normalización: lowercase, sin slash inicial, sin query string
- Si una ruta es reemplazada por otra más granular (ej: `/asistencia` → `/asistencia/diaria` y `/asistencia/reportes`), deben migrarse los permisos explícitamente

### Por qué

Match por prefijo parece conveniente ("si tiene el padre, tiene los hijos") pero produce escaladas silenciosas cuando se agregan sub-rutas administrativas a una ruta pública. El modelo exacto obliga a ser explícito.

### Invariante

`tienePermiso("intranet/admin")` es **false** si el usuario solo tiene `"intranet"` en su lista. No hay fallback por jerarquía.

---

## 13. Autorización en el servidor, comodidad en el cliente

Ocultar un botón no es autorización. Cualquier verificación en el frontend es para mejorar UX, no para proteger datos.

### Reglas

- El frontend verifica permisos para:
  - Ocultar menús y botones de acciones no permitidas
  - Redirigir a una página de "acceso denegado" antes de cargar una ruta prohibida
  - Evitar llamadas a endpoints que van a fallar con 403
- El backend verifica permisos para **cada** request que muta o lee datos sensibles
- Los permisos del frontend y del backend vienen de la **misma fuente** (el mismo endpoint de permisos), para evitar divergencias
- Si un nuevo endpoint se agrega al backend sin verificación, es un bug de seguridad, no una optimización

### Por qué

Un atacante puede modificar el código JavaScript para ignorar cualquier guard del frontend. La única defensa real es que el backend rechace la request. El frontend es conveniencia.

### Anti-patrón

"El botón no aparece si no tiene permiso, así que el endpoint no necesita validación". Cualquier usuario con curl puede llamar al endpoint directamente.

---

## 14. Permisos se cargan una vez, se invalidan explícitamente

Los permisos son relativamente estables. Cargarlos en cada request es un desperdicio.

### Reglas

- Al login (o al primer request autenticado), el frontend llama a un endpoint `mis-permisos` y guarda la lista en memoria + storage
- Los permisos se cachean por `(usuario, rol)` — un mismo usuario con dos roles tiene dos caches
- La cache se invalida explícitamente cuando:
  - El usuario hace logout
  - Un admin modifica los permisos (el sistema puede emitir un evento para que el usuario afectado refresque)
  - Pasa un tiempo máximo (ej: 5 minutos) como failsafe
- Cambio de ruta → no recarga permisos, solo consulta la cache

### Por qué

Llamar al servidor en cada navegación es lento e innecesario. El cache local es seguro porque el backend siempre valida de nuevo (principio 13).

---

## 15. Storage particionado por sensibilidad y ciclo de vida

No todo el estado del usuario tiene la misma vida útil ni la misma sensibilidad.

### Reglas

| Dato | Dónde | Por qué |
|------|-------|---------|
| Tokens | Cookie HttpOnly | Máxima sensibilidad, no debe ser legible por JS |
| Metadatos de sesión (user, rol, entityId) | sessionStorage | Vive mientras la pestaña; se limpia al cerrar |
| Permisos | sessionStorage (o localStorage si "recordarme") | Igual que metadatos, cacheable |
| Preferencias de UI (idioma, tema, filtros guardados) | localStorage | Persistente, no sensible |
| Datos offline (cache de lecturas, operaciones pendientes) | IndexedDB | Volumen grande, acceso async |
| Estado efímero (drawer abierto, tab seleccionada) | Memoria (signals) | No necesita persistencia |

### Por qué

Mezclar niveles (guardar tokens en localStorage "para que sobrevivan al reload") mezcla sensibilidad con conveniencia. Cada tipo de dato tiene su sitio.

### Invariante

Logout limpia **todo** storage relacionado a la sesión actual: sessionStorage completo, claves específicas de permisos/usuario en localStorage, el cache de lecturas, y el estado efímero. Solo sobreviven el device ID y preferencias genuinamente no-sensibles.

---

## 16. El frontend no confía en su reloj

Los tokens tienen fecha de expiración en UTC. El reloj del navegador puede estar mal.

### Reglas

- No programar refreshes usando "si `ahora + N > exp`" donde `ahora` es del cliente
- Usar duración relativa: "el token dura 60min, refrescar a los 50"
- Si la pestaña vuelve del background, no asumir que el tiempo transcurrido es correcto — verificar llamando a un endpoint liviano (`/perfil`, `/ping`) que valide la sesión
- En reconexión después de offline, re-verificar sesión antes de aceptar cualquier operación

### Por qué

Usuarios con reloj atrasado refrescan demasiado temprano (desperdicio). Usuarios con reloj adelantado creen que expiró cuando no, y fuerzan logout innecesario. La verificación es la única fuente confiable.

---

## Invariantes

| ID | Invariante |
|----|-----------|
| `INV-AUTH01` | El token de acceso nunca es accesible por JavaScript (cookie HttpOnly o equivalente) |
| `INV-AUTH02` | Login hace dispatch directo por rol seleccionado, no búsqueda secuencial entre tablas |
| `INV-AUTH03` | Cuenta inactiva bloquea login con mensaje explícito (no error genérico) |
| `INV-AUTH04` | Contraseñas se verifican con hash resistente; legacy en texto plano se rehashea en login exitoso |
| `INV-AUTH05` | Refresh proactivo antes de la expiración, nunca reactivo después del 401 |
| `INV-AUTH06` | Refresh no ocurre si el usuario está inactivo o la pestaña está oculta |
| `INV-AUTH07` | Logout revoca refresh token en el servidor, no solo borra cookies en el cliente |
| `INV-AUTH08` | Logout se propaga entre pestañas vía canal de broadcast y es idempotente |
| `INV-AUTH09` | Un mismo usuario en múltiples dispositivos tiene sesiones independientes (device ID) |
| `INV-AUTH10` | CSRF se valida por double-submit en todas las mutaciones (excepto clientes Bearer puros) |
| `INV-PERM01` | Permisos personalizados **reemplazan completamente** a los permisos del rol (no merge) |
| `INV-PERM02` | Verificación de ruta es **exacta**, no por prefijo (`intranet` ≠ `intranet/admin`) |
| `INV-PERM03` | Backend valida permisos en cada endpoint; verificación frontend es solo UX |
| `INV-PERM04` | Permisos se cachean localmente pero se invalidan en logout, rol-change y failsafe temporal |
| `INV-SESS01` | Una sola identidad activa por origen; cambio de usuario en una pestaña fuerza logout en las demás |
| `INV-SESS02` | Refresh en una pestaña evita refresh en las otras por cooldown coordinado |
| `INV-SESS03` | El cliente no confía en su reloj para decidir expiración; usa duración relativa o verificación |
| `INV-STORE01` | Tokens en cookie HttpOnly; metadatos en sessionStorage; preferencias en localStorage; datos grandes en IndexedDB |
| `INV-STORE02` | Logout limpia todo el storage ligado a la sesión (sessionStorage completo + claves específicas + caches) |

---

## Anti-patrones

| Anti-patrón | Por qué falla | Solución |
|-------------|---------------|----------|
| Token en localStorage | Accesible por XSS, cualquier script lo puede exfiltrar | Cookie HttpOnly + Secure + SameSite |
| Permisos acumulativos (rol ∪ usuario) | Produce escaladas silenciosas al añadir roles | Permisos personalizados reemplazan total |
| Verificación por prefijo de ruta | `intranet` implica `intranet/admin` accidentalmente | Match exacto de string normalizado |
| Refresh reactivo al primer 401 | Latencia visible en el primer request después de expirar | Refresh proactivo antes de expirar |
| Refresh por timer sin gating | Sesiones fantasma vivas para siempre aunque el usuario se fue | Gate por actividad real + visibilidad de pestaña |
| Logout solo client-side | Tokens robados siguen válidos hasta expirar | Revocación server-side del refresh token |
| Una sesión = una cookie grande con todo | Comprometer una rompe todo; no se puede revocar selectivo | Cookies separadas por propósito |
| Verificar permisos solo en frontend | Cualquier curl a endpoint lo bypassa | Backend valida en cada endpoint |
| Buscar DNI en todas las tablas en login | Filtra información por timing + O(n) innecesario | Dispatch por rol seleccionado |
| Sin coordinación entre pestañas | Pestañas muestran usuarios distintos / 403s por permisos desactualizados | BroadcastChannel con eventos idempotentes |
| Confiar en el reloj del cliente | Usuarios con reloj mal programado fallan autenticación | Duración relativa + verificación al reconectar |
| Ignorar visibilidad de pestaña | Timers throttleados refrescan tarde | `visibilitychange` + check al volver |

---

## Checklist de implementación

```
AUTENTICACIÓN
[ ] Tokens en cookie HttpOnly + Secure + SameSite
[ ] Refresh token separado del access token
[ ] Device ID persistente para agrupar sesiones
[ ] CSRF token legible por JS para double-submit en mutaciones
[ ] Login dispatch directo por rol seleccionado
[ ] Cuenta inactiva bloqueada con mensaje explícito
[ ] Hashing resistente (bcrypt/argon2); rehash transparente de legacy

SESIÓN
[ ] Refresh proactivo con margen (ej: 50min de 60min)
[ ] Gate por actividad real del usuario (mouse/teclado/touch)
[ ] Gate por visibilidad de pestaña
[ ] Check al volver del background
[ ] No confiar en el reloj local para decidir expiración
[ ] Re-verificación después de reconexión offline→online

MULTI-PESTAÑA
[ ] BroadcastChannel (o equivalente) con canal nombrado
[ ] Eventos: login, logout, refresh-done, permisos-updated
[ ] Cooldown entre refreshes de pestañas (ej: 2min)
[ ] Detección de cambio de usuario → fuerza logout en otras
[ ] Eventos idempotentes (aplicar dos veces no rompe)
[ ] Degradación graceful si el canal no existe

LOGOUT
[ ] Revocación server-side del refresh token
[ ] Set-Cookie que vacía las cookies del cliente
[ ] Limpieza de sessionStorage, claves específicas de localStorage, caches
[ ] Broadcast a otras pestañas
[ ] Redirect a login solo después de limpiar

AUTORIZACIÓN
[ ] Modelo replace (no merge) entre permisos de rol y personalizados
[ ] Verificación exacta de ruta (no por prefijo)
[ ] Backend valida en cada endpoint
[ ] Frontend verifica solo para UX (ocultar/redirigir)
[ ] Cache de permisos en memoria + storage
[ ] Invalidación en logout, rol-change, failsafe temporal
[ ] Misma fuente de permisos para frontend y backend

STORAGE
[ ] Particionado por sensibilidad y ciclo de vida
[ ] Tokens nunca en localStorage ni sessionStorage
[ ] Metadatos de sesión en sessionStorage
[ ] Preferencias en localStorage
[ ] Datos grandes en IndexedDB
[ ] Logout limpia todo lo ligado a la sesión
```

---

## Métricas de éxito

| Métrica | Objetivo | Cómo medir |
|---------|----------|------------|
| **Tiempo hasta login usable** | < 500ms desde submit hasta redirect | Telemetría en el handler de login |
| **Refresh invisible al usuario** | 0 requests fallan con 401 por expiración | Contar 401s atribuidos a tokens expirados |
| **Coordinación multi-pestaña correcta** | 0 reportes de "veo al usuario equivocado" o "403 después de login" | Sentry/error tracking + feedback |
| **Logout efectivo** | Refresh token revocado aparece en logs server-side en < 1s | Logs del endpoint de logout |
| **Permisos sin escaladas** | 0 incidentes de usuarios accediendo a rutas fuera de su lista | Auditoría periódica de permisos vs accesos reales |
| **Tokens no robables por XSS** | 0 reportes de tokens filtrados desde storage legible | Auditoría estática + pentesting |
| **Sesión sobrevive reconexión** | Usuario offline → online no necesita re-login si el refresh es válido | Test manual en modo avión |

---

## Relación con otros subsistemas

- **Cache SWR**: las lecturas cacheadas deben invalidarse al logout para que el próximo usuario no vea datos del anterior
- **WAL**: las mutaciones pendientes deben asociarse a la identidad del usuario — si cambia de usuario antes de sincronizar, el WAL debe decidir si descartar o reintentar con la nueva identidad
- **Trazabilidad de errores**: los breadcrumbs deben incluir `(userId, rol)` sin incluir el token; errores 401 y 403 son señales de inconsistencia entre la capa de sesión y la de autorización
- **Service Worker Scope**: el SW debe respetar el logout — si el usuario cierra sesión, el SW no debe seguir sirviendo responses cacheadas con datos personales
