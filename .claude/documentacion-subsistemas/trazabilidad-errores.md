# Subsistema: Trazabilidad de Errores

> Principios transferibles entre tecnologías para construir un sistema de trazabilidad de errores en producción.

---

## Principio central

> **"El usuario no debe notar nada. El desarrollador debe ver todo."**

Un sistema de trazabilidad es invisible para el usuario final y completo para quien diagnostica. Si cumplir uno rompe el otro, el diseño es incorrecto.

---

## 1. Clasificación por origen real, no por quién reporta

El error puede ser reportado por el frontend, pero eso no significa que **sea** del frontend. La clasificación debe reflejar **dónde se originó** el problema, no quién lo detectó.

Categorías mínimas:

| Origen | Qué es | Cómo se detecta |
|--------|--------|-----------------|
| **FRONTEND** | Bug en el código del cliente (null reference, type error, crash de UI) | Excepción JS no capturada + 4xx por requests mal formados |
| **BACKEND** | El servidor respondió con error interno (bug del servidor) | HTTP 500 del servidor con respuesta válida |
| **NETWORK** | No hubo comunicación real con el servidor | HTTP 0, 502, 503, 504, timeouts, `navigator.onLine` false, requests lentas que fallan |

**Regla**: Clasificar por **señales múltiples**, no por una sola. Status 0 es NETWORK incluso si el backend está "up". Una request exitosa que tardó 2s es degradación de red aunque respondió 200. Un 500 puede ser NETWORK si el proxy no pudo conectar con el backend.

---

## 2. Breadcrumbs — contexto del flujo del usuario

Un error aislado es un misterio. Un error con las últimas 15-30 acciones del usuario es un diagnóstico.

### Qué trackear

- **Navegación**: cambios de ruta (`A → B`)
- **Llamadas a API**: método, URL, status, duración (sin body, sin tokens)
- **Acciones del usuario**: abrir dialog, confirmar, clicks relevantes
- **Cambios de estado**: login, logout, cambio de rol
- **Operaciones con persistencia**: create/update/delete que tocan BD

### Cómo trackear

- **Ring buffer** en memoria (últimas N acciones, típicamente 30)
- Se alimenta de múltiples fuentes: router, interceptors HTTP, servicios de auth, helpers de mutación
- **No persiste**: se pierde con la sesión — son datos efímeros, solo útiles si hay error
- **Cantidad variable** según severidad: error crítico = 30 breadcrumbs, error de red = 5

### Qué NO incluir en breadcrumbs

- Tokens, cookies de auth, contraseñas
- Body de requests (pueden contener datos sensibles)
- Datos completos del usuario (solo DNI enmascarado o rol)

---

## 3. Fire-and-forget con garantía de aislamiento

El sistema de trazabilidad **nunca** puede afectar la operación principal. Si reportar el error falla, se pierde silenciosamente.

### Reglas

- El POST de reporte de error no bloquea el flujo del usuario
- Una excepción al registrar un error en BD **no se propaga** — se loggea warning y se descarta
- Un error al enviar el reporte se captura y no se reintenta (a menos que haya outbox offline)
- El middleware/interceptor que persiste errores usa su **propio scope** — no depende del scope del request que falló

### Por qué

Si el sistema de trazabilidad tira excepciones, el usuario ve errores por intentar reportar errores. Peor aún: el error real queda oculto bajo los errores del reporter. La trazabilidad debe ser transparente incluso cuando falla.

---

## 4. Registro múltiple — backend automático + frontend automático + usuario manual

Un mismo problema puede dejar **tres registros complementarios**, cada uno cubriendo un blind spot del otro:

| Registro | Origen | Qué aporta | Cobertura |
|--------|--------|--------|--------|
| **Backend automático** | Middleware del servidor → BD | Stack trace del lenguaje servidor, archivo:línea exacta | El "qué falló técnicamente" |
| **Frontend automático** | Cliente → `POST /errors` | Breadcrumbs del usuario, URL del cliente, user agent, correlation ID | El "qué estaba haciendo el usuario" |
| **Reporte manual del usuario** | Cliente → `POST /user-reports` | Descripción en palabras del usuario, propuesta de mejora, categoría percibida | El "qué vivió el usuario que el sistema no vio" |

Los tres pueden (idealmente) compartir un **correlation ID** para cruzarlos. Ver sección 11 (ring buffer del cliente) y sección 17 (canal manual).

