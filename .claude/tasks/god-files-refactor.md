# God Files — Plan de Refactorización

**Fecha auditoría:** 2026-02-20
**Criterio:** Violación de Single Responsibility Principle (por mezcla de responsabilidades, no por cantidad de líneas)
**Estado:** Pendiente

---

## Resumen

| Severidad | Count | Descripción |
|-----------|-------|-------------|
| SEVERO | 8 | Mezclan dominios fundamentalmente distintos |
| LEVE | 9 | Una o dos responsabilidades extra filtradas |
| **Total** | **17** | |

### Patrones transversales (duplicación entre archivos)

| Patrón duplicado | Archivos afectados | Solución |
|------------------|--------------------|----------|
| Clasificación de nivel educativo por nombre de grado | `horarios.store.ts`, `cursos.store.ts` | Extraer a utility puro en `@core/helpers/` o `@shared/services/` |
| Algoritmo de auto-generación de contraseña | `usuarios.store.ts`, `usuario-form-dialog.component.ts` | Extraer a utility puro |
| Manipulación DOM para descarga de PDF (crear `<a>`, `createObjectURL`, click, remove) | `attendance-view.service.ts`, `attendance-director.component.ts` | Extraer a helper reutilizable en `@core/helpers/` |
| Stores haciendo validación de formularios y lógica de negocio | `horarios.store.ts`, `usuarios.store.ts`, `cursos.store.ts` | Mover validación a facades o validators dedicados |

---

## SEVEROS (8 archivos)

### 1. `src/app/core/services/storage/session-storage.service.ts`

**Responsabilidades mezcladas (10 concerns):**

1. Routing de auth tokens dual-storage (sessionStorage vs localStorage según `rememberMe`)
2. Almacenamiento de objeto usuario con misma lógica dual-storage
3. Algoritmo de generación de session keys (sanitiza nombre + rol, quita acentos Unicode)
4. Limpieza de sesiones previas (`cleanPreviousUserSessions`)
5. Gestión de remember tokens
6. Descubrimiento de todos los tokens persistidos (`getAllPersistentTokens`)
7. Storage de permisos con dual-storage
8. **Estado UI de modales de horarios** (`getScheduleModalsState`, `setScheduleModalsState`)
9. **Timestamp de última verificación de notificaciones**
10. **Estado de última ruta**

**Propuesta de split:**
- `SessionAuthStorageService` — tokens, usuario, remember, limpieza de sesiones
- `SessionPermisosStorageService` — permisos con dual-storage
- Mover estado de modales de horarios al store de horarios
- Mover timestamp de notificaciones al servicio de notificaciones
- Mover última ruta a un servicio de navegación o preferencias

**Estado:** [ ] Pendiente

---

### 2. `src/app/core/services/auth/auth.service.ts`

**Responsabilidades mezcladas:**

1. HTTP auth calls (`login()`, `logout()`)
2. Estado reactivo (3 BehaviorSubjects: `isAuthenticated$`, `currentUser$`, `loginAttempts$`)
3. Lectura/escritura directa a storage
4. Rate-limiting de login (conteo de intentos, threshold `MAX_LOGIN_ATTEMPTS`)
5. Side effects en constructor

**Propuesta de split:**
- `AuthApiService` (Gateway) — solo HTTP calls
- `AuthStore` ya existe — mover estado reactivo allí completamente
- Rate-limiting → helper puro o parte del store

**Estado:** [ ] Pendiente

---

### 3. `src/app/features/intranet/pages/admin/horarios/services/horarios.store.ts`

**Responsabilidades mezcladas:**

1. Estado signals (el rol correcto del store)
2. **Detección de conflictos de horario** (`hasConflicto()`) — math de rangos temporales
3. **Cálculo de posición/duración temporal** (`calcularPosicionVertical()`, `calcularDuracionMinutos()`)
4. **Clasificación de nivel educativo** (`detectarNivelFromGrado()`) — duplicada con `cursos.store.ts`
5. **Validación completa de formulario** (`validarFormulario()`) — regex, orden temporal, conflictos
6. **Ensamblaje de bloques semanales** (`buildWeeklyBlocks()`) — color assignment

**Propuesta de split:**
- Mantener solo estado + computed en el store
- `HorariosValidatorService` o métodos en facade — validación de formulario
- `HorariosCalculatorHelper` — cálculos de posición, duración, conflictos
- `NivelEducativoUtil` — clasificación de nivel (compartido con cursos)
- Mover `buildWeeklyBlocks()` al facade o a un helper de presentación