### Regla

Cada canal registra lo que sabe y **nunca** depende de que los otros estén disponibles:

- El backend no asume que el frontend reportará.
- El frontend no asume que el backend loggeó.
- El usuario no asume que el sistema detectó el problema (reporta lo que vio).

### Por qué los tres y no solo el automático

El canal automático solo captura lo que **dispara una excepción o un status ≥400**. Hay clases enteras de problemas que ningún sistema automatizado va a ver:

- Datos incoherentes entre pantallas (la query respondió 200, pero los números no cuadran).
- Problemas de UX (formulario confuso, exceso de modales, navegación que no se entiende).
- Errores visuales (texto cortado, botones solapados, contraste ilegible).
- Lentitud percibida que no llega al umbral de "slow request".
- Propuestas de mejora (el usuario sabe cómo quiere que funcione).

Para eso existe el canal manual — es la única fuente de verdad sobre la experiencia real.

---

## 5. Dedup — agrupar errores en cascada

Un solo bug puede generar 10, 20, 100 errores en cadena. Reportarlos todos satura el sistema y oculta el patrón.

### Reglas

- **Dedup por clave**: `{status}:{url-sanitizada}` — si ya reporté esto en los últimos 5s, ignorar
- **Rate limit global**: máximo N reportes por minuto (típicamente 5-10)
- **Limpieza periódica**: borrar entradas del dedup más antiguas que la ventana

### Por qué

Cuando un endpoint falla, usualmente varios componentes lo llaman en cascada. El dedup garantiza que veas el patrón (1 error repetido) y no 20 ruidos iguales.

---

## 6. Retención controlada — diferenciada por valor

Los errores automáticos tienen fecha de caducidad corta. Un error automático de hace 2 semanas es ruido: o ya se arregló, o sigue pasando y tendrás errores nuevos que lo representan mejor. Pero los reportes manuales y las propuestas del usuario tienen valor a largo plazo incluso si ya se resolvieron — son memoria institucional.

### Regla

Cada fuente de traza tiene su propia política de retención:

| Fuente | Retención | Razón |
|--------|--------|--------|
| Errores automáticos (backend + frontend) | Corta (7 días típico) | Ruido que envejece rápido |
| Reportes manuales NO resueltos | Media (90-180 días) | El problema sigue vivo hasta que alguien lo toque |
| Reportes manuales **RESUELTOS** | Indefinida | Memoria institucional: qué se arregló, qué propuso el usuario, qué funcionó |

Job automático diario que purga respetando estas reglas. Para errores automáticos: delete cascade borra también los breadcrumbs. Para reportes manuales: `DELETE WHERE estado != 'RESUELTO' AND fecha < cutoff`.

### Por qué

- La tabla de errores automáticos no crece indefinidamente
- Los reportes resueltos quedan disponibles para consultar "¿qué se había reportado sobre X antes?" cuando regresa un problema similar
- Los datos personales se limitan en el tiempo para errores automáticos; en reportes manuales la exposición ya está limitada por el enmascarado (sección 13)

---

## 7. Source location — archivo y línea exactos

"Falló algo" no sirve. "Falló `alignOverlay` en `TimePicker.ts:89`" sirve.

### Dos estrategias según lenguaje

**Backend (lenguajes compilados, no minificados)**:
- Stack trace incluye archivos fuente reales
- Parsear el primer frame de tu código (filtrar middleware y framework)
- Formato: `Clase.Método en archivo.ext:línea`

**Frontend (JS minificado en producción)**:
- Stack trace contiene chunks minificados inútiles (`chunk-XYZ.js:1:2838`)
- Parser debe extraer **nombres legibles de funciones** del stack
- Filtrar:
  - Funciones con nombres de 1-2 caracteres (minificadas)
  - Nombres genéricos (`emit`, `next`, `subscribe`, `run`, `invoke`)
  - Prefijos de variable minificada (`n.method` → `method`)
- Formato: `funcA ← funcB ← funcC` (cadena de llamadas, no archivo:línea)

### Por qué

En builds minificados no puedes extraer archivo:línea real sin source maps en runtime (caro). Pero **sí** puedes extraer los nombres de funciones que sobrevivieron la minificación (los que tienen nombre, como los métodos de clases públicas). Esos tres nombres cuentan toda la historia.

---

## 8. Captura de errores anónimos (pre-login)

El endpoint que recibe reportes de error debe permitir requests **sin autenticación**. Los errores pre-login son los más importantes: el usuario no puede ni siquiera entrar al sistema.

### Regla

- El endpoint de reporte es `[AllowAnonymous]` con rate limit por IP
- Si el usuario está autenticado, extraer DNI/rol de claims
- Si es anónimo, guardar como `null`

### Por qué

Si solo aceptas reportes autenticados, pierdes todos los errores de login, registro, recuperación de contraseña. Esos son precisamente los que necesitas ver.

---

## 9. Outbox offline — persistencia local para errores

Si el usuario está offline, los errores no se pueden enviar **ahora**. Pero pueden guardarse localmente y enviarse después.

### Diseño

- Cuando el POST de reporte falla → guardar payload en storage local (IndexedDB)
- Al detectar conexión restaurada (`online` event) → flush del outbox
- Flush periódico (cada 30s) como red de seguridad — el evento `online` no es 100% confiable
- Límite del outbox (50-100 entradas) para no llenar el storage del usuario
- Dedup aplica también al outbox

### Por qué

Sin outbox, todos los errores que ocurren sin conexión se pierden — que son exactamente los errores de red que querías trackear.

---

## 10. Slow request detection

Una request que tarda demasiado Y falla es una señal clara de problema de red. Pero incluso una request **exitosa** que tarda demasiado indica degradación.

### Reglas

- **Request lenta + fallida**: reportar como `NETWORK` `CRITICAL`
- **Request lenta + exitosa**: reportar como `NETWORK` `WARNING`
- Threshold ajustable según contexto (500ms-2s típico)
- Dedup agresivo por URL — solo 1 reporte por URL en la ventana de dedup

### Por qué

Los service workers y caches pueden ocultar problemas de red sirviendo datos viejos. La duración es una señal que **no se puede cachear** — si el fetch real tardó 3 segundos, lo sabes aunque el SW sirvió cache instantáneo al usuario.

---

## 11. Correlation ID — cruzar logs distribuidos

Cada request lleva un ID único que viaja entre frontend y backend (header `X-Request-Id` / `X-Correlation-Id` o similar).

### Reglas

- El cliente genera el ID al iniciar la request
- El backend lo recibe, lo propaga en logs, lo retorna en el response header
- Los errores (en frontend y backend) incluyen el ID
- En la vista admin, se puede buscar/filtrar por ID para ver toda la historia de una request

### Ring buffer del cliente — cruzar con el canal manual

El mismo correlation ID se usa para vincular un reporte manual del usuario con el trazo automático correspondiente. Para eso el cliente mantiene dos buffers pequeños en memoria:

| Buffer | Qué guarda | Para qué |
|--------|--------|--------|
| `lastRequestIds` | Últimos N (≈5) request IDs emitidos por el interceptor, independiente de dev/prod | Fallback genérico cuando el usuario reporta sin error visible |
| `visibleErrors` | Últimos N correlation IDs de errores que **dispararon una notificación toast/modal** visible al usuario, con timestamp | Match preciso: "el usuario acaba de ver este error, seguro lo está reportando" |

Al abrir el dialog de reporte manual:

1. Si hay un error visible dentro de una ventana corta (ej: 2 minutos) → prioridad máxima, se precarga como correlation ID del reporte.
2. Si no, se usa el último request ID del buffer genérico.
3. Si no hay ninguno (pre-login, sin actividad previa) → `null` (el reporte no lleva correlation ID, el match será imposible).

El usuario puede desmarcar el match automático si su reporte es sobre otra cosa (ej: vio un toast hace 30s, pero el reporte es sobre un problema visual independiente).

### Por qué el buffer específico de errores visibles

Sin esa distinción, el `correlationId` del reporte sería simplemente "el del último request". Pero si el usuario vio un error hace 40 segundos y mientras tanto hizo otras navegaciones benignas, el último request apuntará a una request exitosa no relacionada. El buffer de errores visibles conserva el ID del error **real** durante la ventana en la que el usuario aún lo tiene en mente.

### Por qué

En sistemas distribuidos, un error puede involucrar frontend, gateway, backend, BD, y servicios externos. Sin un ID común no puedes correlacionar qué pasó. Y sin correlacionar canal manual con canal automático, cada reporte del usuario es un misterio que hay que diagnosticar desde cero.