**Estado:** [ ] Pendiente

---

### 4. `src/app/features/intranet/pages/admin/usuarios/usuarios.store.ts`

**Responsabilidades mezcladas:**

1. Estado signals (el rol correcto)
2. **Algoritmo de auto-generación de contraseñas** — duplicado con `usuario-form-dialog.component.ts`
3. **Validación regex de formulario** — email, teléfono, DNI, campos requeridos por rol
4. **Limpieza condicional de campos por rol** (`handleRolChange()`)

**Propuesta de split:**
- Mantener solo estado + computed en el store
- `PasswordGeneratorUtil` — helper puro compartido
- Mover validación al facade o a un validator dedicado
- Mover `handleRolChange()` al facade

**Estado:** [ ] Pendiente

---

### 5. `src/app/features/intranet/pages/admin/usuarios/usuarios.facade.ts`

**Responsabilidades mezcladas:**

1. CRUD orchestration (el rol correcto)
2. **Inyección cross-domain** — `AsistenciaService` para popular dropdowns de salones (dominio de asistencia, no de usuarios)
3. **Wiring de cache del SW** — `setupCacheRefresh()` suscrito a `SwService.cacheUpdated$`

**Propuesta de fix:**
- Crear `SalonesApiService` o similar para desacoplar del dominio de asistencia
- Mover cache refresh a un interceptor o servicio de infraestructura

**Estado:** [ ] Pendiente

---

### 6. `src/app/core/services/notifications/notifications.service.ts`

**Responsabilidades mezcladas:**

1. Estado reactivo (10+ signals)
2. Persistencia en IndexedDB
3. Escucha de mensajes del Service Worker
4. Manejo de audio (HTMLAudioElement para sonido de notificación)
5. Browser Notification API (permisos + `new Notification()`)
6. Timers RxJS para refresh periódico
7. Reglas de negocio (prioridad, reset diario, conteo de no leídos)

**Propuesta de split:**
- `NotificationsStore` — solo estado reactivo (signals)
- `NotificationsFacade` — orquestación
- `NotificationsStorageService` — persistencia IDB
- `NotificationsSoundService` — audio feedback
- `BrowserNotificationService` — permisos + Notification API
- Reglas de negocio en el facade o helpers puros

**Estado:** [ ] Pendiente

---

### 7. `src/app/core/services/permisos/user-permisos.service.ts`

**Responsabilidades mezcladas:**

1. Estado reactivo (signals)
2. Storage read/write
3. **Decodificación manual de JWT** (`atob(token.split('.')[1])`)
4. **Polling periódico** con RxJS timer + cancel Subject
5. Lógica de autorización (`tienePermiso(ruta)`)
6. Coordinación de carga async

**Propuesta de split:**
- `PermisosStore` — estado reactivo
- `PermisosFacade` — orquestación, polling, coordinación
- `JwtDecoderUtil` — helper puro para decodificar JWT
- Mantener `tienePermiso()` como método público del store o facade

**Estado:** [ ] Pendiente

---

### 8. `src/app/core/services/speech/voice-recognition.service.ts`

**Responsabilidades mezcladas:**

1. SpeechRecognition API management
2. Audio feedback (2 HTMLAudioElements)
3. **Parsing de comandos** — regex matching de transcript
4. **Navegación con Router** — `router.navigate()` directo
5. **Scroll DOM** — `window.scrollBy()`, `window.scrollTo()`
6. **Registro de modales** — mapa de funciones open/close
7. Tracking de input activo
8. Pub/sub de comandos (Subject interno)

**Propuesta de split:**
- `SpeechRecognitionService` — solo API del navegador + lifecycle
- `VoiceCommandParserService` — parsing de intención desde transcript
- `VoiceCommandExecutorService` — ejecuta comandos (navegación, scroll, modales)
- `VoiceAudioFeedbackService` — sonidos de activación/desactivación

**Estado:** [ ] Pendiente

---

## LEVES (9 archivos)

### 9. `src/app/core/services/storage/indexed-db.service.ts`

**Problema:** Dos dominios no relacionados en una clase: storage de notificaciones (domain-specific) + cache genérico key-value con TTL.

**Fix:** Separar en `NotificationStorageService` + `CacheStorageService`, o al menos interfaces distintas.

**Estado:** [ ] Pendiente

---

### 10. `src/app/core/store/auth/auth.store.ts`

**Problema:** NgRx store haciendo I/O de storage dentro de `withMethods` (`storageService.setToken()`, `setUser()`, `clearAuth()`).