---

## 12. Guard contra loops infinitos y exención del throttling cliente

Si el sistema de reporte falla, y ese fallo genera otro error, y ese error se reporta, y ese reporte falla... tienes un loop infinito. Y si el cliente tiene un rate limiter global, un 429 en el endpoint de reporte puede activar un cooldown que bloquee toda la app.

### Reglas

- El interceptor HTTP **nunca procesa** errores del endpoint de reporte (`/api/errors`, `/api/user-reports`)
- El trace interceptor **no genera breadcrumbs** para requests al endpoint de reporte ni registra su `requestId` en el ring buffer de correlación (si no, el ID del POST del reporte pisa el ID real que el usuario quería reportar)
- Si el reporte falla, se va al outbox **sin** generar otro reporte de error
- **Los endpoints del reporter están exentos del throttling global del cliente**: no consumen slot de concurrencia, no activan cooldown al recibir 429, no se bloquean si la app entró en cooldown por otra causa
- Un 429 en el endpoint de reporte se maneja **localmente** en el facade que lo originó: mensaje inline "espera N segundos antes de enviar otro", sin afectar al resto de la aplicación
- Los reportes manuales NO se reintentan automáticamente en background (`consistencyLevel: server-confirmed` en el patrón WAL). Un 429 o un error lo debe ver el usuario en el momento para decidir; un retry silencioso 30 segundos después es confuso

### Por qué

El anti-patrón más común en sistemas de trazabilidad es que **el subsistema degrade la app principal**: un 429 en el reporter activa un cooldown global → toda la intranet queda bloqueada durante 60s → el usuario intenta reportar el bloqueo → vuelve a hitear el rate limit → loop visible al usuario.

La regla de oro es: **el canal de reporte es opcional y prescindible**. Si falla, falla solo él. Nunca degrada el resto.

---

## 13. Privacidad y PII

Los errores contienen información del usuario. Debe tratarse con cuidado.

### Reglas

- **DNI/SSN/Identificadores**: siempre enmascarar (`***1234`, solo los últimos 4 dígitos)
- **Tokens/cookies/passwords**: nunca, ni en breadcrumbs ni en logs
- **Body de requests**: nunca (pueden contener datos personales)
- **Query params sensibles**: sanitizar URLs antes de guardar
- **Strings truncados**: limitar mensaje (500), stack (4000), breadcrumb (500) — previene ataques de llenar la BD y también limita exposición de datos

---

## 14. Vista de consulta solo para desarrolladores

Los errores **no** son para el usuario. Son para quien los arregla.

### Reglas

- La vista de consulta está detrás del rol más alto (Director, Admin, SRE)
- No aparece en el menú del usuario normal
- Incluye filtros por origen, severidad, fecha, usuario
- Drawer de detalle expande breadcrumbs, stack trace, contexto técnico
- **Nunca** mostrar al usuario final "Ref: abc123" con datos internos

---

## 15. Severidad clara, no genérica

No todos los errores son iguales:

| Severidad | Significado | Acción |
|-----------|-------------|--------|
| **CRITICAL** | Bug real que rompe una funcionalidad (500, crash JS, data corruption) | Arreglar ya |
| **ERROR** | Regla de negocio violada o input incorrecto (400, 422) | Revisar, puede ser bug |
| **WARNING** | Degradación o situación inesperada pero operable (request lenta, 404 de recurso viejo) | Monitorear |

Las severidades menores (401, 403) usualmente **no se trazan** — son flujo normal de sesiones expiradas y permisos denegados.

---

## 16. Invariantes del sistema

Reglas que el sistema **debe** cumplir. Cada una tiene un ID para referencia en code reviews:

| ID | Invariante |
|----|-----------|
| `INV-ET01` | El usuario NUNCA ve diferencia — tracking invisible |
| `INV-ET02` | Error en el registro NUNCA falla la operación principal (fire-and-forget) |
| `INV-ET03` | Datos personales SIEMPRE enmascarados |
| `INV-ET04` | Breadcrumbs NUNCA contienen datos sensibles (tokens, passwords, body) |
| `INV-ET05` | Registros viejos se purgan automáticamente |
| `INV-ET06` | Correlation ID se preserva entre frontend y backend |
| `INV-ET07` | Si el reporte falla, se pierde silenciosamente o va al outbox — nunca propaga error |
| `INV-ET08` | Loops recursivos imposibles: el reporter nunca se reporta a sí mismo |
| `INV-ET09` | El canal manual coexiste con el automático — ninguno reemplaza al otro, ambos contribuyen al diagnóstico |
| `INV-ET10` | Los endpoints del reporter (automático + manual) están exentos del throttling global del cliente: un 429 aquí NUNCA bloquea otras partes de la app |
| `INV-ET11` | Los reportes manuales NO se reintentan en background — un error debe verse en el momento del submit para que el usuario decida |
| `INV-ET12` | El correlation ID de un reporte manual apunta al último error **visible** dentro de una ventana corta (con prioridad sobre el último request ID genérico), pero NUNCA al request del POST del propio reporte |
| `INV-ET13` | Los reportes manuales en estado terminal "RESUELTO" se conservan indefinidamente como memoria institucional — la purga automática los excluye |

---

## 17. Canal manual — cuando el usuario tiene la última palabra

> **"El canal automático captura lo que el sistema detecta como error. El canal manual captura lo que el usuario vive como problema. Son cosas distintas."**

El canal manual es un POST `/user-reports` al que llega un formulario que el usuario abre voluntariamente cuando quiere decirle algo al equipo: "esta página está lenta", "los datos no cuadran", "propongo que funcione así", "ese botón no hace nada". No reemplaza al canal automático — lo complementa.

### 17.1 Qué es (y qué no es)

**Es**: Un canal opcional, visible, controlado por el usuario. Pensado para lo que el sistema **no puede detectar solo**: UX, datos incoherentes, lentitud percibida bajo umbral, propuestas de mejora.

**No es**: Un sustituto del canal automático. Si el sistema tira una excepción, eso debe seguir llegando por el canal automático aunque el usuario no reporte nada.

### 17.2 Activación accesible

- **Atajo de teclado global**: disponible desde cualquier pantalla autenticada (ej: `Ctrl+Alt+F`). Debe elegirse un atajo que no choque con navegador ni con otras features.
- **Botón flotante persistente**: esquina inferior-derecha, visible en toda la intranet. Respeta `env(safe-area-inset-*)` para mobile/Capacitor. Se oculta mientras el dialog está abierto para no solapar.
- **Anónimo permitido**: el endpoint acepta POSTs sin autenticación (rate-limit por IP). Pierdes el canal si exiges login — precisamente los errores pre-login son los más críticos.

### 17.3 Tipos — por concepto del usuario, no por módulo técnico

El catálogo de tipos debe organizarse por cómo el usuario percibe el problema, no por qué módulo del backend falla. Categorías sugeridas:

- **Rendimiento**: página lenta, web lenta, fallo al actualizar
- **Datos**: inconsistencia entre pantallas, datos inválidos, datos viejos persistentes
- **Recursos**: enlace roto, PDF no se genera, Excel mal formateado, recursos no visibles
- **Visual**: error visual en escritorio, error visual en móvil
- **UX**: formulario ineficiente, navegación confusa, contenido desordenado, exceso de modales
- **Servidor**: error de servidor (el clásico "no me deja hacer nada")

Hay **una única fuente de verdad** para los tipos (idealmente en backend) y el frontend la replica con labels amigables. Añadir un tipo nuevo actualiza ambos en el mismo PR.

### 17.4 Correlación oportunista con el canal automático

Al abrir el dialog se consulta el ring buffer de errores visibles (sección 11). Si hay un error reciente (ventana <2 min), se muestra un banner "Detectamos un error reciente — ¿lo estás reportando?" con checkbox marcado por defecto. Si el usuario lo mantiene marcado, el `correlationId` del reporte apunta a ese error. Si lo desmarca, se usa el último request ID genérico.

Este diseño sube la tasa de match en los casos críticos (usuario reporta justo después de ver un toast) manteniéndose correcto cuando el reporte es sobre otra cosa (visual puro, propuesta de mejora).

### 17.5 Máquina de estados

Un reporte manual tiene un ciclo de vida explícito, distinto al de un error automático (que es inmutable tras ser registrado):

```
NUEVO ──→ REVISADO ──→ EN_PROGRESO ──→ RESUELTO (terminal)
   │          │             │
   └──────────┴─────────────┴──→ DESCARTADO (terminal)
                                        ↑
                            RESUELTO ──→ NUEVO (reapertura manual explícita)
```