**Fix:** Mover I/O al facade o coordinator. El store solo debería mutar estado en memoria.

**Estado:** [ ] Pendiente

---

### 11. `src/app/features/intranet/pages/admin/permisos-roles/services/permisos-roles.store.ts`

**Problema:** Contiene `buildModulosVistas()` que parsea rutas, agrupa vistas por módulo y produce un view-model. Es transformación de presentación, no estado.

**Fix:** Mover a facade o utility puro.

**Estado:** [ ] Pendiente

---

### 12. `src/app/features/intranet/pages/admin/cursos/services/cursos.store.ts`

**Problema:** Clasificación de nivel educativo por nombre de grado embebida en `addGrado()` y `removeGrado()`. Duplicada con `horarios.store.ts`.

**Fix:** Extraer a `NivelEducativoUtil` compartido.

**Estado:** [ ] Pendiente

---

### 13. `src/app/core/services/error/error-handler.service.ts`

**Problema:** Navegación a `/intranet/login` en 401. Eso pertenece al interceptor HTTP, no al error handler.

**Fix:** Mover redirect 401 al `errorInterceptor`.

**Estado:** [ ] Pendiente

---

### 14. `src/app/features/intranet/services/attendance/attendance-view.service.ts`

**Problema:** Manipulación DOM para descarga de PDF (crear `<a>`, `createObjectURL`, click, remove) embebida junto con estado + HTTP.

**Fix:** Extraer descarga de PDF a `FileDownloadHelper` reutilizable.

**Estado:** [ ] Pendiente

---

### 15. `src/app/features/intranet/pages/attendance-component/attendance-director/attendance-director.component.ts`

**Problema:** Duplica patrón de descarga PDF con DOM + cálculo de fechas + HTTP directo + filtrado de negocio para verano.

**Fix:** Usar `FileDownloadHelper` compartido. Mover lógica de negocio al service/facade.

**Estado:** [ ] Pendiente

---

### 16. `src/app/features/intranet/pages/admin/permisos-usuarios/permisos-usuarios.component.ts`

**Problema:** Bypasea su facade con llamadas HTTP directas a `PermisosService` para autocomplete (`loadVistasFromRol`, `buscarUsuarios`).

**Fix:** Mover esas llamadas HTTP al facade.

**Estado:** [ ] Pendiente

---

### 17. `src/app/features/intranet/pages/admin/usuarios/components/usuario-form-dialog/usuario-form-dialog.component.ts`

**Problema:** Componente presentacional con algoritmo de password duplicado + 5 computed de validación de dominio + mini state machine de selector de salón.

**Fix:** Usar `PasswordGeneratorUtil` compartido. Evaluar si validaciones van en el store o en un validator. Evaluar si el selector de salón merece ser un sub-componente.

**Estado:** [ ] Pendiente

---

## Priorización sugerida

### Ola 1 — Quick wins (extraer utilities compartidos)
- [ ] `NivelEducativoUtil` — desduplicar de horarios.store y cursos.store
- [ ] `PasswordGeneratorUtil` — desduplicar de usuarios.store y usuario-form-dialog
- [ ] `FileDownloadHelper` — desduplicar de attendance-view.service y attendance-director
- [ ] Mover redirect 401 de error-handler al interceptor

### Ola 2 — Stores limpios (sacar lógica que no es estado)
- [ ] `horarios.store.ts` — extraer validación, cálculos, bloques semanales
- [ ] `usuarios.store.ts` — extraer validación, password gen, handleRolChange
- [ ] `cursos.store.ts` — extraer clasificación de nivel
- [ ] `permisos-roles.store.ts` — extraer buildModulosVistas
- [ ] `auth.store.ts` — sacar I/O de storage

### Ola 3 — Services core (splits mayores)
- [ ] `session-storage.service.ts` — split en 2-3 servicios
- [ ] `auth.service.ts` — separar API vs estado
- [ ] `user-permisos.service.ts` — separar store/facade/JWT
- [ ] `notifications.service.ts` — split en 4-5 servicios
- [ ] `error-handler.service.ts` — limpiar navegación

### Ola 4 — Features complejos
- [ ] `voice-recognition.service.ts` — split en 3-4 servicios
- [ ] `attendance-view.service.ts` — extraer PDF
- [ ] `attendance-director.component.ts` — delegar a service
- [ ] `permisos-usuarios.component.ts` — mover HTTP al facade
- [ ] `usuario-form-dialog.component.ts` — limpiar presentacional
- [ ] `usuarios.facade.ts` — desacoplar cross-domain + cache