- `NUEVO`: default al crear
- `REVISADO`: el admin lo vio y confirmó que es válido
- `EN_PROGRESO`: hay fix en camino
- `RESUELTO`: fix entregado (reapertura manual permitida → vuelve a `NUEVO`)
- `DESCARTADO`: no aplica, duplicado, fuera de alcance (terminal)

Las transiciones requieren rol administrativo y validan `RowVersion` (optimistic locking) para evitar conflictos de concurrencia.

### 17.6 Privacidad y enmascarado

- DNI se almacena completo en BD (auditoría) pero **siempre enmascarado** en DTOs que llegan al frontend (`***1234`)
- `descripcion` y `propuesta` con cap de 2000 caracteres: suficiente para contexto, no para un data-dump accidental
- Reportes pre-login guardan usuario como `"Anónimo"` con campos de identidad en `null`

### 17.7 Notificación al admin

Al crear un reporte, se encola un correo al admin vía outbox (fire-and-forget — INV-ET02 aplica). Un error al encolar NUNCA falla el insert del reporte. El email lleva un link directo al drawer de detalle del reporte para revisión rápida.

### 17.8 Vista admin — drawer reutilizable

La vista admin de reportes manuales reutiliza el mismo drawer de detalle del canal automático. El flujo clave: al hacer clic en el correlation ID del reporte, se abre **encima** el drawer de trazabilidad buscando por ese ID. Si lo encuentra, muestra el error con breadcrumbs, stack trace y timeline. Si no, muestra empty-state con explicación ("no hay error asociado — puede ser UX puro, puede haber sido purgado, etc").

Esto cierra el loop: admin ve reporte → clic en correlation ID → ve error técnico con contexto completo → decide acción → cambia estado del reporte. Todo sin perder el contexto del reporte inicial.

---

## Anti-patrones

| Anti-patrón | Por qué es malo | Solución |
|-------------|-----------------|----------|
| Reportar 100% de errores sin dedup | Satura rate limit, oculta patrones | Dedup por `(status, url)` en ventana de 5s |
| Solo trazar 500s en backend | Pierdes 400s que pueden ser bugs del frontend | Trazar ≥400 excepto 401/403 |
| Reporte síncrono que bloquea | Un error en reporte rompe la UX | Fire-and-forget con outbox |
| Autenticación obligatoria en el reporter | Pierdes errores pre-login | `AllowAnonymous` con rate limit por IP |
| Stack trace crudo del browser en producción | Útil solo en dev (minificado en prod) | Parser que extrae funciones legibles |
| Sin retención | Tabla crece sin límite, datos personales se acumulan | Purga automática a 7 días |
| Reportar errores del propio reporter | Loop infinito | Guard explícito por URL del endpoint |
| **Asumir que el canal automático basta** | Pierdes problemas de UX, datos incoherentes, propuestas de mejora — clases enteras de bugs | Canal manual complementario donde el usuario describe lo que vivió |
| **429 en el reporter activa cooldown global del cliente** | Un bug en el reporter → toda la intranet se bloquea → el usuario intenta reportarlo → loop | Exención explícita: endpoints del reporter no pasan por el throttling global, 429 se maneja inline |
| **Retry automático en background de reportes manuales** | El usuario no ve el error al submit; cree que funcionó; horas después el backend lo procesa o falla silencioso | `server-confirmed`: enviar, esperar respuesta, mostrar resultado. Si falla, el usuario decide |
| **Usar el requestId del POST del reporte como correlationId** | El reporte queda correlacionado consigo mismo en vez del error que el usuario quería reportar | El interceptor del trace EXCLUYE la URL del reporter de su ring buffer de correlation IDs |
| **Retener reportes manuales como errores automáticos (7 días)** | Se pierden propuestas de mejora y memoria de fixes entregados | Retención diferenciada por estado: `RESUELTO` indefinido, resto 90-180 días |
| **Purgar reportes resueltos** | Se pierde la memoria institucional ("¿qué se había reportado sobre X?") | Excluir `estado = RESUELTO` de la purga |

---

## Checklist de implementación

```
TRACKING
[ ] Ring buffer de breadcrumbs en memoria (30 entradas)
[ ] Fuentes: router, HTTP, auth, mutaciones de datos
[ ] Sin tokens, sin body, sin PII en breadcrumbs
[ ] Ring buffer de últimos request IDs (5 entradas) — para correlación con canal manual
[ ] Ring buffer de errores VISIBLES (5 entradas con timestamp) — priorizar sobre request IDs genéricos

CAPTURA (canal automático)
[ ] Handler global de errores JS no capturados
[ ] Interceptor HTTP para errores 4xx/5xx
[ ] Middleware servidor para excepciones no manejadas
[ ] Detección de requests lentas (>threshold)
[ ] Clasificación de origen multi-señal

CAPTURA (canal manual)
[ ] UI accesible: atajo de teclado global + botón flotante persistente
[ ] Catálogo de tipos agrupado por concepto del usuario (no por módulo técnico)
[ ] Descripción obligatoria con mínimo de caracteres para forzar detalle
[ ] Propuesta de mejora opcional
[ ] Hint automático "enlazar con error reciente" cuando el usuario vio un toast <2 min antes
[ ] Idempotencia: key por apertura del dialog, regenerada al cerrar/reabrir
[ ] Máquina de estados del reporte: NUEVO → REVISADO → EN_PROGRESO → RESUELTO/DESCARTADO

REPORTE
[ ] Endpoint AllowAnonymous con rate limit
[ ] Dedup por (status, url) en ventana de 5s (solo canal automático)
[ ] Outbox local (IndexedDB o similar) para offline (solo canal automático)
[ ] Flush al volver online + flush periódico (30s)
[ ] Guard anti-loop (el reporter no se reporta a sí mismo)
[ ] Reportes manuales con consistencia server-confirmed (sin retry en background)
[ ] Endpoints del reporter EXENTOS del throttling global del cliente
[ ] 429 en reporter manejado localmente con mensaje inline + retry-after

PERSISTENCIA
[ ] Tabla padre (error) + tabla hija (breadcrumbs) para canal automático
[ ] Tabla separada para reportes manuales (no comparte schema)
[ ] Cascade delete en breadcrumbs
[ ] Índices: fecha DESC, correlation ID, origen+severidad, estado (manual)
[ ] Source location separado del stack trace
[ ] Job de purga automático para errores automáticos (>7 días)
[ ] Job de purga automático para reportes manuales (>180 días) EXCLUYENDO estado=RESUELTO

PRIVACIDAD
[ ] DNI/identificadores enmascarados
[ ] Strings truncados (mensaje 500, stack 4000, descripción manual 2000)
[ ] Sin tokens en logs ni en BD
[ ] DNI crudo NUNCA en DTOs del frontend — solo enmascarado

VISTA
[ ] Acceso solo para rol más alto
[ ] Canal automático: filtros por origen, severidad, fecha, usuario
[ ] Canal manual: filtros por tipo, estado, fecha
[ ] Drawer de detalle reutilizable (búsqueda por id directo o por correlationId)
[ ] Correlation ID clicable en el reporte manual → abre drawer de trazabilidad con el error asociado
[ ] Empty state amigable cuando el correlation ID no matchea ningún error automático
```

---

## Métricas de éxito

Un sistema de trazabilidad está bien implementado cuando:

1. **Un error de producción se diagnostica en <5 minutos** sin necesitar logs adicionales
2. **El usuario nunca se entera** de que hay un sistema de trazabilidad (canal automático invisible)
3. **La tabla no crece** más de N GB (con purga diferenciada por tipo)
4. **Los errores en cascada se agrupan**: un bug = un registro, no 20
5. **Los errores de red se detectan** incluso cuando service workers sirven cache
6. **Los errores pre-login se capturan** (los más críticos)
7. **El correlation ID permite cruzar** logs de frontend y backend en segundos
8. **Los reportes manuales con error visible reciente aciertan el match** en >60% de los casos gracias al ring buffer de errores visibles
9. **Un 429 en el reporter nunca degrada la app principal** — ningún usuario ve una pantalla de "rate limit" por haber intentado reportar un bug
10. **El canal manual captura clases de problemas que el automático pierde**: UX confusa, datos incoherentes, propuestas de mejora. Ratio saludable: ~1 reporte manual por cada 10-20 errores automáticos
11. **Los reportes resueltos siguen consultables** meses después como memoria institucional ("¿qué se había reportado sobre X?")
